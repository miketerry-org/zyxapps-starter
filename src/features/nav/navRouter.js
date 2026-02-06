// src/features/nav/navRouter.js:

import express from "express";
import {
  getHomePage,
  getAboutPage,
  getContactForm,
  getSupportForm,
} from "./navController.js";

// Create a router instance
const navRouter = express.Router();

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

// Home page
navRouter.get("/", getHomePage);

// About page
navRouter.get("/about", getAboutPage);

// Contact form
navRouter.get("/contact", getContactForm);

// Support form
navRouter.get("/support", getSupportForm);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
export default navRouter;
