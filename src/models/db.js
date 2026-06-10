// ============================================================
// DATABÁZOVÝ MODUL — SQLite přes better-sqlite3
// ============================================================
// better-sqlite3 je náhrada za sqlite3, která:
// - JE SYNCHRONNÍ (žádné callbacky, žádné Promisy)
// - KOMPILUJE SE VŽDY ZE ZDROJE (žádné prebuilt binary)
//   → ŘEŠÍ chybu GLIBC_2.38 NOT FOUND na Renderu
// - JE RYCHLEJŠÍ (až 5× než callback-based sqlite3)
// ============================================================
// Používáme Promise wrapper, aby všechny stávající async/await
// volání v controllerech fungovaly beze změny.
// ============================================================

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'drapal.sqlite');

// Vytvoříme adresář pro data, pokud neexistuje
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ============================================================
// Otevření databáze (synchronní, žádný callback)
// ============================================================
const db = new Database(dbPath);

// Zapneme cizí klíče a striktní režim (WAL mód pro lepší výkon)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('strict = ON');

// ============================================================
// Promise-based wrapper — zachovává kompatibilitu se stávajícím
// kódem, který používá async/await.
// ============================================================

/**
 * Provede SQL dotaz (INSERT, UPDATE, DELETE).
 * @param {string} sql - SQL dotaz s ? placeholders
 * @param {Array} params - Hodnoty pro placeholders
 * @returns {Promise<{lastID: number, changes: number}>}
 */
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return Promise.resolve({
      lastID: result.lastInsertRowid,
      changes: result.changes
    });
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Získá jeden řádek z databáze.
 * @param {string} sql - SQL dotaz s ? placeholders
 * @param {Array} params - Hodnoty pro placeholders
 * @returns {Promise<object|undefined>}
 */
function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const row = stmt.get(...params);
    return Promise.resolve(row);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Získá všechny řádky z databáze.
 * @param {string} sql - SQL dotaz s ? placeholders
 * @param {Array} params - Hodnoty pro placeholders
 * @returns {Promise<Array>}
 */
function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return Promise.resolve(rows);
  } catch (error) {
    return Promise.reject(error);
  }
}

// ============================================================
// Inicializace databáze — vytvoření tabulek a seed dat
// ============================================================

