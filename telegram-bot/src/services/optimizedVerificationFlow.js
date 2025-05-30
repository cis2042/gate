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
    const message = `👋 Hi ${firstName}!\n\n🌍 We detected your language preference.\nChoose your preferred language:`;

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
    buttons.push([Markup.button.callback('➖ Other Languages ➖', 'show_more_languages')]);

    // 其他語言（折疊）
    const session = await getUserSession(ctx.from.id);
    if (session?.showAllLanguages) {
      otherLanguages.forEach(lang => {
        buttons.push([Markup.button.callback(lang.name, `lang_${lang.code}`)]);
      });
      buttons.push([Markup.button.callback('⬆️ Show Less', 'show_less_languages')]);
    }

    await ctx.reply(message, {
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  }

  /**
   * 用戶類型檢測和個性化設置
   */
  async detectUserProfile(ctx, language) {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || 'Friend';

    const profileMessage = t('profile.detection', language, { name: firstName }) || 
      `👋 Hi ${firstName}!\n\n🎯 To give you the best experience, what describes you best?`;

    const buttons = [
      [
        Markup.button.callback('🔰 New to crypto', 'profile_beginner'),
        Markup.button.callback('🔧 Tech expert', 'profile_expert')
      ],
      [
        Markup.button.callback('⚡ Quick & simple', 'profile_quick'),
        Markup.button.callback('📚 Detailed info', 'profile_detailed')
      ],
      [
        Markup.button.callback('👥 Social user', 'profile_social'),
        Markup.button.callback('🔒 Privacy focused', 'profile_privacy')
      ],
      [
        Markup.button.callback('⏭️ Skip profiling', 'profile_skip')
      ]
    ];

    await ctx.reply(profileMessage, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  }

  /**
   * 個性化驗證開始界面
   */
  async showPersonalizedVerificationStart(ctx, userProfile, language) {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || 'Friend';

    let message, buttons;

    switch (userProfile.type) {
      case 'beginner':
        message = this.getBeginnerMessage(firstName, language);
        buttons = this.getBeginnerButtons(language);
        break;
      
      case 'expert':
        message = this.getExpertMessage(firstName, language);
        buttons = this.getExpertButtons(language);
        break;
      
      case 'quick':
        message = this.getQuickMessage(firstName, language);
        buttons = this.getQuickButtons(language);
        break;
      
      default:
        message = this.getDefaultMessage(firstName, language);
        buttons = this.getDefaultButtons(language);
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  }

  /**
   * 新手友好的消息
   */
  getBeginnerMessage(firstName, language) {
    return `👋 Welcome ${firstName}!\n\n` +
      `🔐 **What is human verification?**\n` +
      `It's like proving you're a real person, not a computer program.\n\n` +
      `🎯 **Why do this?**\n` +
      `• Get a digital ID that proves you're human\n` +
      `• Access special features and services\n` +
      `• Join the verified human community\n\n` +
      `⏱️ **How long does it take?**\n` +
      `Just 5-10 minutes for basic verification\n\n` +
      `🔒 **Is it safe?**\n` +
      `Yes! Your data is encrypted and secure.\n\n` +
      `Ready to start? 👇`;
  }

  /**
   * 新手友好的按鈕
   */
  getBeginnerButtons(language) {
    return [
      [Markup.button.callback('🚀 Yes, let\'s start!', 'start_verification_guided')],
      [Markup.button.callback('❓ Tell me more first', 'show_more_info')],
      [Markup.button.callback('🔧 Switch to expert mode', 'switch_to_expert')]
    ];
  }

  /**
   * 專家模式的消息
   */
  getExpertMessage(firstName, language) {
    return `🔧 **Expert Mode** - ${firstName}\n\n` +
      `📊 **Verification Levels:**\n` +
      `• Level 1: reCAPTCHA (50-80 points)\n` +
      `• Level 2: SMS verification (80-150 points)\n` +
      `• Level 3: Biometric auth (120-200 points)\n\n` +
      `🏆 **SBT Minting:** Available after Level 2\n` +
      `🔗 **Blockchain:** BNB Smart Chain\n` +
      `📈 **Humanity Index:** 0-255 scoring system\n\n` +
      `⚡ **Quick Actions:**`;
  }

  /**
   * 專家模式的按鈕
   */
  getExpertButtons(language) {
    return [
      [
        Markup.button.callback('🟢 Level 1', 'start_level_1'),
        Markup.button.callback('🟡 Level 2', 'start_level_2'),
        Markup.button.callback('🔴 Level 3', 'start_level_3')
      ],
      [
        Markup.button.callback('📊 View API docs', 'view_api_docs'),
        Markup.button.callback('🔧 Developer tools', 'developer_tools')
      ],
      [
        Markup.button.callback('🔰 Switch to simple mode', 'switch_to_beginner')
      ]
    ];
  }

  /**
   * 快速模式的消息
   */
  getQuickMessage(firstName, language) {
    return `⚡ **Quick Verification** - ${firstName}\n\n` +
      `🎯 **Goal:** Get verified as fast as possible\n` +
      `⏱️ **Time:** ~5 minutes total\n` +
      `🏆 **Result:** Digital identity + SBT\n\n` +
      `**3 Simple Steps:**\n` +
      `1️⃣ Prove you're not a robot (1 min)\n` +
      `2️⃣ Verify phone number (2 min)\n` +
      `3️⃣ Get your digital ID (2 min)\n\n` +
      `Ready for express verification? 👇`;
  }

  /**
   * 快速模式的按鈕
   */
  getQuickButtons(language) {
    return [
      [Markup.button.callback('🚀 Start Express Verification', 'start_express_verification')],
      [Markup.button.callback('📋 Show detailed steps', 'show_detailed_steps')],
      [Markup.button.callback('⚙️ Customize verification', 'customize_verification')]
    ];
  }

  /**
   * 默認消息
   */
  getDefaultMessage(firstName, language) {
    return t('verification.start_message', language, { name: firstName }) ||
      `🌍 Welcome to Twin Gate, ${firstName}!\n\nProve your humanity and earn your digital identity.`;
  }

  /**
   * 默認按鈕
   */
  getDefaultButtons(language) {
    return [
      [Markup.button.callback('🚀 Start Verification', 'start_verification')],
      [Markup.button.callback('🌍 Language Settings', 'language_settings')]
    ];
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

  /**
   * 保存用戶個性化設定
   */
  async saveUserProfile(userId, profileData) {
    this.userProfiles.set(userId, {
      ...profileData,
      timestamp: Date.now()
    });
    
    await updateUserSession(userId, { profile: profileData });
  }

  /**
   * 獲取用戶個性化設定
   */
  getUserProfile(userId) {
    return this.userProfiles.get(userId);
  }
}

// 創建單例實例
const optimizedVerificationFlow = new OptimizedVerificationFlow();

module.exports = optimizedVerificationFlow;
