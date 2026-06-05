const path = require('path');
const express = require('express');
const multer = require('multer');
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'uploads'),
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

router.get('/login', asyncHandler(adminController.loginPage));
router.post('/login', asyncHandler(adminController.login));
router.post('/logout', requireAuth, adminController.logout);

router.get('/', requireAuth, asyncHandler(adminController.dashboard));
router.get('/web', requireAuth, asyncHandler(adminController.webSettings));
router.post('/web', requireAuth, uploadSiteAsset.any(), asyncHandler(adminController.updateWebSettings));
router.get('/account', requireAuth, asyncHandler(adminController.account));
router.post('/account', requireAuth, asyncHandler(adminController.updateAccount));
router.get('/properties', requireAuth, asyncHandler(adminController.listProperties));
router.get('/properties/new', requireAuth, asyncHandler(adminController.newProperty));
router.post('/properties', requireAuth, upload.array('images', 8), asyncHandler(adminController.createProperty));
router.get('/properties/:id/edit', requireAuth, asyncHandler(adminController.editProperty));
router.post('/properties/:id', requireAuth, upload.array('images', 8), asyncHandler(adminController.updateProperty));
router.post('/properties/:id/delete', requireAuth, asyncHandler(adminController.deleteProperty));

router.get('/inquiries', requireAuth, asyncHandler(adminController.inquiries));
router.post('/inquiries/:id/toggle', requireAuth, asyncHandler(adminController.toggleInquiry));
router.post('/inquiries/:id/delete', requireAuth, asyncHandler(adminController.deleteInquiry));

router.get('/contacts', requireAuth, asyncHandler(adminController.contacts));
router.post('/contacts', requireAuth, upload.any(), asyncHandler(adminController.updateContacts));
router.post('/contacts/agents/:id/delete', requireAuth, asyncHandler(adminController.deleteAgent));

module.exports = router;
