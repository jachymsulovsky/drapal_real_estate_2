const crypto = require('crypto');
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ensureCsrfToken } = require('./src/utils/csrf');

const { initDb, all } = require('./src/models/db');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Bezpečnostní varování – pokud není nastaven SESSION_SECRET
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SESSION_SECRET musí být nastaven v produkčním prostředí!');
    process.exit(1);
  }
  console.warn('⚠️  SESSION_SECRET není nastaven. Generuji náhodný klíč pro tuto relaci. NASTAVTE SESSION_SECRET v prostředí pro produkci!');
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

// Bezpečnostní hlavičky (HSTS, X-Frame-Options, MIME, Referrer, Permissions)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

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
//
// ============================================================
// STATICKÉ SOUBORY — S cache hlavičkami pro rychlejší načítání
// ============================================================
// maxAge říká prohlížeči, jak dlouho má soubor uchovávat v cache.
// 7 dní = 604800 sekund. Při změně souboru stačí změnit název
// (např. styles.css → styles.v2.css), nebo použít query string.
// ============================================================
//
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '7 days' : 0,
  setHeaders(res, filePath) {
    // HTML soubory nemají cache (musí být vždy čerstvé)
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    // JS a CSS cacheujeme na 7 dní
    if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
    // Obrázky cacheujeme na 30 dní
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.webp') || filePath.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));
// Servírování nahraných souborů z perzistentního úložiště
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads'), staticOptions));

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: path.join(__dirname, 'data') }),
    secret: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET must be set in production');
      }
      return crypto.randomBytes(32).toString('hex');
    })(),
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

//
// ============================================================
// SITEMAP — Dynamická XML mapa stránek pro vyhledávače
// ============================================================
// Sitemap říká Google, Bing a dalším vyhledávačům, jaké stránky
// máme k dispozici. Automaticky obsahuje všechny nemovitosti
// z databáze + hlavní statické stránky.
// ============================================================
//
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Načteme všechny nemovitosti (potřebujeme slug a timestamp)
    const properties = await all('SELECT slug, updated_at FROM properties ORDER BY updated_at DESC');

    // Statické stránky, které chceme v sitemapě
    const staticPages = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/kontakt', changefreq: 'monthly', priority: '0.8' },
      { loc: '/ochrana-osobnich-udaju', changefreq: 'monthly', priority: '0.5' },
    ];

    const baseUrl = 'https://www.drapalrealestate.cz';

    // Sestavíme XML — používáme řetězce (žádná šablona, je to jednoduché)
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    // Statické stránky
    for (const page of staticPages) {
      xml += `<url><loc>${baseUrl}${page.loc}</loc><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`;
    }

    // Dynamické stránky nemovitostí
    for (const prop of properties) {
      const lastmod = prop.updated_at || prop.created_at;
      xml += `<url><loc>${baseUrl}/nemovitost/${prop.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
    }

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Chyba při generování sitemapy:', err);
    res.status(500).send('Internal Server Error');
  }
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
