const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'drapal.sqlite');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

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

const legacyMapEmbedUrlWithDuplicateParams = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2524.316!2d15.056!3d50.767!2m3!1f0!2f0!3f0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x470935b61a53b5f9%3A0x99cdace46aefe6d5!2sDobrodru%C5%BEn%C3%A1%202074%2F2%2C%20463%2012%20Liberec-Vesec!5e0!3m2!1scs!2scz!4v1780217264816!5m2!1scs!2scz';

function run(sql, params = []) {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    status TEXT DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run('PRAGMA foreign_keys = ON');

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    username TEXT,
    success INTEGER DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price INTEGER NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Na prodej',
    accessories TEXT NOT NULL,
    energy_rating TEXT NOT NULL,
    construction TEXT NOT NULL,
    infrastructure TEXT NOT NULL,
    area TEXT NOT NULL,
    ownership TEXT NOT NULL,
    other TEXT NOT NULL,
    history TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    agent_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS property_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    alt TEXT NOT NULL,
    FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    bio TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS inquiries (
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

  await run(`CREATE TABLE IF NOT EXISTS contact_settings (
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

  await run(`CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`);

  // await seedAdmin(); // Odstraněno pro bezpečnost - vynutíme setup
  await seedDemoData();
  await seedSiteSettings();
  await refreshSiteSettingDefaults();
  await refreshOfficeContactDefaults();
  await refreshDemoAgentPhotoCrops();
}

async function seedSiteSettings() {
  for (const [key, value] of Object.entries(defaultSiteSettings)) {
    await run('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

async function refreshSiteSettingDefaults() {
  await run(
    'UPDATE site_settings SET value = ? WHERE key = ? AND value = ?',
    [defaultSiteSettings.contact_map_embed_url, 'contact_map_embed_url', legacyMapEmbedUrlWithDuplicateParams]
  );

  await run(
    'UPDATE site_settings SET value = ? WHERE key = ? AND value = ?',
    [defaultSiteSettings.privacy_content, 'privacy_content', '']
  );
}

async function seedAdmin() {
  const existing = await get('SELECT id FROM users WHERE username = ?', ['4dm1n']);
  if (!existing) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Modr3Nebe1', 12);
    await run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['4dm1n', passwordHash]);
  }
}

async function seedDemoData() {
  const contact = await get('SELECT id FROM contact_settings WHERE id = 1');
  if (!contact) {
    await run(
      `INSERT INTO contact_settings
      (id, office_name, address, phone, email, opening_hours, facebook, instagram, linkedin, lat, lng)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Drápal Real Estate',
        officeContact.address,
        officeContact.phone,
        officeContact.email,
        'Po-Pá 9:00-18:00, So po domluvě',
        'https://facebook.com/',
        'https://instagram.com/',
        'https://linkedin.com/',
        officeContact.lat,
        officeContact.lng
      ]
    );
  }

  const agentCount = await get('SELECT COUNT(*) AS count FROM agents');
  if (agentCount.count === 0) {
    await run(
      `INSERT INTO agents (name, role, phone, email, photo_url, bio) VALUES
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?)`,
      [
        'Martin Drápal',
        'Zakladatel a realitní makléř',
        '+420 777 123 456',
        'martin@drapalrealestate.cz',
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=600&crop=faces&q=80',
        'Specialista na prémiové byty a investiční domy v Brně.',
        'Lucie Nováková',
        'Realitní makléřka',
        '+420 777 987 654',
        'lucie@drapalrealestate.cz',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=600&crop=faces&q=80',
        'Provází klienty prodejem rodinných domů a rekreačních objektů.',
        'Petr Malý',
        'Specialista pronájmů',
        '+420 777 456 123',
        'petr@drapalrealestate.cz',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=600&crop=faces&q=80',
        'Řeší pronájmy, správu portfolia a rychlé obsazení nemovitostí.'
      ]
    );
  }

  const propertyCount = await get('SELECT COUNT(*) AS count FROM properties');
  if (propertyCount.count === 0) {
    const properties = [
      {
        title: 'Slunný byt 3+kk s terasou v centru Brna',
        slug: 'slunny-byt-3kk-s-terasou-v-centru-brna',
        price: 10990000,
        location: 'Brno-střed',
        type: 'Byt',
        status: 'Na prodej',
        accessories: 'Terasa, sklep, parkovací stání',
        energy: 'B - velmi úsporná',
        construction: 'Cihlová novostavba',
        infrastructure: 'MHD, školy, kavárny, park',
        area: '86 m2',
        ownership: 'Osobní',
        other: 'Klimatizace, podlahové vytápění',
        history: 'Kolaudace 2021, jeden vlastník',
        address: 'Veveří 12, Brno',
        lat: 49.2006,
        lng: 16.5972,
        agentId: 1,
        description: 'Elegantní městské bydlení s velkou terasou, promyšlenou dispozicí a docházkovou vzdáleností do centra.'
      },
      {
        title: 'Rodinný dům se zahradou v Žebětíně',
        slug: 'rodinny-dum-se-zahradou-v-zebetine',
        price: 15900000,
        location: 'Brno-Žebětín',
        type: 'Dům',
        status: 'Rezervováno',
        accessories: 'Garáž, zahrada, technická místnost',
        energy: 'C - úsporná',
        construction: 'Zděná stavba',
        infrastructure: 'Škola, obchod, les, sportoviště',
        area: '168 m2 + zahrada 620 m2',
        ownership: 'Osobní',
        other: 'Fotovoltaická příprava, retenční nádrž',
        history: 'Rekonstrukce interiéru 2023',
        address: 'Křivánkovo náměstí, Brno-Žebětín',
        lat: 49.2172,
        lng: 16.4898,
        agentId: 2,
        description: 'Klidné rodinné bydlení s výbornou dostupností do města a zahradou orientovanou na jihozápad.'
      },
      {
        title: 'Investiční apartmán u přehrady',
        slug: 'investicni-apartman-u-prehrady',
        price: 5490000,
        location: 'Brno-Bystrc',
        type: 'Apartmán',
        status: 'Na prodej',
        accessories: 'Balkon, komora, výtah',
        energy: 'B - velmi úsporná',
        construction: 'Monolitická stavba',
        infrastructure: 'Přehrada, restaurace, MHD, cyklostezka',
        area: '49 m2',
        ownership: 'Osobní',
        other: 'Vhodné ke krátkodobému i dlouhodobému pronájmu',
        history: 'Nově dokončený projekt',
        address: 'Přístavní, Brno-Bystrc',
        lat: 49.2299,
        lng: 16.5207,
        agentId: 3,
        description: 'Chytrá investice v lokalitě s celoroční poptávkou, krásným okolím a nízkými provozními náklady.'
      }
    ];

    for (const item of properties) {
      const result = await run(
        `INSERT INTO properties
        (title, slug, price, location, type, status, accessories, energy_rating, construction, infrastructure,
         area, ownership, other, history, description, address, lat, lng, agent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.title,
          item.slug,
          item.price,
          item.location,
          item.type,
          item.status,
          item.accessories,
          item.energy,
          item.construction,
          item.infrastructure,
          item.area,
          item.ownership,
          item.other,
          item.history,
          item.description,
          item.address,
          item.lat,
          item.lng,
          item.agentId
        ]
      );

      const imageSets = [
        [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
        ],
        [
          'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
        ],
        [
          'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80'
        ]
      ];

      const set = imageSets[properties.indexOf(item)];
      for (const imageUrl of set) {
        await run('INSERT INTO property_images (property_id, image_url, alt) VALUES (?, ?, ?)', [
          result.lastID,
          imageUrl,
          item.title
        ]);
      }
    }
  }
}

async function refreshDemoAgentPhotoCrops() {
  const updates = [
    [
      'Martin Drápal',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=600&crop=faces&q=80'
    ],
    [
      'Lucie Nováková',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=600&crop=faces&q=80'
    ],
    [
      'Petr Malý',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&h=600&crop=faces&q=80'
    ]
  ];

  for (const [name, oldUrl, newUrl] of updates) {
    await run('UPDATE agents SET photo_url = ? WHERE name = ? AND photo_url = ?', [newUrl, name, oldUrl]);
  }
}

async function refreshOfficeContactDefaults() {
  await run(
    `UPDATE contact_settings
     SET address = ?, phone = ?, email = ?, lat = ?, lng = ?
     WHERE id = 1
       AND (address = ? OR phone = ? OR email = ?)`,
    [
      officeContact.address,
      officeContact.phone,
      officeContact.email,
      officeContact.lat,
      officeContact.lng,
      'Masarykova 427/31, 602 00 Brno-střed',
      '+420 777 123 456',
      'info@drapalrealestate.cz'
    ]
  );

  await run(
    `UPDATE contact_settings
     SET lat = ?, lng = ?
     WHERE id = 1
       AND address = ?
       AND lat = ?
       AND lng = ?`,
    [officeContact.lat, officeContact.lng, officeContact.address, 49.1951, 16.608]
  );
}

module.exports = { db, run, get, all, initDb };
