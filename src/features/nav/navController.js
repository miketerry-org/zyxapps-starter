// navController.js:

export function getHomePage(req, res) {
  res.render("home");
}

export function getAboutPage(req, res) {
  res.send("about page");
}

export function getContactForm(req, res) {
  res.send("contact form");
}

export function getSupportForm(req, res) {
  res.send("support form");
}
