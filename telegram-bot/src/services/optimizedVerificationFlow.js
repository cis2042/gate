// 優化的驗證流程服務 - 用戶友好版本
const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/userSession');
const { t } = require('../utils/i18n');

// 簡化的 Markup 替代
const Markup = {
  button: {
    callback: (text, data) => ({ text, callback_data: data }),
    url: (text, url) => ({ text, url })
  },
  inlineKeyboard: (buttons) => ({ inline_keyboard: buttons })
};

class OptimizedVerificationFlow {
  constructor() {
    this.userProfiles = new Map(); // 用戶個性化設定
  }

  /**
   * 智能歡迎流程 - 根據用戶類型個性化
   */
  async handleSmartWelcome(ctx) {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || 'Friend';

    // 檢測用戶語言偏好
    const detectedLanguage = this.detectUserLanguage(ctx);

    // 顯示智能語言選擇
    return await this.showSmartLanguageSelection(ctx, firstName, detectedLanguage);
  }

  /**
   * 檢測用戶語言偏好
   */
  detectUserLanguage(ctx) {
    // 從 Telegram 語言代碼檢測
    const telegramLang = ctx.from.language_code;

    const langMap = {
      'zh': 'zh-TW',
      'zh-cn': 'zh-CN',
      'zh-tw': 'zh-TW',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'ar': 'ar-SA',
      'ru': 'ru-RU',
      'hi': 'hi-IN',
      'pt': 'pt-BR'
    };

    return langMap[telegramLang] || 'en-US';
  }

  /**
   * 智能語言選擇 - 優先顯示檢測到的語言
   */
  async showSmartLanguageSelection(ctx, firstName, detectedLanguage) {
    const message = `👋 Hi ${firstName}!\n\n🌍 Choose your preferred language:`;

    const buttons = [
      [Markup.button.callback('✨ 繁體中文 (Detected)', 'lang_zh-TW')],
      [Markup.button.callback('English', 'lang_en-US')],
      [Markup.button.callback('简体中文', 'lang_zh-CN')],
      [Markup.button.callback('日本語', 'lang_ja-JP')],
      [Markup.button.callback('Español', 'lang_es-ES')]
    ];

    await ctx.reply(message, {
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  }

  /**
   * 簡化的歡迎界面 - 直接進入驗證
   */
  async showSimpleWelcome(ctx, language) {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || 'Friend';

    // 簡化消息，避免 Markdown 錯誤
    const welcomeMessage = `🌍 Welcome to Twin Gate!\n\nHello ${firstName}! Prove your humanity and earn your digital identity.`;

    const buttons = [
      [Markup.button.callback('🚀 Start Verification', 'start_verification')],
      [Markup.button.callback('🌍 Language Settings', 'language_settings')]
    ];

    await ctx.reply(welcomeMessage, {
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  }





  /**
   * 獲取語言顯示名稱
   */
  getLanguageDisplayName(language) {
    const displayNames = {
      'en-US': 'English',
      'zh-TW': '繁體中文',
      'zh-CN': '简体中文',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
      'fr-FR': 'Français',
      'de-DE': 'Deutsch',
      'es-ES': 'Español',
      'ru-RU': 'Русский',
      'ar-SA': 'العربية',
      'hi-IN': 'हिन्दी',
      'pt-BR': 'Português'
    };

    return displayNames[language] || language;
  }


}

// 創建單例實例
const optimizedVerificationFlow = new OptimizedVerificationFlow();

module.exports = optimizedVerificationFlow;
