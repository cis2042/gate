// 國際化工具 - 簡化版本
const logger = require('./logger');

// 語言包 - 擴展版本
const translations = {
  'en-US': {
    'welcome.message': '🌍 Welcome to Twin Gate!\n\nHello *{name}*! Prove your humanity and earn your digital identity.\n\n🎯 What you\'ll get:\n🏆 Unique SBT (Soul Bound Token)\n📊 Humanity Index score (0-255)\n🔐 Verified digital identity\n\nChoose an option to get started:',
    'language.changed': '✅ Language changed to English',
    'general.unknown_command': '❓ I don\'t understand that command. Please use /help to see available commands.',
    'sbt.info': '🏆 *Your SBT Information*\n\nSoul Bound Token (SBT) represents your verified digital identity.\n\n📊 Status: Checking...\n🔗 Blockchain: BNB Smart Chain\n👤 Profile: Twin3.ai',
    'help.message': '❓ *Twin Gate Help*\n\n🤖 **Available Commands:**\n/verify - Start verification process\n/sbt - View your SBT and profile\n/help - Show this help message\n\n🌐 **About Twin3.ai:**\nTwin3.ai provides human identity verification using advanced AI technology.\n\n📚 **Resources:**\n• Website: https://twin3.ai\n• Documentation: https://docs.twin3.ai\n• Support: https://t.me/twin3support',

    // 按鈕翻譯
    'buttons.start_verification': '🚀 Start Verification',
    'buttons.language_settings': '🌍 Language Settings',
    'buttons.continue_verification': '🚀 Continue Verification',
    'buttons.main_menu': '🔙 Main Menu',
    'buttons.show_progress': '📊 Show Progress',
    'buttons.view_sbt': '🏆 View SBT',
    'buttons.help': '❓ Help',

    // 語言選擇
    'language.choose': '👋 Hi {name}!\n\n🌍 We detected your language preference.\nChoose your preferred language:',
    'language.other_languages': '➖ Other Languages ➖',
    'language.show_less': '⬆️ Show Less',

    // 進度相關
    'progress.title': '📊 **Verification Progress**',
    'progress.overall': '**Overall Progress:** {percent}%',
    'progress.levels': '{current}/{total} levels',
    'progress.humanity_index': '**Humanity Index:** {score}/255',
    'progress.next_step': '🎯 **Next:** Complete Level {level} to unlock SBT minting',

    // 驗證等級
    'level.1.title': 'Level 1 - Basic verification',
    'level.2.title': 'Level 2 - Phone verification',
    'level.3.title': 'Level 3 - Advanced verification',
    'level.completed': '✅',
    'level.pending': '⭕',
    'level.locked': '🔒',

    // 驗證流程
    'verification.task_description': 'Prove your humanity and earn your digital identity.',
    'verification.task_info': 'Complete Level 2 or above to mint SBT.',
    'verification.current_level': 'Current Level',
    'verification.choose_level': 'Choose verification level',
    'verification.requirement': 'Need to complete Level 2 or above to mint SBT.',
    'verification.level1.button': 'Level 1 - Basic verification',
    'verification.level1.completed': 'Level 1 - Completed',
    'verification.level1.title': 'Basic verification',
    'verification.level2.button': 'Level 2 - Phone verification',
    'verification.level2.completed': 'Level 2 - Completed',
    'verification.level2.locked': 'Level 2 - Need to complete Level 1',
    'verification.level2.title': 'Phone verification',
    'verification.level3.button': 'Level 3 - Advanced verification',
    'verification.level3.completed': 'Level 3 - Completed',
    'verification.level3.locked': 'Level 3 - Need to complete Level 2',
    'verification.level3.title': 'Advanced verification',

    // 按鈕
    'buttons.mint_sbt': '🏆 Mint SBT',
    'buttons.sbt_management': '🏆 SBT Management'
  },
  'zh-TW': {
    'welcome.message': '🌍 歡迎來到 Twin Gate！\n\n你好 *{name}*！證明你的人類身份並獲得數位身份。\n\n🎯 你將獲得：\n🏆 獨特的 SBT（靈魂綁定代幣）\n📊 人性指數評分（0-255）\n🔐 經過驗證的數位身份\n\n選擇一個選項開始：',
    'language.changed': '✅ 語言已更改為繁體中文',
    'general.unknown_command': '❓ 我不理解該命令。請使用 /help 查看可用命令。',
    'sbt.info': '🏆 *您的 SBT 信息*\n\n靈魂綁定代幣（SBT）代表您經過驗證的數位身份。\n\n📊 狀態：檢查中...\n🔗 區塊鏈：BNB 智能鏈\n👤 個人資料：Twin3.ai',
    'help.message': '❓ *Twin Gate 幫助*\n\n🤖 **可用命令：**\n/verify - 開始驗證流程\n/sbt - 查看您的 SBT 和個人資料\n/help - 顯示此幫助訊息\n\n🌐 **關於 Twin3.ai：**\nTwin3.ai 使用先進的 AI 技術提供人類身份驗證。\n\n📚 **資源：**\n• 網站：https://twin3.ai\n• 文檔：https://docs.twin3.ai\n• 支援：https://t.me/twin3support',

    // 按鈕翻譯
    'buttons.start_verification': '🚀 開始驗證',
    'buttons.language_settings': '🌍 語言設定',
    'buttons.continue_verification': '🚀 繼續驗證',
    'buttons.main_menu': '🔙 主選單',
    'buttons.show_progress': '📊 查看進度',
    'buttons.view_sbt': '🏆 查看 SBT',
    'buttons.help': '❓ 幫助',

    // 語言選擇
    'language.choose': '👋 你好 {name}！\n\n🌍 我們偵測到您的語言偏好。\n請選擇您偏好的語言：',
    'language.other_languages': '➖ 其他語言 ➖',
    'language.show_less': '⬆️ 顯示較少',

    // 進度相關
    'progress.title': '📊 **驗證進度**',
    'progress.overall': '**整體進度：** {percent}%',
    'progress.levels': '{current}/{total} 等級',
    'progress.humanity_index': '**人性指數：** {score}/255',
    'progress.next_step': '🎯 **下一步：** 完成 Level {level} 以解鎖 SBT 鑄造',

    // 驗證等級
    'level.1.title': 'Level 1 - 基礎驗證',
    'level.2.title': 'Level 2 - 手機驗證',
    'level.3.title': 'Level 3 - 高級驗證',
    'level.completed': '✅',
    'level.pending': '⭕',
    'level.locked': '🔒',

    // 驗證流程
    'verification.task_description': '證明您的人類身份並獲得數位身份驗證。',
    'verification.task_info': '完成 Level 2 以上才能鑄造 SBT。',
    'verification.current_level': '當前等級',
    'verification.choose_level': '選擇驗證等級',
    'verification.requirement': '需要完成 Level 2 以上才能鑄造 SBT。',
    'verification.level1.button': 'Level 1 - 基礎驗證',
    'verification.level1.completed': 'Level 1 - 已完成',
    'verification.level1.title': '基礎驗證',
    'verification.level2.button': 'Level 2 - 手機驗證',
    'verification.level2.completed': 'Level 2 - 已完成',
    'verification.level2.locked': 'Level 2 - 需要完成 Level 1',
    'verification.level2.title': '手機驗證',
    'verification.level3.button': 'Level 3 - 高級驗證',
    'verification.level3.completed': 'Level 3 - 已完成',
    'verification.level3.locked': 'Level 3 - 需要完成 Level 2',
    'verification.level3.title': '高級驗證',

    // 按鈕
    'buttons.mint_sbt': '🏆 鑄造 SBT',
    'buttons.sbt_management': '🏆 SBT 管理'
  },
  'zh-CN': {
    'welcome.message': '🌍 欢迎来到 Twin Gate！\n\n你好 *{name}*！证明你的人类身份并获得数字身份。\n\n🎯 你将获得：\n🏆 独特的 SBT（灵魂绑定代币）\n📊 人性指数评分（0-255）\n🔐 经过验证的数字身份\n\n选择一个选项开始：',
    'language.changed': '✅ 语言已更改为简体中文',
    'general.unknown_command': '❓ 我不理解该命令。请使用 /help 查看可用命令。',
    'sbt.info': '🏆 *您的 SBT 信息*\n\n灵魂绑定代币（SBT）代表您经过验证的数字身份。\n\n📊 状态：检查中...\n🔗 区块链：BNB 智能链\n👤 个人资料：Twin3.ai',
    'help.message': '❓ *Twin Gate 帮助*\n\n🤖 **可用命令：**\n/verify - 开始验证流程\n/sbt - 查看您的 SBT 和个人资料\n/help - 显示此帮助消息\n\n🌐 **关于 Twin3.ai：**\nTwin3.ai 使用先进的 AI 技术提供人类身份验证。\n\n📚 **资源：**\n• 网站：https://twin3.ai\n• 文档：https://docs.twin3.ai\n• 支持：https://t.me/twin3support'
  },

  // 新增語言支援
  'ja-JP': {
    'welcome.simple': '👋 こんにちは {name}さん！\n\n🔐 人間であることを証明\n⏱️ 5-10分かかります\n🏆 デジタルIDを取得\n\n👇 まず言語を選択：',
    'language.changed': '✅ 言語が日本語に変更されました',
    'sbt.explanation': 'SBT = ソウルバウンドトークン\nあなたが人間であることを証明するユニークなデジタルID',
    'level.1.simple': 'レベル1：ロボットでないことを証明',
    'level.2.simple': 'レベル2：電話番号で認証',
    'level.3.simple': 'レベル3：高度な認証'
  },

  'es-ES': {
    'welcome.simple': '👋 ¡Hola {name}!\n\n🔐 Demuestra que eres humano\n⏱️ Toma 5-10 minutos\n🏆 Obtén identidad digital\n\n👇 Elige tu idioma primero:',
    'language.changed': '✅ Idioma cambiado a español',
    'sbt.explanation': 'SBT = Token Vinculado al Alma\nTu ID digital única que prueba que eres humano',
    'level.1.simple': 'Nivel 1: Demuestra que no eres un robot',
    'level.2.simple': 'Nivel 2: Verifica con número de teléfono',
    'level.3.simple': 'Nivel 3: Verificación avanzada'
  },

  'fr-FR': {
    'welcome.simple': '👋 Salut {name}!\n\n🔐 Prouvez que vous êtes humain\n⏱️ Prend 5-10 minutes\n🏆 Obtenez une identité numérique\n\n👇 Choisissez votre langue d\'abord:',
    'language.changed': '✅ Langue changée en français',
    'sbt.explanation': 'SBT = Token Lié à l\'Âme\nVotre ID numérique unique qui prouve que vous êtes humain',
    'level.1.simple': 'Niveau 1: Prouvez que vous n\'êtes pas un robot',
    'level.2.simple': 'Niveau 2: Vérifiez avec le numéro de téléphone',
    'level.3.simple': 'Niveau 3: Vérification avancée'
  },

  'ar-SA': {
    'welcome.simple': '👋 مرحبا {name}!\n\n🔐 أثبت أنك إنسان\n⏱️ يستغرق 5-10 دقائق\n🏆 احصل على هوية رقمية\n\n👇 اختر لغتك أولاً:',
    'language.changed': '✅ تم تغيير اللغة إلى العربية',
    'sbt.explanation': 'SBT = رمز مرتبط بالروح\nهويتك الرقمية الفريدة التي تثبت أنك إنسان',
    'level.1.simple': 'المستوى 1: أثبت أنك لست روبوت',
    'level.2.simple': 'المستوى 2: التحقق برقم الهاتف',
    'level.3.simple': 'المستوى 3: التحقق المتقدم'
  },

  'ru-RU': {
    'welcome.simple': '👋 Привет {name}!\n\n🔐 Докажите, что вы человек\n⏱️ Займет 5-10 минут\n🏆 Получите цифровую личность\n\n👇 Сначала выберите язык:',
    'language.changed': '✅ Язык изменен на русский',
    'sbt.explanation': 'SBT = Токен, Привязанный к Душе\nВаш уникальный цифровой ID, который доказывает, что вы человек',
    'level.1.simple': 'Уровень 1: Докажите, что вы не робот',
    'level.2.simple': 'Уровень 2: Подтвердите номером телефона',
    'level.3.simple': 'Уровень 3: Расширенная проверка'
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

module.exports = {
  t,
  getSupportedLanguages,
  isLanguageSupported,
  getLanguageDisplayName
};
