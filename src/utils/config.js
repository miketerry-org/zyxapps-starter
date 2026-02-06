// src/utils/config.js

import fs from "fs";
import path from "path";
import ini from "ini";
import Joi from "joi";
import { fileURLToPath } from "url";
import log from "./log.js";

// -----------------------------------------------------------------------------
// Resolve project root (independent of process.cwd())
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// config.js lives in: src/utils/
// project root is: ../../
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const CONFIG_DIR = path.join(PROJECT_ROOT, "config");

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

let loaded = false;
let resolvedConfig = null;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function loadIniFile(filename, { required = false } = {}) {
  const fullPath = path.join(CONFIG_DIR, filename);

  if (!fs.existsSync(fullPath)) {
    const message = `Config file missing: ${fullPath}`;

    if (required) {
      throw new Error(message);
    }

    log.warn(message);
    return {};
  }

  const parsed = ini.parse(fs.readFileSync(fullPath, "utf-8"));
  log.info(`Loaded config file: ${fullPath}`);
  return parsed;
}

function mergeDeep(target, ...sources) {
  for (const source of sources) {
    for (const key in source) {
      const value = source[key];

      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] ??= {};
        mergeDeep(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function validate(raw) {
  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid("production", "development", "staging", "testing")
      .required(),

    http: Joi.object({
      port: Joi.number().integer().min(1).max(65535).required(),
      bodyLimit: Joi.string()
        .pattern(/^\d+(b|kb|mb)$/i)
        .required(),
    }).required(),

    rateLimit: Joi.object({
      minutes: Joi.number().integer().min(1).required(),
      requests: Joi.number().integer().min(1).required(),
    }).required(),

    session: Joi.object({
      secret: Joi.string().min(32).required(),
    }).required(),

    paths: Joi.object({
      static: Joi.string().required(),
      views: Joi.string().required(),
      viewsLayouts: Joi.string().required(),
      viewsPartials: Joi.string().required(),
      emails: Joi.string().required(),
      defaultLayout: Joi.string().required(),
    }).required(),

    valkey: Joi.object({
      url: Joi.string().uri().required(),
    }).required(),
  }).unknown(true);

  const { error, value } = schema.validate(raw, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error(
      `Invalid configuration:\n${error.details
        .map(d => `- ${d.message}`)
        .join("\n")}`
    );
  }

  // Resolve and validate filesystem paths
  for (const key of Object.keys(value.paths)) {
    if (key === "defaultLayout") continue;

    const resolved = path.resolve(PROJECT_ROOT, value.paths[key]);

    if (!fs.existsSync(resolved)) {
      throw new Error(
        `Configured path does not exist: paths.${key} (${resolved})`
      );
    }

    value.paths[key] = resolved;
  }

  return Object.freeze({
    env: value.NODE_ENV,
    http: value.http,
    rateLimit: value.rateLimit,
    session: value.session,
    paths: value.paths,
    valkey: value.valkey,
  });
}

// -----------------------------------------------------------------------------
// Load + expose config
// -----------------------------------------------------------------------------

function load() {
  if (loaded) return;
  loaded = true;

  const runtime = process.env.NODE_ENV || "development";

  const common = loadIniFile("common.ini", { required: true });
  const envSpecific = loadIniFile(`${runtime}.ini`, {
    required: runtime === "production",
  });

  const merged = mergeDeep({}, common, envSpecific);
  resolvedConfig = validate(merged);

  // Promote resolved config onto public API
  Object.assign(api, resolvedConfig);

  log.info(`Configuration loaded (${runtime})`);
}

// -----------------------------------------------------------------------------
// Public API (gold standard)
// -----------------------------------------------------------------------------

const api = {
  load,

  isDevelopment() {
    return api.env === "development";
  },
  isProduction() {
    return api.env === "production";
  },
  isStaging() {
    return api.env === "staging";
  },
  isTesting() {
    return api.env === "testing";
  },
};

export default api;
