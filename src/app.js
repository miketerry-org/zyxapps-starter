// src/app.js

import express from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { engine as handlebars } from "express-handlebars";
import { RedisStore } from "connect-redis";

// iovalkey is CommonJS
import ValkeyPkg from "iovalkey";

import config from "./utils/config.js";
import log from "./utils/log.js";

// Import all routers
import navRouter from "./features/nav/navRouter.js";
import authRouter from "./features/auth/authRouter.js";

// -----------------------------------------------------------------------------
// Load and validate configuration
// -----------------------------------------------------------------------------

config.load();

// -----------------------------------------------------------------------------
// Valkey client (auto-connects)
// -----------------------------------------------------------------------------

const { createClient } = ValkeyPkg;

const valkeyClient = createClient({
  url: config.valkey.url,
});

valkeyClient.on("error", err => {
  log.error("Valkey connection error", err);
});

// NOTE:
// Do NOT call valkeyClient.connect()
// iovalkey connects automatically on instantiation

// -----------------------------------------------------------------------------
// Express application
// -----------------------------------------------------------------------------

const app = express();

// Trust proxy headers (important behind reverse proxies)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// HTTP request logging
app.use(morgan(config.isProduction() ? "combined" : "dev"));

// -----------------------------------------------------------------------------
// Rate limiting
// -----------------------------------------------------------------------------

app.use(
  rateLimit({
    windowMs: config.rateLimit.minutes * 60 * 1000,
    max: config.rateLimit.requests,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// -----------------------------------------------------------------------------
// Body parsing
// -----------------------------------------------------------------------------

app.use(express.json({ limit: config.http.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.http.bodyLimit }));

// -----------------------------------------------------------------------------
// Session handling (Valkey-backed)
// -----------------------------------------------------------------------------

app.use(
  session({
    name: "app.sid",
    store: new RedisStore({
      client: valkeyClient,
      prefix: "sess:",
    }),
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction(),
      sameSite: "lax",
    },
  })
);

// -----------------------------------------------------------------------------
// Static assets
// -----------------------------------------------------------------------------

app.use(express.static(config.paths.static));

// -----------------------------------------------------------------------------
// Handlebars view engine
// -----------------------------------------------------------------------------

app.engine(
  "hbs",
  handlebars({
    extname: ".hbs",
    defaultLayout: config.paths.defaultLayout,
    layoutsDir: config.paths.viewsLayouts,
    partialsDir: config.paths.viewsPartials,
  })
);

app.set("view engine", "hbs");
app.set("views", config.paths.views);

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: config.env,
  });
});

// Mount the navRouter at root
app.use("/", navRouter);
app.use("/auth", authRouter);

// -----------------------------------------------------------------------------
// 404 handler
// -----------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).render("404", {
    title: "Not Found",
    url: req.originalUrl,
  });
});

// -----------------------------------------------------------------------------
// Error handler
// -----------------------------------------------------------------------------

app.use((err, req, res, next) => {
  log.error(err);

  res.status(500).render("500", {
    title: "Server Error",
    error: config.isProduction() ? "An unexpected error occurred" : err.message,
  });
});

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------

app.listen(config.http.port, () => {
  log.info(`Server listening on port ${config.http.port} (${config.env} mode)`);
});

export default app;
