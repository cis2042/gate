// 最簡單的測試 Bot
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN || '7151382731:AAFYJY3_mt5fjQV0S2lKylYsJZMVsvby4j4';

console.log('🤖 Starting simple test bot...');

// 創建 Bot
const bot = new TelegramBot(token, { polling: true });

// 創建 Express 服務器
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: 'simple-test-bot',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 啟動服務器
app.listen(port, '0.0.0.0', () => {
  console.log(`🌐 HTTP server listening on port ${port}`);
});

// Bot 事件處理
// 用戶會話存儲
const userSessions = new Map();

// 獲取用戶會話
function getUserSession(userId) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      language: 'en-US',
      verificationLevel: 0,
      humanityIndex: 0,
      level1Completed: false,
      level2Completed: false,
      level3Completed: false,
      hasSBT: false
    });
  }
  return userSessions.get(userId);
}

// 更新用戶會話
function updateUserSession(userId, updates) {
  const session = getUserSession(userId);
  Object.assign(session, updates);
  userSessions.set(userId, session);
}

// 翻譯函數
function t(key, language, params = {}) {
  const translations = {
    'en-US': {
      'welcome.message': '🌍 Welcome to Twin Gate!\n\nHello *{name}*! Prove your humanity and earn your digital identity.\n\n🎯 What you\'ll get:\n🏆 Unique SBT (Soul Bound Token)\n📊 Humanity Index score (0-255)\n🔐 Verified digital identity',
      'language.changed': '✅ Language changed to English',
      'buttons.start_verification': '🚀 Start Verification',
      'buttons.language_settings': '🌍 Language Settings',
      'language.choose': '👋 Hi {name}!\n\n🌍 Choose your preferred language:'
    },
    'zh-TW': {
      'welcome.message': '🌍 歡迎來到 Twin Gate！\n\n你好 *{name}*！證明你的人類身份並獲得數位身份。\n\n🎯 你將獲得：\n🏆 獨特的 SBT（靈魂綁定代幣）\n📊 人性指數評分（0-255）\n🔐 經過驗證的數位身份',
      'language.changed': '✅ 語言已更改為繁體中文',
      'buttons.start_verification': '🚀 開始驗證',
      'buttons.language_settings': '🌍 語言設定',
      'language.choose': '👋 你好 {name}！\n\n🌍 請選擇您偏好的語言：'
    }
  };

  let text = translations[language]?.[key] || translations['en-US']?.[key] || key;

  // 替換參數
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
  });

  return text;
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  console.log(`📝 Received message: ${text} from ${userId}`);

  if (text === '/start') {
    await handleStartCommand(chatId, userId, msg.from);
  } else if (text === '/verify') {
    await handleVerifyCommand(chatId, userId, msg.from);
  } else if (text === '/sbt') {
    await handleSbtCommand(chatId, userId, msg.from);
  } else if (text === '/help') {
    await handleHelpCommand(chatId, userId, msg.from);
  } else {
    const session = getUserSession(userId);
    const language = session.language;
    await bot.sendMessage(chatId, '❓ Unknown command. Please use /help to see available commands.');
  }
});

// 處理 /start 命令
async function handleStartCommand(chatId, userId, user) {
  const session = getUserSession(userId);
  const firstName = user.first_name || 'Friend';

  // 如果用戶還沒選擇語言，顯示語言選擇
  if (!session.languageSelected) {
    const message = `👋 Hi ${firstName}!\n\n🌍 Welcome to Twin Gate! Choose your preferred language:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✨ 繁體中文', callback_data: 'lang_zh-TW' },
          { text: 'English', callback_data: 'lang_en-US' }
        ],
        [
          { text: '简体中文', callback_data: 'lang_zh-CN' },
          { text: '日本語', callback_data: 'lang_ja-JP' }
        ],
        [
          { text: 'Español', callback_data: 'lang_es-ES' },
          { text: 'Français', callback_data: 'lang_fr-FR' }
        ]
      ]
    };

    await bot.sendMessage(chatId, message, { reply_markup: keyboard });
  } else {
    // 顯示主歡迎界面
    await showMainWelcome(chatId, userId, user);
  }
}

// 顯示主歡迎界面
async function showMainWelcome(chatId, userId, user) {
  const session = getUserSession(userId);
  const language = session.language;
  const firstName = user.first_name || 'Friend';

  const welcomeMessage = t('welcome.message', language, { name: firstName });

  const keyboard = {
    inline_keyboard: [
      [
        { text: t('buttons.start_verification', language), callback_data: 'start_verification' }
      ],
      [
        { text: t('buttons.language_settings', language), callback_data: 'language_settings' }
      ]
    ]
  };

  await bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
}

// 處理其他命令
async function handleVerifyCommand(chatId, userId, user) {
  await showVerificationFlow(chatId, userId, user);
}

async function handleSbtCommand(chatId, userId, user) {
  const session = getUserSession(userId);
  const language = session.language;

  if (!session.hasSBT) {
    const message = `🏆 SBT (Soul Bound Token)\n\n❌ 您還沒有 SBT\n\n需要完成 Level 2 以上的驗證才能獲得 SBT。\n\n請先完成驗證流程。`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚀 開始驗證', callback_data: 'start_verification' }
        ],
        [
          { text: '🔙 主選單', callback_data: 'main_menu' }
        ]
      ]
    };

    await bot.sendMessage(chatId, message, { reply_markup: keyboard });
  } else {
    // 顯示 SBT 信息
    const message = `🏆 您的 SBT (Soul Bound Token)\n\n✅ SBT 狀態：已鑄造\n📊 人性指數：${session.humanityIndex}/255\n🎯 驗證等級：Level ${session.verificationLevel}\n\n🔗 區塊鏈記錄：\n• 網絡：BNB Smart Chain\n• 合約：0x1234...abcd\n• Token ID：#${userId.toString().slice(-4)}\n\n👤 Twin3 個人頁面：\nhttps://twin3.ai/profile/${userId}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔗 查看 BNB Scan', url: `https://bscscan.com/token/0x1234567890abcdef#${userId}` },
          { text: '👤 Twin3 Profile', url: `https://twin3.ai/profile/${userId}` }
        ],
        [
          { text: '📊 查看進度', callback_data: 'show_progress' }
        ],
        [
          { text: '🔙 主選單', callback_data: 'main_menu' }
        ]
      ]
    };

    await bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }
}

