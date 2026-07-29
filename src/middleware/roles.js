/**
 * ============================================================
 * ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * ============================================================
 * Systém oprávnění pro admina a makléře.
 * ============================================================
 */

/**
 * Vrátí roli uživatele z session
 * @param {Object} req - Express request
 * @returns {string} - 'admin', 'agent', nebo null
 */
function getUserRole(req) {
  if (!req.session.user) return null;
  return req.session.user.role || 'admin';
}

/**
 * Vrátí agent_id uživatele z session
 * @param {Object} req - Express request
 * @returns {number|null} - ID agenta nebo null
 */
function getAgentId(req) {
  if (!req.session.user) return null;
  return req.session.user.agent_id || null;
}

/**
 * Ověří, zda uživatel má požadovanou roli
 * @param {string|string[]} allowedRoles - Povolené role (jedna nebo více)
 * @returns {Function} - Express middleware
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    const userRole = getUserRole(req);

    if (!userRole) {
      req.session.flash = { type: 'error', message: 'Nejdříve se přihlaste.' };
      return res.redirect('/admin/login');
    }

    if (!roles.includes(userRole)) {
      req.session.flash = { type: 'error', message: 'Nemáte oprávnění k této akci.' };
      return res.redirect('/admin');
    }

    next();
  };
}

/**
 * Ověří, že uživatel je admin
 * @returns {Function} - Express middleware
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Ověří, že uživatel je agent
 * @returns {Function} - Express middleware
 */
function requireAgent(req, res, next) {
  return requireRole('agent')(req, res, next);
}

/**
 * Ověří vlastnictví nemovitosti
 * Agent může editovat/smazat pouze své nemovitosti
 * Admin může editovat/smazat všechny
 * @param {Function} getPropertyId - Funkce, která vrátí ID nemovitosti z req
 * @returns {Function} - Express middleware
 */
function requireOwnership(getPropertyId) {
  return async (req, res, next) => {
    const userRole = getUserRole(req);
    const agentId = getAgentId(req);

    // Admin má přístup ke všem
    if (userRole === 'admin') {
      return next();
    }

    // Agent musí být přiřazen k nemovitosti
    if (userRole === 'agent' && agentId) {
      const propertyId = getPropertyId(req);
      const property = await require('../models/db').get(
        'SELECT agent_id FROM properties WHERE id = ?',
        [propertyId]
      );

      if (property && property.agent_id === agentId) {
        return next();
      }
    }

    req.session.flash = { type: 'error', message: 'Nemáte oprávnění k této akci.' };
    return res.redirect('/agent/dashboard');
  };
}

/**
 * Ověří, že uživatel může přistupovat k agentovským funkcím
 * (admin nebo agent)
 * @returns {Function} - Express middleware
 */
function requireAgentOrAdmin(req, res, next) {
  const userRole = getUserRole(req);

  if (!userRole) {
    req.session.flash = { type: 'error', message: 'Nejdříve se přihlaste.' };
    return res.redirect('/admin/login');
  }

  if (!['admin', 'agent'].includes(userRole)) {
    req.session.flash = { type: 'error', message: 'Nemáte oprávnění k této akci.' };
    return res.redirect('/admin');
  }

  next();
}

module.exports = {
  getUserRole,
  getAgentId,
  requireRole,
  requireAdmin,
  requireAgent,
  requireOwnership,
  requireAgentOrAdmin
};