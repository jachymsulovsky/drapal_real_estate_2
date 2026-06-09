function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'error', message: 'Nejdříve se přihlaste do administrace.' };
    return res.redirect('/admin/login');
  }

  // Vynucená změna výchozího hesla – přesměrování do sekce účet
  // Používáme req.originalUrl, protože req.path je relativní k mount pointu routeru
  const currentUrl = req.originalUrl || req.url;
  if (req.session.mustChangePassword && !currentUrl.startsWith('/admin/account') && currentUrl !== '/admin/logout') {
    return res.redirect('/admin/account');
  }

  return next();
}

module.exports = { requireAuth };
