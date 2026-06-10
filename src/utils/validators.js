/**
 * Ověří, že URL je bezpečná – pouze http/https, žádné javascript: nebo data: schémata
 */
function validateUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  // Povolíme pouze http:// a https://
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return trimmed;
  } catch {
    // Relativní URL (začíná /) – povolíme
    if (trimmed.startsWith('/')) return trimmed;
    return '';
  }
}

/**
 * Ověří, že hodnota je platné číslo (ne NaN, ne null/undefined)
 */
function validateNumeric(value, defaultValue = 0) {
  const num = Number(value);
  if (value === null || value === undefined || value === '' || isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * Základní validace e-mailu
 */
function validateEmail(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) return '';
  return trimmed;
}

/**
 * Ověří sílu hesla – min 12 znaků, alespoň 1 velké, 1 malé, 1 číslo, 1 speciální znak
 * Vrací pole chybových hlášek (prázdné = validní)
 */
function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 12) {
    errors.push('Heslo musí mít alespoň 12 znaků.');
    return errors;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Heslo musí obsahovat alespoň jedno velké písmeno.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Heslo musí obsahovat alespoň jedno malé písmeno.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Heslo musí obsahovat alespoň jednu číslici.');
  }

  if (!/[!@#$%^&*()_\-+={}[\]\\|;:'",.<>/?`~]/.test(password)) {
    errors.push('Heslo musí obsahovat alespoň jeden speciální znak.');
  }

  return errors;
}

/**
 * Zkontroluje magic bytes souboru pro ověření skutečného typu (nejen MIME)
 * Vrací { valid: boolean, reason?: string }
 */
function checkFileMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) {
    return { valid: false, reason: 'Soubor je příliš malý.' };
  }

  const header = buffer.slice(0, 8).toString('hex').toUpperCase();

  // JPEG: FF D8 FF
  if (header.startsWith('FFD8FF')) {
    return { valid: true };
  }

  // PNG: 89 50 4E 47
  if (header.startsWith('89504E47')) {
    return { valid: true };
  }

  // GIF: 47 49 46 38 37/39 61
  if (header.startsWith('47494638')) {
    return { valid: true };
  }

  // WebP: 52 49 46 46 .... 57 45 42 50
  if (header.startsWith('52494646') && header.slice(16, 24) === '57454250') {
    return { valid: true };
  }

  // PDF: 25 50 44 46
  if (header.startsWith('25504446')) {
    return { valid: true };
  }

  return { valid: false, reason: 'Typ souboru není povolen.' };
}

module.exports = { validateUrl, validatePassword, checkFileMagicBytes, validateNumeric, validateEmail };
