const fs = require('fs/promises');
const path = require('path');
const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('../config/businessRules');

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales');
const cache = new Map();

// Anything unsupported or malformed (even ?lang[]=x) falls back to English.
function resolveLanguage(requested) {
  return typeof requested === 'string' && SUPPORTED_LANGUAGES.includes(requested) ? requested : DEFAULT_LANGUAGE;
}

async function loadLocale(language) {
  const lang = resolveLanguage(language);
  if (!cache.has(lang)) {
    const text = await fs.readFile(path.join(LOCALES_DIR, `${lang}.json`), 'utf8');
    cache.set(lang, JSON.parse(text));
  }
  return { lang, texts: cache.get(lang) };
}

function formatToday(lang, date = new Date()) {
  return new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(date);
}

module.exports = { resolveLanguage, loadLocale, formatToday };
