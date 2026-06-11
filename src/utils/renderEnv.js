// ============================================================
// Render API — aktualizace environment variables
// ============================================================
// Při změně admin přihlašovacích údajů v UI se automaticky
// aktualizují ADMIN_USERNAME a ADMIN_PASSWORD v Render dashboardu
// přes Render API. Tím je zajištěno, že změněné credentials
// přežijí redeploy kontejneru (jako env vars, ne v SQLite).
// ============================================================
// Vyžaduje nastavení env vars v Render dashboardu:
//   RENDER_API_KEY  – API klíč z Render Account Settings
//   RENDER_SERVICE_ID – ID služby (např. srv-xxxxx)
// ============================================================

const https = require('https');

/**
 * Aktualizuje jednu environment variable v Render dashboardu.
 * @param {string} key - Název proměnné (např. 'ADMIN_USERNAME')
 * @param {string} value - Nová hodnota
 * @returns {Promise<boolean>} true pokud se podařilo, false pokud ne
 */
function updateEnvVar(key, value) {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;

  if (!apiKey || !serviceId) {
    console.log(`⚠️  RENDER_API_KEY nebo RENDER_SERVICE_ID není nastaven — env var ${key} nebude aktualizována`);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const data = JSON.stringify({ value });
    const url = `/v1/services/${serviceId}/env-vars/${key}`;

    const options = {
      hostname: 'api.render.com',
      path: url,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Render env var ${key} updated`);
          resolve(true);
        } else {
          console.error(`⚠️  Render API error (${res.statusCode}) pro ${key}: ${body.slice(0, 200)}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`⚠️  Render API request failed pro ${key}:`, err.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Aktualizuje ADMIN_USERNAME a ADMIN_PASSWORD v Render dashboardu.
 * Volá se po změně přihlašovacích údajů v admin UI.
 * @param {string} username - Nové uživatelské jméno
 * @param {string} password - Nové heslo (plaintext)
 */
async function updateAdminCredentials(username, password) {
  console.log('📡 Aktualizuji admin credentials v Render dashboardu...');
  const [userResult, passResult] = await Promise.all([
    updateEnvVar('ADMIN_USERNAME', username),
    updateEnvVar('ADMIN_PASSWORD', password)
  ]);

  if (userResult && passResult) {
    console.log('✅ Admin credentials v Render dashboardu aktualizovány');
  } else {
    console.warn('⚠️  Nepodařilo se aktualizovat Render env vars — změna je pouze v SQLite');
  }
}

module.exports = { updateEnvVar, updateAdminCredentials };
