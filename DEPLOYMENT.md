# Nasazení na Render.com

Tento návod vás provede nasazením aplikace Drápal Real Estate na Render.com, kde bude fungovat online s plnou funkčností včetně databáze a admin rozhraní.

## Krok 1: Příprava GitHub repozitáře

Ujistěte se, že máte všechny změny commitnuté a pushnuté na GitHub:

```bash
git add .
git commit -m "Přidána konfigurace pro Render.com"
git push origin main
```

## Krok 2: Vytvoření účtu na Render.com

1. Jděte na https://render.com
2. Klikněte na **"Get Started for Free"**
3. Přihlaste se pomocí GitHub účtu
4. Autorizujte Render přístup k vašim repozitářům

## Krok 3: Vytvoření nové služby

1. Na Render dashboardu klikněte na **"New +"** → **"Web Service"**
2. Najděte a vyberte repozitář **drapal_real_estate**
3. Render automaticky detekuje `render.yaml` konfiguraci

## Krok 4: Konfigurace (automatická díky render.yaml)

Render automaticky nastaví:
- **Name:** drapal-real-estate
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** NODE_ENV=production, SESSION_SECRET (auto-generovaný)
- **Persistent Disk:** 1GB pro databázi (připojený na /opt/render/project/src/data)

## Krok 5: Nasazení

1. Klikněte na **"Create Web Service"** (nebo "Apply" pokud používá render.yaml)
2. Render začne buildovat a nasazovat aplikaci
3. Proces trvá cca 2-5 minut
4. Po dokončení uvidíte URL vaší aplikace (např. `https://drapal-real-estate.onrender.com`)

## Krok 6: Přístup k aplikaci

- **Veřejný web:** `https://drapal-real-estate.onrender.com`
- **Admin:** `https://drapal-real-estate.onrender.com/admin`
  - Username: `4dm1n`
  - Password: `Modr3Nebe1`

## Důležité poznámky

### Free Tier omezení
- Aplikace na free tieru "usíná" po 15 minutách neaktivity
- První načtení po probuzení trvá ~30-60 sekund
- Pro produkční použití zvažte placený plán ($7/měsíc) pro 24/7 dostupnost

### Databáze
- SQLite databáze je uložena na persistentním disku
- Data zůstanou zachována i po redeployi
- Zálohy si můžete stáhnout přes Render Shell

### Nahrané soubory
- Fotky nahrané přes admin jsou uloženy na persistentním disku
- Zůstanou zachovány mezi deploymenty

### Automatické deploymenty
- Každý push na GitHub automaticky spustí nový deployment
- Můžete to vypnout v nastavení služby

## Řešení problémů

### Aplikace se nespustí
- Zkontrolujte logy v Render dashboardu (záložka "Logs")
- Ověřte, že všechny dependencies jsou v package.json

### Databáze se neukládá
- Zkontrolujte, že persistent disk je správně připojený
- Cesta musí být `/opt/render/project/src/data`

### Session problémy
- SESSION_SECRET je automaticky generovaný Renderem
- Můžete ho změnit v Environment Variables

## Vlastní doména (volitelné)

1. V Render dashboardu jděte do Settings → Custom Domain
2. Přidejte vaši doménu (např. `drapal-reality.cz`)
3. Nastavte DNS záznamy podle instrukcí Renderu
4. Render automaticky poskytne SSL certifikát

## Podpora

- Render dokumentace: https://render.com/docs
- Render community: https://community.render.com
