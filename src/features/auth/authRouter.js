// src/features/auth/authRouter.js:

import express from "express";
import { getLoginForm, getRegisterForm } from "./authController.js";

// Create a router instance
const authRouter = express.Router();

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

// login form
authRouter.get("/login", getLoginForm);

// register form
authRouter.get("/register", getRegisterForm);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
export default authRouter;
