# Drápal Real Estate — Projektová dokumentace

## Přehled projektu

Drápal Real Estate je fullstack webová aplikace pro realitní kancelář. Jedná se o mini CRM systém s veřejnou částí (nabídka nemovitostí, detail nemovitosti, kontaktní formulář) a admin částí (správa nemovitostí, poptávek, makléřů, nastavení webu).

**Technologie:** Node.js, Express, EJS, SQLite3, Vanilla JS, CSS

---

## 1. Bezpečnostní opatření

### 1.1 Ochrana proti CSRF
- Každá session má unikátní CSRF token (`crypto.randomBytes(32).toString('hex')`)
- Token je dostupný ve všech šablonách přes `res.locals.csrfToken`
- Všechny POST formuláře (admin i veřejné) obsahují `<input type="hidden" name="_csrf">`
- `validateCsrf` middleware porovnává token z formuláře s tokenem v session

### 1.2 Ochrana proti brute force
- Rate limiter na login: max 5 pokusů za 15 minut na IP
- Rate limiter na admin operace: max 100 POST za hodinu
- Rate limiter na kontaktní formulář: max 5 odeslání za 15 minut
- Logování neúspěšných pokusů do tabulky `login_attempts`

### 1.3 Bezpečnostní hlavičky
- `X-Frame-Options: DENY` — ochrana proti clickjackingu
- `X-Content-Type-Options: nosniff` — ochrana proti MIME sniffingu
- `Strict-Transport-Security` (pouze v produkci) — vynucení HTTPS
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — omezení API (geolokace, kamera, mikrofon)
- `Content-Security-Policy` přes helmet — povoluje pouze důvěryhodné zdroje

### 1.4 Ochrana session
- Session secret z proměnné prostředí `SESSION_SECRET` (v produkci povinný)
- Ve vývoji se generuje náhodný klíč přes `crypto.randomBytes(32)`
- Cookie: `httpOnly: true`, `secure` v produkci, `sameSite: 'lax'`
- Po přihlášení se session regeneruje (ochrana proti session fixation)

### 1.5 Ochrana uploadů
- Magic bytes validace — kontroluje skutečný typ souboru (nejen MIME typ)
- Povolené typy: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX
- SVG/XML jsou zakázány (riziko XSS)
- Maximální velikost: 4 MB pro obrázky, 8 MB pro dokumenty

### 1.6 Audit logging
- Všechny kritické akce v administraci se logují do tabulky `audit_logs`
- Loguje se: kdo, kdy, jakou akci provedl, z jaké IP
- Dohledatelné akce: přihlášení, vytvoření/úprava/smazání nemovitosti, změna hesla, úprava kontaktů a nastavení webu

### 1.7 Ostatní bezpečnostní prvky
- Všechny SQL dotazy používají parametrizované prepared statements (ochrana proti SQL injection)
- Výstupy v EJS šablonách používají escapované `<%= %>` (ochrana proti XSS)
- `sanitize-html` pro obsah ochrany osobních údajů
- Validace URL (pouze http/https schémata)
- Validace hesel (min 12 znaků, velké/malé písmeno, číslice, speciální znak)
- Validace e-mailů
- Ochrana proti open redirect v kontaktním formuláři

---

## 2. SEO optimalizace

### 2.1 Strukturovaná data (JSON-LD)
- **Organization + RealEstateAgent** — na všech stránkách, obsahuje název, logo, kontakt, sociální sítě
- **RealEstateListing** — na detailu nemovitosti, obsahuje cenu, adresu, plochu, dostupnost
- **BreadcrumbList** — navigační drobečková data pro Google

### 2.2 Meta tagy
- **Open Graph** (Facebook, LinkedIn): `og:title`, `og:description`, `og:image`, `og:url`, `og:locale`, `og:site_name`
- **Twitter Cards**: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- **Canonical URL** na všech stránkách (zabránění duplicitnímu obsahu)
- **Meta description** nastavitelná z administrace

### 2.3 Sitemap a robots.txt
- Dynamická `/sitemap.xml` — automaticky obsahuje všechny nemovitosti + statické stránky
- `/robots.txt` — blokuje admin sekci a upload složku, odkazuje na sitemapu
- Priorita: homepage (1.0), nemovitosti (0.9), kontakt (0.8), privacy (0.5)

### 2.4 Technické SEO
- `preconnect` hinty pro rychlejší načítání CDN zdrojů
- Lazy loading obrázků (`loading="lazy"`)
- Cache headers pro statické soubory (7 dní CSS/JS, 30 dní obrázky)

---

## 3. UX/UI vylepšení

### 3.1 Detail nemovitosti
- **Lightbox galerie** — kliknutím na obrázek se otevře celoobrazovkové prohlížení
- **Ovládání klávesnicí** — šipky pro procházení, ESC pro zavření
- **Podobné nemovitosti** — 3 nabídky stejného typu pod mapou
- **Sticky CTA na mobilu** — pevné tlačítko "Zavolat makléři" dole

