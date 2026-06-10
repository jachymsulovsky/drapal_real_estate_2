#!/usr/bin/env node

/**
 * 🔐 Správa admin účtu pro Drápal Real Estate
 *
 * Bezpečný CLI nástroj pro zobrazení a reset přihlašovacích údajů.
 * Lze spustit pouze v terminálu projektu (Render Shell nebo lokálně).
 *
 * Použití:
 *   node scripts/admin.js show   – zobrazí admin uživatelské jméno
 *   node scripts/admin.js reset  – vygeneruje nové náhodné heslo
 *   node scripts/admin.js reset --force – reset bez potvrzení
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const bcrypt = require('bcrypt');

const ADMIN_USERNAME = '4dm1n';
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'drapal.sqlite');
const command = process.argv[2];
const forceReset = process.argv.includes('--force');

// ============================================================
// Pomocné funkce
// ============================================================

function header(text) {
  console.log(`\n  ${'═'.repeat(50)}`);
  console.log(`  ${text}`);
  console.log(`  ${'═'.repeat(50)}`);
}

function openDb() {
  if (!fs.existsSync(dbPath)) {
    console.log(`\n  ❌ Databáze neexistuje. Spusťte nejdříve server (npm start), který ji vytvoří.\n`);
    process.exit(1);
  }
  try {
    const db = require('better-sqlite3')(dbPath);
    db.pragma('foreign_keys = ON');
    return db;
  } catch (err) {
    console.log(`\n  ❌ Nelze otevřít databázi: ${err.message}\n`);
    process.exit(1);
  }
}

function printCredentials(username, password) {
  console.log(`\n  ✅  Nové přihlašovací údaje byly vygenerovány!\n`);
  console.log(`  ┌─────────────────────────────────────────────────┐`);
  console.log(`  │  🌐  URL admin:  /admin                         │`);
  console.log(`  ├─────────────────────────────────────────────────┤`);
  console.log(`  │  👤  Uživatel:   ${username.padEnd(34)}│`);
  console.log(`  │  🔑  Heslo:      ${password.padEnd(34)}│`);
  console.log(`  └─────────────────────────────────────────────────┘`);
  console.log(`\n  ⚠️  Toto heslo je zobrazeno pouze nyní v terminálu.`);
  console.log(`  ⚠️  Po přihlášení budete přesměrováni na změnu hesla.`);
  console.log(`  💡  Pro zobrazení nápovědy: node scripts/admin.js help\n`);
}

function promptConfirm(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`  ${query} (ano/ne): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'ano' || answer.toLowerCase().trim() === 'a' || answer.toLowerCase().trim() === 'yes' || answer.toLowerCase().trim() === 'y');
    });
  });
}

// ============================================================
// Příkaz: show
// ============================================================

function showAdmin() {
  const db = openDb();
  const user = db.prepare('SELECT id, username, password_changed, created_at FROM users WHERE username = ?').get(ADMIN_USERNAME);

  if (!user) {
    console.log(`\n  ❌ Admin účet "${ADMIN_USERNAME}" nebyl nalezen.`);
    console.log(`  💡 Spusťte server (npm start), který ho automaticky vytvoří.\n`);
    process.exit(1);
  }

  header(`🔐  Admin účet — ${user.username}`);

  console.log(`  👤  Uživatelské jméno:  ${user.username}`);

  if (user.password_changed) {
    console.log(`  ✅  Stav hesla:         Již změněno (bezpečné)`);
  } else {
    console.log(`  ⚠️  Stav hesla:         Výchozí heslo (dosud nezměněno)`);
    console.log(`\n  💡  Heslo nelze zobrazit — je bezpečně zahashované.`);
    console.log(`  💡  Pro vygenerování nového hesla spusťte:`);
    console.log(`      node scripts/admin.js reset\n`);
  }

  console.log(`  📅  Vytvořeno:          ${user.created_at}`);
  console.log(`\n  🔗  Admin přihlášení:  /admin\n`);
}

// ============================================================
// Příkaz: reset
// ============================================================

async function resetAdmin() {
  const db = openDb();
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(ADMIN_USERNAME);

  if (!user) {
    console.log(`\n  ❌ Admin účet "${ADMIN_USERNAME}" nebyl nalezen.`);
    console.log(`  💡 Spusťte server (npm start), který ho automaticky vytvoří.\n`);
    process.exit(1);
  }

  if (!forceReset) {
    const confirmed = await promptConfirm(`Opravdu chcete resetovat heslo pro uživatele "${user.username}"?`);
    if (!confirmed) {
      console.log(`\n  ❌ Reset zrušen.\n`);
      return;
    }
  }

  const password = crypto.randomBytes(6).toString('hex');
  const passwordHash = await bcrypt.hash(password, 12);

  db.prepare('UPDATE users SET password_hash = ?, password_changed = 0 WHERE username = ?').run(passwordHash, ADMIN_USERNAME);

  // Zápis do audit logu
  db.prepare(`INSERT INTO audit_logs (username, action, entity, entity_id, detail, ip_address, created_at)
    VALUES (?, 'reset_password', 'user', ?, 'Reset hesla admin účtu z CLI', 'CLI', datetime('now'))`)
    .run(user.username, user.id);

  printCredentials(user.username, password);
}

// ============================================================
// Nápověda
// ============================================================

function showHelp() {
  header(`🔐  Drápal Real Estate — Správa admin účtu`);

  console.log(`\n  Použití:\n`);
  console.log(`    node scripts/admin.js show           Zobrazit admin uživatelské jméno`);
  console.log(`    node scripts/admin.js reset          Vygenerovat nové náhodné heslo (s potvrzením)`);
  console.log(`    node scripts/admin.js reset --force  Reset hesla bez potvrzovací otázky\n`);
  console.log(`  Npm skripty:\n`);
  console.log(`    npm run admin:show                    Zobrazit admin uživatelské jméno`);
  console.log(`    npm run admin:reset                   Vygenerovat nové náhodné heslo\n`);
}

// ============================================================
// Main
// ============================================================

(async () => {
  switch (command) {
    case 'show':
      showAdmin();
      break;
    case 'reset':
      await resetAdmin();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log(`\n  ⚠️  Neznámý příkaz: "${command}"\n`);
      showHelp();
      process.exit(1);
  }
})();
