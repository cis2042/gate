/**
 * 多語言支援系統
 * Twin Gate Telegram Bot Internationalization
 */

// 動態載入語言文件，避免錯誤
const languages = {};

// 安全載入語言文件
function loadLanguage(code, filename) {
  try {
    languages[code] = require(`./${filename}.json`);
  } catch (error) {
    console.warn(`Failed to load language file: ${filename}.json`);
    languages[code] = {}; // 提供空對象作為後備
  }
}

// 載入所有語言文件
loadLanguage('zh-TW', 'zh-TW');
loadLanguage('zh-CN', 'zh-CN');
loadLanguage('en-US', 'en-US');
loadLanguage('ja-JP', 'ja-JP');
loadLanguage('ko-KR', 'ko-KR');
loadLanguage('fr-FR', 'fr-FR');
loadLanguage('de-DE', 'de-DE');
loadLanguage('es-ES', 'es-ES');
loadLanguage('ru-RU', 'ru-RU');

const defaultLanguage = 'en-US';

/**
 * 獲取翻譯文本
 * @param {string} key - 翻譯鍵
 * @param {string} lang - 語言代碼
 * @param {object} params - 參數替換
 * @returns {string} 翻譯後的文本
 */
function t(key, lang = defaultLanguage, params = {}) {
  const langData = languages[lang] || languages[defaultLanguage];
  let text = getNestedValue(langData, key) || getNestedValue(languages[defaultLanguage], key) || key;

  // 參數替換
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  });

  return text;
}

/**
 * 獲取嵌套對象的值
 * @param {object} obj - 對象
 * @param {string} path - 路徑 (例如: 'welcome.title')
 * @returns {string|undefined} 值
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

/**
 * 獲取支援的語言列表
 * @returns {Array} 語言列表
 */
function getSupportedLanguages() {
  return [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'es-ES', name: 'Español' },
    { code: 'ru-RU', name: 'Русский' }
  ];
}

/**
 * 檢查語言是否支援
 * @param {string} lang - 語言代碼
 * @returns {boolean} 是否支援
 */
function isLanguageSupported(lang) {
  return Object.keys(languages).includes(lang);
}

/**
 * 獲取語言名稱
 * @param {string} lang - 語言代碼
 * @returns {string} 語言名稱
 */
function getLanguageName(lang) {
  const supportedLangs = getSupportedLanguages();
  const langInfo = supportedLangs.find(l => l.code === lang);
  return langInfo ? langInfo.name : lang;
}

module.exports = {
  t,
  getSupportedLanguages,
  isLanguageSupported,
  getLanguageName,
  defaultLanguage
};