### 3.2 Filtrování
- Filtrování podle ceny, lokality a typu
- Tlačítko "Zrušit filtry" se zobrazí automaticky, pokud je filtr aktivní

### 3.3 Responzivní design
- Optimalizace pro mobily (≤ 640 px), tablety (≤ 900 px) a desktop
- Mobilní sticky CTA
- Responzivní grid pro nemovitosti, makléře, galerii

### 3.4 Dark mode
- Ukládání preference do `localStorage`
- Tlačítko přepnutí v headeru i admin sidebaru

---

## 4. Výkon

- **Cache headers** pro statické soubory (7 dní pro CSS/JS, 30 dní pro obrázky)
- **Lazy loading** obrázků pod viditelnou částí stránky
- **Preconnect** na CDN zdroje (Images, unpkg, jsDelivr)
- **Minimalizace bundle size** — odstraněny nepoužité závislosti (`dompurify`, `nodemailer`, `openai`)

---

## 5. Struktura projektu

```
drapal_real_estate_2/
├── server.js                    # Hlavní server (Express, middlewares, routy)
├── package.json                 # Závislosti a skripty
├── data/                        # Perzistentní data (databáze, uploady)
├── public/                      # Statické soubory
│   ├── css/
│   │   ├── styles.css           # Hlavní styly
│   │   └── cookie-consent.css   # Styly pro cookie lištu
│   ├── js/
│   │   ├── main.js              # Hlavní JS (lightbox, mapy, theme, sticky CTA)
│   │   └── cookie-consent.js    # Cookie consent + Google Consent Mode
│   └── robots.txt               # SEO - pravidla pro vyhledávače
├── src/
│   ├── controllers/
│   │   ├── adminController.js   # Admin funkcionalita (CRUD nemovitostí, správa)
│   │   └── publicController.js  # Veřejné stránky (home, detail, kontakt)
│   ├── middleware/
│   │   └── auth.js              # Autentizace pro admin sekci
│   ├── models/
│   │   └── db.js                # SQLite databáze + seed data
│   ├── routes/
│   │   ├── adminRoutes.js       # Admin routy s CSRF, upload, auth
│   │   └── publicRoutes.js      # Veřejné routy
│   └── utils/
│       ├── asyncHandler.js      # Async error handler
│       ├── csrf.js              # CSRF token generování a validace
│       ├── slugify.js           # URL přátelské slugy
│       └── validators.js        # Validace URL, hesla, čísel, e-mailu, magic bytes
└── views/
    ├── partials/
    │   ├── head.ejs             # HTML head (SEO, JSON-LD, OG, CSS)
    │   ├── header.ejs           # Header s navigací
    │   ├── footer.ejs           # Footer + Leaflet + cookie consent
    │   ├── cookie-consent.ejs   # Cookie lišta a modal
    │   ├── admin-head.ejs       # Admin head
    │   ├── admin-nav.ejs        # Admin sidebar navigace
    │   └── admin-foot.ejs       # Admin footer
    ├── home.ejs                 # Hlavní stránka s nabídkou
    ├── property-detail.ejs      # Detail nemovitosti
    ├── contact.ejs              # Kontaktní stránka
    ├── privacy-policy.ejs       # Zásady ochrany osobních údajů
    └── admin/                   # Admin šablony
```

---

## 6. Jak přidat novou funkcionalitu

### Přidání nové stránky:
1. Přidej route do `src/routes/publicRoutes.js` nebo `adminRoutes.js`
2. Vytvoř handler v `src/controllers/publicController.js` nebo `adminController.js`
3. Vytvoř EJS šablonu v `views/`
4. Pokud stránka potřebuje SEO data, přidej JSON-LD do šablony nebo do `head.ejs`

### Přidání nového typu nemovitosti:
- Typ se zadává jako textové pole v administraci (žádný hardcoded seznam)
- Lze přidat nové typy přímo při vytváření nemovitosti

### Přidání nového nastavení webu:
1. Přidej klíč do `fields` pole v `updateWebSettings` funkci
2. Přidej výchozí hodnotu do `defaultSiteSettings` v `db.js`
3. Přidej formulářové pole do `views/admin/web-settings.ejs`

---

## 7. Další doporučené kroky

1. **SMTP integrace** — pro odesílání e-mailových notifikací z kontaktního formuláře
2. **CI/CD pipeline** — automatické testy a deploy na produkci
3. **Monitoring** — chybové logování (Sentry nebo podobné)
4. **Unit/E2E testy** — pokrytí kritických cest (login, CRUD nemovitostí)
5. **Image CDN** — automatická optimalizace a resizing nahraných obrázků
6. **Fulltext search** — Elasticsearch / Meilisearch pro vyhledávání nemovitostí
7. **Multi-jazyčnost** — podpora angličtiny a němčiny

---

*Dokumentace naposledy aktualizována: 10. června 2026*
