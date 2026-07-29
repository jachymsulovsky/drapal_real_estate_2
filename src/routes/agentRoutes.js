const express = require('express');
const agentController = require('../controllers/agentController');
const { requireAgent, requireOwnership, requireAgentOrAdmin } = require('../middleware/roles');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Všechny routes vyžadují přihlášení jako agent nebo admin
router.use(requireAuth);
router.use(requireAgentOrAdmin);

// Agent Dashboard
router.get('/dashboard', asyncHandler(agentController.dashboard));

// Profil agenta
router.get('/profile', asyncHandler(agentController.profile));
router.post('/profile', asyncHandler(agentController.updateProfile));

// Nemovitosti - pouze pro agenty (admin používá /admin/properties)
router.get('/properties', requireAgent, asyncHandler(agentController.listProperties));
router.get('/properties/new', requireAgent, asyncHandler(agentController.newProperty));
router.post('/properties', requireAgent, asyncHandler(agentController.createProperty));
router.get('/properties/:id/edit', requireAgent, asyncHandler(agentController.editProperty));
router.post('/properties/:id', requireAgent, requireOwnership((req) => req.params.id), asyncHandler(agentController.updateProperty));
router.post('/properties/:id/delete', requireAgent, requireOwnership((req) => req.params.id), asyncHandler(agentController.deleteProperty));

module.exports = router;