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
    const session = await getUserSession(ctx.from.id);
    const currentLanguage = session?.language || detectedLanguage;

    const message = t('language.choose', currentLanguage, { name: firstName });

    // 優先顯示檢測到的語言
    const primaryLanguages = [
      { code: detectedLanguage, name: this.getLanguageDisplayName(detectedLanguage), detected: true },
      { code: 'en-US', name: 'English', detected: false }
    ];

    // 其他常用語言
    const otherLanguages = [
      'zh-TW', 'zh-CN', 'ja-JP', 'es-ES', 'fr-FR', 'ar-SA', 'ru-RU'
    ].filter(lang => lang !== detectedLanguage && lang !== 'en-US')
     .map(code => ({ code, name: this.getLanguageDisplayName(code), detected: false }));

    const buttons = [];

    // 主要語言按鈕
    primaryLanguages.forEach(lang => {
      const text = lang.detected ? `✨ ${lang.name} (Detected)` : lang.name;
      buttons.push([Markup.button.callback(text, `lang_${lang.code}`)]);
    });

    // 分隔線
    const otherLanguagesText = t('language.other_languages', currentLanguage);
    buttons.push([Markup.button.callback(otherLanguagesText, 'show_more_languages')]);

    // 其他語言（折疊）
    if (session?.showAllLanguages) {
      otherLanguages.forEach(lang => {
        buttons.push([Markup.button.callback(lang.name, `lang_${lang.code}`)]);
      });
      const showLessText = t('language.show_less', currentLanguage);
      buttons.push([Markup.button.callback(showLessText, 'show_less_languages')]);
    }

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

    const welcomeMessage = t('welcome.message', language, { name: firstName });

    const buttons = [
      [Markup.button.callback(t('buttons.start_verification', language), 'start_verification')],
      [Markup.button.callback(t('buttons.language_settings', language), 'language_settings')]
    ];

    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
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
