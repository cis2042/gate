// 國際化工具 - 簡化版本
const logger = require('./logger');

// 語言包
const translations = {
  'en-US': {
    'welcome.message': '🌍 Welcome to Twin Gate!\n\nHello *{name}*! Prove your humanity and earn your digital identity.\n\n🎯 What you\'ll get:\n🏆 Unique SBT (Soul Bound Token)\n📊 Humanity Index score (0-255)\n🔐 Verified digital identity\n\nChoose an option to get started:',
    'language.changed': '✅ Language changed to English',
    'general.unknown_command': '❓ I don\'t understand that command. Please use /help to see available commands.',
    'sbt.info': '🏆 *Your SBT Information*\n\nSoul Bound Token (SBT) represents your verified digital identity.\n\n📊 Status: Checking...\n🔗 Blockchain: BNB Smart Chain\n👤 Profile: Twin3.ai',
    'help.message': '❓ *Twin Gate Help*\n\n🤖 **Available Commands:**\n/verify - Start verification process\n/sbt - View your SBT and profile\n/help - Show this help message\n\n🌐 **About Twin3.ai:**\nTwin3.ai provides human identity verification using advanced AI technology.\n\n📚 **Resources:**\n• Website: https://twin3.ai\n• Documentation: https://docs.twin3.ai\n• Support: https://t.me/twin3support'
  },
  'zh-TW': {
    'welcome.message': '🌍 歡迎來到 Twin Gate！\n\n你好 *{name}*！證明你的人類身份並獲得數位身份。\n\n🎯 你將獲得：\n🏆 獨特的 SBT（靈魂綁定代幣）\n📊 人性指數評分（0-255）\n🔐 經過驗證的數位身份\n\n選擇一個選項開始：',
    'language.changed': '✅ 語言已更改為繁體中文',
    'general.unknown_command': '❓ 我不理解該命令。請使用 /help 查看可用命令。',
    'sbt.info': '🏆 *您的 SBT 信息*\n\n靈魂綁定代幣（SBT）代表您經過驗證的數位身份。\n\n📊 狀態：檢查中...\n🔗 區塊鏈：BNB 智能鏈\n👤 個人資料：Twin3.ai',
    'help.message': '❓ *Twin Gate 幫助*\n\n🤖 **可用命令：**\n/verify - 開始驗證流程\n/sbt - 查看您的 SBT 和個人資料\n/help - 顯示此幫助訊息\n\n🌐 **關於 Twin3.ai：**\nTwin3.ai 使用先進的 AI 技術提供人類身份驗證。\n\n📚 **資源：**\n• 網站：https://twin3.ai\n• 文檔：https://docs.twin3.ai\n• 支援：https://t.me/twin3support'
  },
  'zh-CN': {
    'welcome.message': '🌍 欢迎来到 Twin Gate！\n\n你好 *{name}*！证明你的人类身份并获得数字身份。\n\n🎯 你将获得：\n🏆 独特的 SBT（灵魂绑定代币）\n📊 人性指数评分（0-255）\n🔐 经过验证的数字身份\n\n选择一个选项开始：',
    'language.changed': '✅ 语言已更改为简体中文',
    'general.unknown_command': '❓ 我不理解该命令。请使用 /help 查看可用命令。',
    'sbt.info': '🏆 *您的 SBT 信息*\n\n灵魂绑定代币（SBT）代表您经过验证的数字身份。\n\n📊 状态：检查中...\n🔗 区块链：BNB 智能链\n👤 个人资料：Twin3.ai',
    'help.message': '❓ *Twin Gate 帮助*\n\n🤖 **可用命令：**\n/verify - 开始验证流程\n/sbt - 查看您的 SBT 和个人资料\n/help - 显示此帮助消息\n\n🌐 **关于 Twin3.ai：**\nTwin3.ai 使用先进的 AI 技术提供人类身份验证。\n\n📚 **资源：**\n• 网站：https://twin3.ai\n• 文档：https://docs.twin3.ai\n• 支持：https://t.me/twin3support'
  }
};

/**
 * 翻譯函數
 * @param {string} key - 翻譯鍵
 * @param {string} language - 語言代碼
 * @param {Object} params - 參數對象
 * @returns {string} 翻譯後的文本
 */
function t(key, language = 'en-US', params = {}) {
  try {
    // 獲取語言包
    const langPack = translations[language] || translations['en-US'];
    
    // 獲取翻譯文本
    let text = langPack[key];
    
    if (!text) {
      logger.warn(`Translation key not found: ${key} for language: ${language}`);
      // 回退到英文
      text = translations['en-US'][key] || key;
    }
    
    // 替換參數
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(param => {
        const placeholder = `{${param}}`;
        text = text.replace(new RegExp(placeholder, 'g'), params[param]);
      });
    }
    
    return text;
  } catch (error) {
    logger.error('Error in translation:', error);
    return key; // 返回原始鍵作為後備
  }
}

/**
 * 獲取支持的語言列表
 * @returns {Array} 支持的語言代碼數組
 */
function getSupportedLanguages() {
  return Object.keys(translations);
}

/**
 * 檢查語言是否支持
 * @param {string} language - 語言代碼
 * @returns {boolean} 是否支持
 */
function isLanguageSupported(language) {
  return translations.hasOwnProperty(language);
}

/**
 * 獲取語言的本地化名稱
 * @param {string} language - 語言代碼
 * @returns {string} 本地化名稱
 */
function getLanguageDisplayName(language) {
  const displayNames = {
    'en-US': '🇺🇸 English',
    'zh-TW': '🇹🇼 繁體中文',
    'zh-CN': '🇨🇳 简体中文',
    'ko-KR': '🇰🇷 한국어',
    'fr-FR': '🇫🇷 Français',
    'de-DE': '🇩🇪 Deutsch',
    'es-ES': '🇪🇸 Español',
    'ru-RU': '🇷🇺 Русский'
  };
  
  return displayNames[language] || language;
}

module.exports = {
  t,
  getSupportedLanguages,
  isLanguageSupported,
  getLanguageDisplayName
};