async function handleHelpCommand(chatId, userId, user) {
  const helpMessage = `❓ Twin Gate Help\n\n🤖 Available Commands:\n/verify - Start verification process\n/sbt - View your SBT and profile\n/help - Show this help message\n\n🌐 About Twin3.ai:\nTwin3.ai provides human identity verification using advanced AI technology.`;

  await bot.sendMessage(chatId, helpMessage);
}

// 回調處理
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;

  await bot.answerCallbackQuery(callbackQuery.id);

  try {
    if (action.startsWith('lang_')) {
      // 處理語言選擇
      const language = action.replace('lang_', '');
      await setUserLanguage(chatId, userId, language, callbackQuery.from);
    } else if (action === 'start_verification') {
      // 開始驗證流程
      await showVerificationFlow(chatId, userId, callbackQuery.from);
    } else if (action === 'language_settings') {
      // 顯示語言設置
      await showLanguageSettings(chatId, userId);
    } else if (action === 'main_menu') {
      // 返回主選單
      await showMainWelcome(chatId, userId, callbackQuery.from);
    } else if (action.startsWith('level_')) {
      // 處理驗證等級選擇
      const level = action.replace('level_', '');
      await handleLevelVerification(chatId, userId, level, callbackQuery.from);
    } else if (action === 'show_progress') {
      // 顯示進度
      await showVerificationProgress(chatId, userId);
    }
  } catch (error) {
    console.error('❌ Callback error:', error);
    await bot.sendMessage(chatId, '❌ 處理請求時發生錯誤，請稍後再試。');
  }
});

// 設置用戶語言
async function setUserLanguage(chatId, userId, language, user) {
  updateUserSession(userId, {
    language: language,
    languageSelected: true
  });

  const confirmText = t('language.changed', language);
  await bot.sendMessage(chatId, confirmText);

  // 顯示主歡迎界面
  setTimeout(async () => {
    await showMainWelcome(chatId, userId, user);
  }, 1000);
}

// 顯示語言設置
async function showLanguageSettings(chatId, userId) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: 'English', callback_data: 'lang_en-US' },
        { text: '繁體中文', callback_data: 'lang_zh-TW' }
      ],
      [
        { text: '简体中文', callback_data: 'lang_zh-CN' },
        { text: '日本語', callback_data: 'lang_ja-JP' }
      ],
      [
        { text: 'Español', callback_data: 'lang_es-ES' },
        { text: 'Français', callback_data: 'lang_fr-FR' }
      ],
      [
        { text: '🔙 Back', callback_data: 'main_menu' }
      ]
    ]
  };

  await bot.sendMessage(chatId, '🌍 Please select your language:', {
    reply_markup: keyboard
  });
}

// 顯示驗證流程
async function showVerificationFlow(chatId, userId, user) {
  const session = getUserSession(userId);
  const language = session.language;

  const message = `**Task #001**\n\n**Proof of Humanity**\n\n證明您的人類身份並獲得數位身份驗證。\n\n**當前等級:**\n${session.level1Completed ? '✅' : '⭕'} Level 1 - 基礎驗證\n${session.level2Completed ? '✅' : '⭕'} Level 2 - 手機驗證\n${session.level3Completed ? '✅' : '⭕'} Level 3 - 高級驗證\n\n需要完成 Level 2 以上才能鑄造 SBT。\n\n👇 **選擇驗證等級:**`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: session.level1Completed ? '✅ Level 1 - 已完成' : '🟢 Level 1 - 基礎驗證',
          callback_data: 'level_1'
        }
      ],
      [
        {
          text: session.level1Completed ?
            (session.level2Completed ? '✅ Level 2 - 已完成' : '🟡 Level 2 - 手機驗證') :
            '🔒 Level 2 - 需要完成 Level 1',
          callback_data: session.level1Completed ? 'level_2' : 'level_locked'
        }
      ],
      [
        {
          text: session.level2Completed ?
            (session.level3Completed ? '✅ Level 3 - 已完成' : '🔴 Level 3 - 高級驗證') :
            '🔒 Level 3 - 需要完成 Level 2',
          callback_data: session.level2Completed ? 'level_3' : 'level_locked'
        }
      ],
      [
        { text: '📊 查看進度', callback_data: 'show_progress' },
        { text: '🔙 主選單', callback_data: 'main_menu' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { reply_markup: keyboard });
}

