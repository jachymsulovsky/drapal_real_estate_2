const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const { initDb } = require('./src/models/db');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'data') }),
    secret: process.env.SESSION_SECRET || 'change-this-secret-before-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = Boolean(req.session.user);
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

app.use((error, req, res, next) => {
  console.error(error);

  if (req.path.startsWith('/admin')) {
    req.session.flash = {
      type: 'error',
      message: error.message || 'Nastala chyba při ukládání. Zkuste to prosím znovu.'
    };
    return res.redirect(req.get('Referrer') || '/admin');
  }

  return res.status(500).render('500', {
    title: 'Chyba serveru',
    error: process.env.NODE_ENV === 'development' ? error.message : null
  });
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Stránka nenalezena' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Drápal Real Estate běží na http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Nepodařilo se inicializovat databázi:', error);
    process.exit(1);
  });
