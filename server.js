const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ensureCsrfToken } = require('./src/utils/csrf');

const { initDb } = require('./src/models/db');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Bezpečnostní varování – pokud není nastaven SESSION_SECRET
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SESSION_SECRET musí být nastaven v produkčním prostředí!');
    process.exit(1);
  }
  console.warn('⚠️  SESSION_SECRET není nastaven. Používám nebezpečný výchozí klíč. NASTAVTE SESSION_SECRET v prostředí pro produkci!');
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Vynucení HTTPS v produkci
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.protocol !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Bezpečnostní hlavičky navíc (CORS, MIME, Referrer)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  next();
});

// Produkční zabezpečení a limity
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "images.unsplash.com"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://maps.googleapis.com", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      "style-src": ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "'unsafe-inline'"],
      "frame-src": ["'self'", "https://www.google.com"],
    },
  },
}));

// Přísný rate limiter na login – max 5 pokusů / 15 minut na IP (ochrana proti brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).render('admin/login', {
      title: 'Přihlášení do administrace',
      error: 'Příliš mnoho pokusů o přihlášení. Zkuste to prosím za 15 minut.',
      setupMode: false
    });
  },
});

app.post('/admin/login', loginLimiter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Servírování nahraných souborů z perzistentního úložiště
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'data') }),
    secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('SESSION_SECRET must be set in production'); })() : 'dev-secret-do-not-use-in-production'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(ensureCsrfToken); // CSRF token dostupný ve všech šablonách – MUSÍ být až PO session middleware

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
