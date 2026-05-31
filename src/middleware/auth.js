function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'error', message: 'Nejdříve se přihlaste do administrace.' };
    return res.redirect('/admin/login');
  }

  return next();
}

module.exports = { requireAuth };
