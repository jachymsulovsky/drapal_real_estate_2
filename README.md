# Drápal Real Estate

Kompletní fullstack webová aplikace pro realitní kancelář, která kombinuje veřejný katalog nemovitostí s administračním rozhraním sloužícím jako zjednodušené CRM pro správu poptávek, nemovitostí, makléřů a nastavení webu.

Aplikace je postavena na moderních, prověřených technologiích s důrazem na rychlost, bezpečnost a snadnou přenositelnost (zero-config SQLite databáze).

---

## 🏗️ Struktura projektu

Projekt je organizován podle standardních MVC (Model-View-Controller) vzorů pro Express aplikace:

```text
drapal_real_estate_2/
│
├── 📁 data/                  # Ukládání lokálních databází a nahraných souborů
│   ├── drapal.sqlite         # Hlavní SQLite databáze (nemovitosti, makléři, nastavení)
│   ├── sessions.sqlite       # Databáze pro správu přihlášených relací (sessions)
│   └── 📁 uploads/           # Složka pro nahrané obrázky nemovitostí a makléřů
│
├── 📁 public/                # Statické soubory servírované klientovi
│   ├── 📁 css/               # Kaskádové styly (styles.css a cookie-consent.css)
│   ├── 📁 docs/              # Dokumenty ke stažení (Zásady ochrany osobních údajů)
│   └── 📁 js/                # Klientský JavaScript (main.js a cookie-consent.js)
│
├── 📁 src/                   # Zdrojový kód aplikace na backendu
│   ├── 📁 controllers/       # Řídicí logika (adminController.js, publicController.js)
│   ├── 📁 middleware/        # Express middleware (auth.js pro ověřování přihlášení)
│   ├── 📁 models/            # Databázové modely a inicializace (db.js)
│   ├── 📁 routes/            # Definice URL tras (adminRoutes.js, publicRoutes.js)
│   └── 📁 utils/             # Pomocné funkce (asyncHandler.js, slugify.js)
│
├── 📁 views/                 # Šablony pro generování HTML (EJS)
│   ├── 📁 admin/             # Šablony administračního rozhraní (dashboard, správa nemovitostí atd.)
│   ├── 📁 partials/          # Znovupoužitelné části šablon (záhlaví, zápatí, navigace)
│   └── *.ejs                 # Šablony veřejných stránek (home, detail, kontakt, 404/500)
│
├── server.js                 # Vstupní bod aplikace (spuštění serveru, konfigurace middleware)
├── package.json              # Konfigurační soubor Node.js (závislosti a skripty)
├── Dockerfile & render.yaml  # Konfigurace pro nasazení do produkce (Render.com, Docker)
└── DEPLOYMENT.md             # Podrobný návod pro nasazení aplikace online
```

---

## 🛠️ Použité technologie

- **Backend:** Node.js + Express framework
- **Databáze:** SQLite3 (s connect-sqlite3 pro uchovávání sessions)
- **Šablonovací systém:** EJS (Embedded JavaScript) pro dynamické generování HTML na serveru
- **Zabezpečení:** 
  - `bcrypt` pro bezpečné hashování hesel administrátorů
  - `helmet` pro nastavení bezpečných HTTP hlaviček a CSP (Content Security Policy)
  - `express-rate-limit` pro ochranu před útoky hrubou silou na přihlašovací formuláře
- **Klientské knihovny:** 
  - Leaflet.js + OpenStreetMap pro interaktivní mapy
- **Další:** Multer pro zpracování nahrávání souborů (fotografií), Nodemailer (pro posílání e-mailů)

---

## 🌟 Klíčové funkce

### 1. Veřejná část (Katalog nemovitostí)
- **Domovská stránka:** Hero sekce s výzvou k akci, vyhledávací filtr (podle ceny, lokality a typu nemovitosti) a karty aktuálně nabízených nemovitostí.
- **Detail nemovitosti:** Kompletní specifikace nemovitosti, galerie fotografií, informace o přiřazeném makléři a interaktivní mapa s přesným umístěním.
- **Stránka Kontakt:** Seznam všech makléřů s jejich medailonky, kontaktní údaje kanceláře, mapa pobočky a odesílací formulář pro zaslání přímého dotazu.
- **Zásady ochrany osobních údajů (GDPR):** Plně v souladu s legislativou, včetně interaktivní Cookie lišty s možností nastavení souhlasu.

### 2. Administrační rozhraní (Mini CRM)
Administrace je zabezpečená a dostupná na trase `/admin`.
- **Prvotní nastavení:** Při prvním spuštění aplikace systém automaticky detekuje absenci administrátora a vyzve k bezpečnému vytvoření prvního účtu.
- **Dashboard:** Statistiky na první pohled (počet nemovitostí, otevřené poptávky, prodané nemovitosti) a přehled posledních poptávek.
- **Správa nemovitostí:** Kompletní CRUD (přidat, upravit, smazat) pro nemovitosti včetně nahrávání fotografií přes formulář.
- **CRM poptávek:** Seznam zpráv z kontaktních formulářů s možností vyhledávání, označení poptávky za vyřízenou a smazání.
- **Správa makléřů a kontaktů:** Úprava informací o makléřích (včetně nahrávání profilových fotek) a nastavení kontaktů celé kanceláře.
- **Nastavení webu:** Možnost měnit texty v hero sekci, měnit úvodní obrázek webu nebo přímo editovat text zásad ochrany osobních údajů.

---

## 🚀 Instalace a spuštění

### Lokální vývoj
1. **Nainstalujte závislosti:**
   ```bash
   npm install
   ```
2. **Spusťte aplikaci v režimu vývoje:**
   ```bash
   npm run dev
   ```
   *Nebo pro standardní spuštění:* `npm start`
3. **Otevřete v prohlížeči:**
   [http://localhost:3000](http://localhost:3000)

### Nastavení administrace při prvním spuštění
1. Po spuštění přejděte na adresu [http://localhost:3000/admin](http://localhost:3000/admin).
2. Zadejte uživatelské jméno a heslo, které si přejete vytvořit (heslo musí mít alespoň 8 znaků).
3. Po potvrzení se vytvoří administrátorský účet a budete přesměrováni do dashboardu.
