# Drápal Real Estate

Kompletní fullstack webová aplikace pro realitní kancelář s veřejnou nabídkou, kontaktní stránkou, kontaktním formulářem a administrací jako mini CRM.

## Technologie

- Node.js + Express
- SQLite
- EJS šablony
- bcrypt + express-session
- HTML5, CSS3, JavaScript
- Leaflet + OpenStreetMap

## Instalace a spuštění

### Lokální vývoj

```bash
npm install
npm start
```

Aplikace poběží na:

```text
http://localhost:3000
```

### Online nasazení

Aplikace je připravena pro nasazení na **Render.com** s plnou funkčností, persistentním diskem pro SQLite databázi a nahrané soubory.

📖 **Podrobný návod:** viz [DEPLOYMENT.md](DEPLOYMENT.md)

**Rychlý start:**
1. Pushněte kód na GitHub
2. Vytvořte účet na [render.com](https://render.com)
3. Připojte GitHub repozitář
4. Render detekuje `render.yaml` a nasadí aplikaci

## Administrace

```text
URL: /admin
Username: 4dm1n
Password: Modr3Nebe1
```

Heslo se při prvním spuštění uloží do SQLite databáze jako bcrypt hash. Plaintext heslo není ukládáno do databáze.

## Funkce

- veřejná domovská stránka s hero sekcí, CTA, filtrem a kartami nemovitostí
- detail nemovitosti se specifikací, galerií, makléřem a interaktivní mapou
- samostatná stránka Kontakt s kanceláří, makléři, mapou a formulářem
- ukládání poptávek do SQLite
- admin přihlášení chráněné session middlewarem
- správa nemovitostí včetně uploadu fotek
- CRM poptávky: výpis, vyhledávání, označení jako vyřízené, smazání
- správa kontaktů, sociálních sítí, GPS a makléřů
- jednoduchý dashboard se statistikami
- dark/light mode
- slug URL pro nemovitosti
- demo data při prvním spuštění

## Struktura

```text
src/
  controllers/
  middleware/
  models/
  routes/
  utils/
views/
  admin/
  partials/
public/
  css/
  js/
  uploads/
data/
```

## Poznámky

Databáze vznikne automaticky v `data/drapal.sqlite`. Session store používá `data/sessions.sqlite`. Nahrané fotografie se ukládají do `public/uploads`.
