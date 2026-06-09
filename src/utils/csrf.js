const crypto = require('crypto');

/**
 * Middleware that ensures a CSRF token exists in the session
 * and makes it available to templates via res.locals.csrfToken.
 */
function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

/**
 * Middleware that validates the CSRF token from the request body
 * against the token stored in the session.
 */
function validateCsrf(req, res, next) {
  const token = req.body._csrf;
  if (!token || token !== req.session.csrfToken) {
    req.session.flash = {
      type: 'error',
      message: 'Neplatný bezpečnostní token. Zkuste to znovu.',
    };
    return res.redirect(req.get('Referrer') || '/admin');
  }
  next();
}

module.exports = { ensureCsrfToken, validateCsrf };