// 處理等級驗證
async function handleLevelVerification(chatId, userId, level, user) {
  const session = getUserSession(userId);

  if (level === '1') {
    // Level 1 驗證
    await bot.sendMessage(chatId, '🟢 Level 1 - 基礎驗證\n\n正在連接到 twin3.ai API...\n\n請稍候...');

    // 模擬驗證過程
    setTimeout(async () => {
      updateUserSession(userId, {
        level1Completed: true,
        verificationLevel: Math.max(session.verificationLevel, 1),
        humanityIndex: Math.max(session.humanityIndex, 65)
      });

      await bot.sendMessage(chatId, '✅ Level 1 驗證完成！\n\n🎉 恭喜！您已完成基礎驗證\n📊 人性指數：65/255\n\n現在可以進行 Level 2 驗證了！');

      // 返回驗證選單
      setTimeout(() => {
        showVerificationFlow(chatId, userId, user);
      }, 2000);
    }, 3000);

  } else if (level === '2') {
    // Level 2 驗證
    await bot.sendMessage(chatId, '🟡 Level 2 - 手機驗證\n\n正在連接到 twin3.ai API...\n\n請稍候...');

    setTimeout(async () => {
      updateUserSession(userId, {
        level2Completed: true,
        verificationLevel: Math.max(session.verificationLevel, 2),
        humanityIndex: Math.max(session.humanityIndex, 120),
        hasSBT: true
      });

      await bot.sendMessage(chatId, '✅ Level 2 驗證完成！\n\n🎉 恭喜！您已完成手機驗證\n📊 人性指數：120/255\n🏆 SBT 已解鎖！\n\n現在可以進行 Level 3 驗證或鑄造 SBT！');

      setTimeout(() => {
        showVerificationFlow(chatId, userId, user);
      }, 2000);
    }, 3000);

  } else if (level === '3') {
    // Level 3 驗證
    await bot.sendMessage(chatId, '🔴 Level 3 - 高級驗證\n\n正在連接到 twin3.ai API...\n\n請稍候...');

    setTimeout(async () => {
      updateUserSession(userId, {
        level3Completed: true,
        verificationLevel: 3,
        humanityIndex: 200
      });

      await bot.sendMessage(chatId, '✅ Level 3 驗證完成！\n\n🎉 恭喜！您已完成所有驗證\n📊 人性指數：200/255\n🏆 最高等級驗證達成！\n\n您現在是完全驗證的人類！');

      setTimeout(() => {
        showVerificationFlow(chatId, userId, user);
      }, 2000);
    }, 3000);
  }
}

// 顯示驗證進度
async function showVerificationProgress(chatId, userId) {
  const session = getUserSession(userId);
  const level = session.verificationLevel;
  const humanityIndex = session.humanityIndex;

  // 創建進度條
  const totalProgress = Math.min(level / 3 * 100, 100);
  const progressBar = '█'.repeat(Math.floor(totalProgress / 10)) + '░'.repeat(10 - Math.floor(totalProgress / 10));

  const message = `📊 驗證進度\n\n整體進度: ${Math.floor(totalProgress)}%\n${progressBar} ${level}/3 等級\n\n驗證等級:\n${level >= 1 ? '✅' : '⭕'} Level 1 - 基礎驗證\n${level >= 2 ? '✅' : '⭕'} Level 2 - 手機驗證\n${level >= 3 ? '✅' : '⭕'} Level 3 - 高級驗證\n\n人性指數: ${humanityIndex}/255\n${'█'.repeat(Math.floor(humanityIndex / 17))}${'░'.repeat(15 - Math.floor(humanityIndex / 17))}\n\n${level < 3 ? `🎯 下一步: 完成 Level ${level + 1} 以繼續驗證` : '🎉 恭喜！所有等級已完成！'}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 繼續驗證', callback_data: 'start_verification' }
      ],
      [
        { text: '🔙 主選單', callback_data: 'main_menu' }
      ]
    ]
  };

  await bot.sendMessage(chatId, message, { reply_markup: keyboard });
}

// 錯誤處理
bot.on('error', (error) => {
  console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error);
});

console.log('✅ Simple test bot started successfully');
console.log('📱 Try sending /start to the bot');
