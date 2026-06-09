const express = require('express');
const publicController = require('../controllers/publicController');
const asyncHandler = require('../utils/asyncHandler');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter na kontaktní formulář – max 5 odeslání / 15 minut na IP
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Příliš mnoho požadavků. Zkuste to prosím za 15 minut.',
});

router.get('/', publicController.home);
router.get('/nemovitost/:slug', publicController.propertyDetail);
router.get('/kontakt', publicController.contactPage);
router.get('/ochrana-osobnich-udaju', publicController.privacyPolicyPage);

// Odeslání kontaktního formuláře s rate limiterem a validací
router.post('/kontakt', contactLimiter, asyncHandler(publicController.submitInquiry));

module.exports = router;