async function initDb() {
  console.log('📦 Inicializuji databázi...');

  // Uživatelé admin účtu
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_changed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Logování pokusů o přihlášení (ochrana proti brute force)
  db.exec(`CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    username TEXT,
    success INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Nemovitosti
  db.exec(`CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price INTEGER NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Na prodej',
    accessories TEXT NOT NULL DEFAULT '',
    energy_rating TEXT NOT NULL DEFAULT '',
    construction TEXT NOT NULL DEFAULT '',
    infrastructure TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT '',
    ownership TEXT NOT NULL DEFAULT '',
    other TEXT NOT NULL DEFAULT '',
    history TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    agent_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Obrázky nemovitostí
  db.exec(`CREATE TABLE IF NOT EXISTS property_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    alt TEXT NOT NULL,
    FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
  )`);

  // Makléři
  db.exec(`CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    bio TEXT NOT NULL
  )`);

  // Poptávky z kontaktního formuláře
  db.exec(`CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    property_id INTEGER,
    handled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE SET NULL
  )`);

  // Nastavení kontaktů kanceláře
  db.exec(`CREATE TABLE IF NOT EXISTS contact_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    office_name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    opening_hours TEXT NOT NULL,
    facebook TEXT NOT NULL,
    instagram TEXT NOT NULL,
    linkedin TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL
  )`);

  // Nastavení webu (klíč-hodnota)
  db.exec(`CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`);

  // Audit log pro bezpečnostní dohledatelnost
  db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    entity TEXT NOT NULL DEFAULT '',
    entity_id INTEGER,
    detail TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Indexy pro rychlejší dotazy na audit log
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');

  // Migrace: přidání sloupce password_changed (pokud už existuje, ignorujeme chybu)
  try {
    db.exec("ALTER TABLE users ADD COLUMN password_changed INTEGER DEFAULT 1");
  } catch (_) {
    // Sloupec už existuje — ignorujeme
  }

  await seedAdmin();
  await seedContactSettings();
  await seedSiteSettings();
  await refreshSiteSettingDefaults();

  console.log('✅ Databáze inicializována');
}

// ============================================================
// Výchozí data
// ============================================================

const officeContact = {
  address: 'Dobrodružná 747, Liberec XXV, 463 12',
  phone: '+420 730 807 738',
  email: 'jachym@sulovsky.com',
  lat: 50.739417222222,
  lng: 15.078639444444
};

const defaultSiteSettings = {
  site_name: 'Drápal Real Estate',
  site_meta_description: 'Drápal Real Estate - moderní realitní kancelář pro prodej, pronájem a investice do nemovitostí.',
  brand_mark: 'D',
  home_hero_eyebrow: 'Realitní kancelář Brno',
  home_hero_title: 'Drápal Real Estate',
  home_hero_text: 'Moderní prodej, pronájem a investiční poradenství pro nemovitosti, které si zaslouží prvotřídní prezentaci.',
  home_hero_button: 'Prohlédnout nabídku',
  home_offer_eyebrow: 'Aktuální nabídka',
  home_offer_title: 'Vybrané nemovitosti',
  footer_description: 'Profesionální realitní služby s důrazem na důvěru, prezentaci a výsledek.',
  contact_eyebrow: 'Kontakt',
  contact_people_title: 'Kontaktní osoby',
  contact_form_title: 'Napište nám',
  contact_map_title: 'Kde nás najdete',
  contact_map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2524.316!2d15.056!3d50.767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470935b61a53b5f9%3A0x99cdace46aefe6d5!2sDobrodru%C5%BEn%C3%A1%202074%2F2%2C%20463%2012%20Liberec-Vesec!5e0!3m2!1scs!2scz!4v1780217264816!5m2!1scs!2scz',
  hero_image_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=85',
  privacy_updated_at: '5. června 2026',
  privacy_download_url: '/docs/zasady-ochrany-osobnich-udaju.docx',
  privacy_content: `1. Správce osobních údajů
Správcem osobních údajů je Jáchym Sulovský, e-mail: jachym@sulovsky.com, telefon: +420 730 807 738.

2. Rozsah a účel zpracování
Vaše osobní údaje zpracovávám jako fyzická osoba v rámci vývoje a provozu developerského projektu "Drápal Real Estate". Údaje jsou zpracovávány za následujícími účely:

Testování funkcionality a plnění technických požadavků: Zajištění provozu webových stránek a kontaktních formulářů.

Komunikace s klienty: Vyřízení vašich dotazů a požadavků zaslaných prostřednictvím kontaktního formuláře.

Analýza návštěvnosti: Zlepšování uživatelské zkušenosti a analýza výkonu webu (pomocí analytických nástrojů).

3. Právní tituly pro zpracování
Vaše údaje zpracovávám na základě těchto právních titulů:

Oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR): Zpracování nezbytné pro zajištění technického provozu webu a analýzu návštěvnosti.

Jednání o smlouvě (čl. 6 odst. 1 písm. b) GDPR): Zpracování údajů, které mi dobrovolně poskytnete prostřednictvím kontaktního formuláře, za účelem vyřízení vašeho požadavku či dotazu.

4. Doba uchování údajů
Osobní údaje zpracovávám pouze po dobu nezbytnou pro naplnění účelu, ke kterému byly shromážděny:

Údaje z kontaktních formulářů uchovávám po dobu nezbytnou k vyřízení vašeho požadavku, maximálně však po dobu 6 měsíců, nebude-li následně navázána obchodní spolupráce.

Údaje získané pro analytické účely jsou uchovávány v souladu s nastavením analytických nástrojů třetích stran.

5. Příjemci a zpracovatelé údajů
Pro zajištění provozu webu využívám nástroje a služby třetích stran, které mohou mít přístup k určitým údajům:

Google (Analytics, Maps): Analýza návštěvnosti a zobrazení mapových podkladů.

Render: Hostingové služby a správa serverové infrastruktury.

Brevo: Zajištění SMTP relé pro odesílání e-mailové komunikace z webu.

S těmito poskytovateli mám zajištěn soulad s předpisy o ochraně osobních údajů. Sběr dat prostřednictvím cookies probíhá pouze na základě vašeho předchozího aktivního souhlasu uděleného prostřednictvím CookieConsent lišty.

6. Vaše práva
Jako subjekt údajů máte právo:

Na přístup ke svým osobním údajům.

Na opravu nepřesných nebo neúplných údajů.

Na výmaz údajů (právo být zapomenut).

Na omezení zpracování.

Vznést námitku proti zpracování.

Podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz).

Pro uplatnění těchto práv mě můžete kdykoliv kontaktovat na e-mailové adrese: jachym@sulovsky.com.

7. Převod správy údajů
V případě budoucí komercializace projektu a převodu na jiný subjekt budou uživatelé o této změně správce údajů informováni. Veškeré závazky správce a práva subjektů údajů přejdou na nového správce, přičemž bude zajištěna kontinuita ochrany osobních údajů v souladu s platnou legislativou.

8. Zabezpečení
Přijal jsem přiměřená technická a organizační opatření k zabezpečení vašich údajů v rámci možností developerského projektu.`
};

function generateRandomCredentials() {
  return {
    username: crypto.randomBytes(4).toString('hex'),   // 8 hex znaků
    password: crypto.randomBytes(6).toString('hex')    // 12 hex znaků
  };
}

function printAdminCredentials(username, password) {
  console.log(`\n  ${'═'.repeat(50)}`);
  console.log('  🔐  NOVÝ ADMIN ÚČET — přihlašovací údaje');
  console.log(`  ${'═'.repeat(50)}`);
  console.log(`  👤  Uživatel:  ${username}`);
  console.log(`  🔑  Heslo:     ${password}`);
  console.log(`  ${'═'.repeat(50)}`);
  console.log('  ⚠️  Po přihlášení si obojí změňte v sekci Účet.');
  console.log(`  ${'═'.repeat(50)}\n`);
}

async function seedAdmin() {
  // === Diagnostika: database file info ===
  try {
    const dbStat = fs.statSync(dbPath);
    console.log(`📁 DB cesta: ${dbPath}`);
    console.log(`📁 DB existuje: ano (${(dbStat.size / 1024).toFixed(0)} KB, modifikováno: ${dbStat.mtime.toISOString()})`);
  } catch (_) {
    console.log(`📁 DB cesta: ${dbPath}`);
    console.log(`📁 DB existuje: NE – bude vytvořena`);
  }

  const existing = db.prepare('SELECT id, username FROM users ORDER BY id ASC LIMIT 1').get();
  const forceReset = process.env.ADMIN_PASSWORD_RESET === 'true';
  const envUsername = process.env.ADMIN_USERNAME || '';
  const envPassword = process.env.ADMIN_PASSWORD || '';

  console.log(`👤 Existující admin: ${existing ? existing.username : 'NENALEZEN'}`);
  console.log(`⚙️  ADMIN_PASSWORD_RESET=${process.env.ADMIN_PASSWORD_RESET || '(nenastaveno)'}`);
  console.log(`⚙️  ADMIN_USERNAME=${envUsername ? '***nastaveno***' : '(nenastaveno)'}`);

  if (existing && forceReset) {
    // Vynucený reset – ADMIN_PASSWORD_RESET=true: změníme username i heslo
    const creds = (envUsername && envPassword)
      ? { username: envUsername, password: envPassword }
      : generateRandomCredentials();
    const passwordHash = await bcrypt.hash(creds.password, 12);
    db.prepare('UPDATE users SET username = ?, password_hash = ?, password_changed = 0 WHERE id = ?')
      .run(creds.username, passwordHash, existing.id);

    console.log('🔐 Resetován admin účet – ADMIN_PASSWORD_RESET=true');
    printAdminCredentials(creds.username, creds.password);

    db.prepare(`INSERT INTO audit_logs (username, action, entity, entity_id, detail, ip_address, created_at)
      VALUES (?, 'reset_admin', 'user', ?, 'Reset admin účtu (ADMIN_PASSWORD_RESET) – nové náhodné username i heslo', 'startup', datetime('now'))`)
      .run(existing.username, existing.id);
    return;
  }

  if (forceReset && !existing) {
    console.log('📌 ADMIN_PASSWORD_RESET=true, ale admin účet zatím neexistuje – vytvářím nový...');
  }

  if (!existing) {
    // === Fallback: ADMIN_USERNAME/ADMIN_PASSWORD ===
    // Pokud jsou nastaveny env proměnné, použijeme je místo náhodných.
    // Toto řeší situaci, kdy Render persistent disk neudrží databázi
    // mezi deployi – admin účet bude mít pokaždé stejné přihlašovací údaje.
    const useEnv = envUsername && envPassword;
    const creds = useEnv
      ? { username: envUsername, password: envPassword }
      : generateRandomCredentials();

    const passwordHash = await bcrypt.hash(creds.password, 12);
    db.prepare('INSERT INTO users (username, password_hash, password_changed) VALUES (?, ?, 0)')
      .run(creds.username, passwordHash);

    console.log(`🔐 Vytvořen nový admin účet${useEnv ? ' (z ADMIN_USERNAME/ADMIN_PASSWORD)' : ''}`);
    printAdminCredentials(creds.username, creds.password);
  }
}

async function seedContactSettings() {
  const contact = db.prepare('SELECT id FROM contact_settings WHERE id = 1').get();
  if (!contact) {
    db.prepare(`INSERT INTO contact_settings
      (id, office_name, address, phone, email, opening_hours, facebook, instagram, linkedin, lat, lng)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'Moje realitní kancelář',
      officeContact.address,
      officeContact.phone,
      officeContact.email,
      'Po-Pá 9:00-18:00, So po domluvě',
      '', '', '',
      officeContact.lat,
      officeContact.lng
    );
  }
}

async function seedSiteSettings() {
  const insert = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSiteSettings)) {
    insert.run(key, value);
  }
}

async function refreshSiteSettingDefaults() {
  db.prepare('UPDATE site_settings SET value = ? WHERE key = ? AND value = ?').run(
    defaultSiteSettings.contact_map_embed_url, 'contact_map_embed_url',
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2524.316!2d15.056!3d50.767!2m3!1f0!2f0!3f0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470935b61a53b5f9%3A0x99cdace46aefe6d5!2sDobrodru%C5%BEn%C3%A1%202074%2F2%2C%20463%2012%20Liberec-Vesec!5e0!3m2!1scs!2scz!4v1780217264816!5m2!1scs!2scz'
  );
  db.prepare('UPDATE site_settings SET value = ? WHERE key = ? AND value = ?').run(
    defaultSiteSettings.privacy_content, 'privacy_content', ''
  );
}

module.exports = { db, run, get, all, initDb };
