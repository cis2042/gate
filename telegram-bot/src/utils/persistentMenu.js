/**
 * 常駐選單系統
 * Persistent Menu System for Twin Gate Bot
 */

const { Markup } = require('telegraf');
const { t } = require('../locales');

/**
 * 創建主選單
 * @param {string} language - 語言代碼
 * @param {object} userStatus - 使用者狀態
 * @returns {object} 鍵盤標記
 */
function createMainMenu(language = 'zh-TW', userStatus = {}) {
  const { verificationLevel = 0, isVerified = false, sbtEligible = false } = userStatus;

  const buttons = [
    [
      Markup.button.callback(
        '🚀 開始驗證',
        'start_verification'
      )
    ],
    [
      Markup.button.callback(
        '🌐 語言設定',
        'menu_language'
      )
    ]
  ];

  return Markup.inlineKeyboard(buttons);
}

/**
 * 創建驗證等級選單
 * @param {string} language - 語言代碼
 * @param {number} completedLevel - 已完成的等級
 * @param {number} currentLevel - 當前可進行的等級
 * @returns {object} 鍵盤標記
 */
function createVerificationLevelMenu(language = 'zh-TW', completedLevel = 0, currentLevel = 1) {
  const buttons = [];

  // Level 1
  const level1Status = getLevelStatus(1, completedLevel, currentLevel);
  buttons.push([
    Markup.button.callback(
      `${level1Status.emoji} Level 1 - ${t('verification.level1.title', language)} ${level1Status.text}`,
      level1Status.enabled ? 'verify_level_1' : 'level_disabled'
    )
  ]);

  // Level 2
  const level2Status = getLevelStatus(2, completedLevel, currentLevel);
  buttons.push([
    Markup.button.callback(
      `${level2Status.emoji} Level 2 - ${t('verification.level2.title', language)} ${level2Status.text}`,
      level2Status.enabled ? 'verify_level_2' : 'level_disabled'
    )
  ]);

  // Level 3
  const level3Status = getLevelStatus(3, completedLevel, currentLevel);
  buttons.push([
    Markup.button.callback(
      `${level3Status.emoji} Level 3 - ${t('verification.level3.title', language)} ${level3Status.text}`,
      level3Status.enabled ? 'verify_level_3' : 'level_disabled'
    )
  ]);

  // 返回主選單按鈕
  buttons.push([
    Markup.button.callback(
      `🔙 ${t('buttons.back_to_main', language)}`,
      'back_to_main'
    )
  ]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * 獲取等級狀態
 * @param {number} level - 等級
 * @param {number} completedLevel - 已完成等級
 * @param {number} currentLevel - 當前可進行等級
 * @returns {object} 等級狀態
 */
function getLevelStatus(level, completedLevel, currentLevel) {
  if (level <= completedLevel) {
    return {
      emoji: '✅',
      text: '(已完成)',
      enabled: false
    };
  } else if (level === currentLevel) {
    return {
      emoji: '🟡',
      text: '(可進行)',
      enabled: true
    };
  } else {
    return {
      emoji: '🔒',
      text: '(需先完成前一等級)',
      enabled: false
    };
  }
}

/**
 * 獲取驗證狀態文字
 * @param {number} level - 已完成等級
 * @param {string} language - 語言
 * @returns {string} 狀態文字
 */
function getVerificationStatusText(level, language) {
  if (level === 0) {
    return '(未開始)';
  } else if (level === 3) {
    return '(全部完成 ✅)';
  } else {
    return `(已完成 Level ${level})`;
  }
}

/**
 * 創建驗證進行中選單
 * @param {string} language - 語言代碼
 * @param {number} level - 當前驗證等級
 * @param {string} verificationUrl - 驗證鏈接
 * @returns {object} 鍵盤標記
 */
function createVerificationInProgressMenu(language, level, verificationUrl) {
  return Markup.inlineKeyboard([
    [Markup.button.url(`🌐 完成 Level ${level} 驗證`, verificationUrl)],
    [
      Markup.button.callback(
        `🔙 返回驗證選單`,
        'back_to_verification'
      )
    ]
  ]);
}

/**
 * 創建語言選擇選單
 * @param {array} languages - 支援的語言列表
 * @returns {object} 鍵盤標記
 */
function createLanguageMenu(languages) {
  const buttons = [];

  for (let i = 0; i < languages.length; i += 2) {
    const row = [];
    const lang1 = languages[i];
    const lang2 = languages[i + 1];

    row.push(Markup.button.callback(lang1.name, `lang_${lang1.code}`));
    if (lang2) {
      row.push(Markup.button.callback(lang2.name, `lang_${lang2.code}`));
    }
    buttons.push(row);
  }

  buttons.push([
    Markup.button.callback(`🔙 ${t('buttons.back_to_main', language)}`, 'back_to_main')
  ]);

  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  createMainMenu,
  createVerificationLevelMenu,
  createVerificationInProgressMenu,
  createLanguageMenu,
  getLevelStatus,
  getVerificationStatusText
};
