const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { validateCsrf } = require('../utils/csrf');
const { checkFileMagicBytes } = require('../utils/validators');
const asyncHandler = require('../utils/asyncHandler');

// Rate limiter na admin operace – max 100 POST/PUT/DELETE / hodinu na IP
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Příliš mnoho požadavků. Zkuste to prosím za hodinu.'
});

const rateLimited = [requireAuth, adminLimiter];

// CSRF ochrana pro POST požadavky bez nahrávání souborů
const csrfProtected = [...rateLimited, validateCsrf];
// Pro multipart routey musí být validateCsrf AŽ PO multeru (ten parsuje req.body)
const withUpload = (multerMiddleware) => [...rateLimited, multerMiddleware, validateCsrf];

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'data', 'uploads'),
  filename(req, file, callback) {
    const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    callback(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Nahrávat lze pouze obrázky.'));
    }
    return callback(null, true);
  }
});

const uploadSiteAsset = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const allowedDocuments = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (file.mimetype.startsWith('image/') || allowedDocuments.includes(file.mimetype)) {
      return callback(null, true);
    }

    return callback(new Error('Nahrávat lze pouze obrázky, PDF nebo Word dokumenty.'));
  }
});

// Validace magic bytes nahraných souborů
function validateUploadedFiles(req, res, next) {
  if (!req.files || !req.files.length) return next();

  for (const file of req.files) {
    try {
      const buffer = fs.readFileSync(file.path);
      const result = checkFileMagicBytes(buffer);
      if (!result.valid) {
        // Smazat nevalidní soubor
        try { fs.unlinkSync(file.path); } catch (_) { /* ignore */ }
        req.session.flash = { type: 'error', message: `Soubor "${file.originalname}" není platný obrázek nebo dokument.` };
        return res.redirect(req.get('Referrer') || '/admin');
      }
    } catch (_) {
      // Pokud soubor nelze přečíst, přeskočíme validaci
    }
  }

  next();
}

router.get('/login', asyncHandler(adminController.loginPage));
router.post('/login', asyncHandler(adminController.login));
router.post('/logout', ...csrfProtected, adminController.logout);

router.get('/', requireAuth, asyncHandler(adminController.dashboard));
router.get('/web', requireAuth, asyncHandler(adminController.webSettings));
router.post('/web', ...withUpload(uploadSiteAsset.any()), validateUploadedFiles, asyncHandler(adminController.updateWebSettings));
router.get('/account', requireAuth, asyncHandler(adminController.account));
router.post('/account', ...csrfProtected, asyncHandler(adminController.updateAccount));
router.get('/properties', requireAuth, asyncHandler(adminController.listProperties));
router.get('/properties/new', requireAuth, asyncHandler(adminController.newProperty));
router.post('/properties', ...withUpload(upload.array('images', 8)), validateUploadedFiles, asyncHandler(adminController.createProperty));
router.get('/properties/:id/edit', requireAuth, asyncHandler(adminController.editProperty));
router.post('/properties/:id', ...withUpload(upload.array('images', 8)), validateUploadedFiles, asyncHandler(adminController.updateProperty));
router.post('/properties/:id/delete', ...csrfProtected, asyncHandler(adminController.deleteProperty));

router.get('/inquiries', requireAuth, asyncHandler(adminController.inquiries));
router.post('/inquiries/:id/toggle', ...csrfProtected, asyncHandler(adminController.toggleInquiry));
router.post('/inquiries/:id/delete', ...csrfProtected, asyncHandler(adminController.deleteInquiry));

router.get('/contacts', requireAuth, asyncHandler(adminController.contacts));
router.post('/contacts', ...withUpload(upload.any()), validateUploadedFiles, asyncHandler(adminController.updateContacts));
router.post('/contacts/agents/:id/delete', ...csrfProtected, asyncHandler(adminController.deleteAgent));

module.exports = router;
