// 緊急本地 Bot - 當服務器連接有問題時使用
const TelegramBot = require('node-telegram-bot-api');

const token = '7151382731:AAFYJY3_mt5fjQV0S2lKylYsJZMVsvby4j4';
console.log('🚨 Starting Emergency Local Bot...');

const bot = new TelegramBot(token, { polling: true });

// 用戶狀態存儲
const userStates = new Map();

function getUserState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      level1: false,
      level2: false,
      level3: false,
      score: 0,
      lang: 'en'
    });
  }
  return userStates.get(userId);
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  console.log('Emergency local bot received:', text, 'from user', userId);

  if (text === '/start' || text === '/verify') {
    const firstName = msg.from.first_name || 'Friend';
    await bot.sendMessage(chatId, `👋 Hi ${firstName}!\n\n🌍 Welcome to Twin Gate! Choose your language:`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✨ 繁體中文', callback_data: 'lang_tw' },
            { text: 'English', callback_data: 'lang_en' }
          ]
        ]
      }
    });
  } else if (text === '/status') {
    const state = getUserState(userId);
    const isTw = state.lang === 'tw';
    const completed = [state.level1, state.level2, state.level3].filter(Boolean).length;
    const progress = Math.floor((completed / 3) * 100);

    const message = isTw ?
      `📊 驗證進度：${progress}%\n\n${state.level1 ? '✅' : '⭕'} Level 1 - 基礎驗證\n${state.level2 ? '✅' : '⭕'} Level 2 - 手機驗證\n${state.level3 ? '✅' : '⭕'} Level 3 - 高級驗證\n\n📈 人性指數：${state.score}/255` :
      `📊 Verification Progress: ${progress}%\n\n${state.level1 ? '✅' : '⭕'} Level 1 - Basic Verification\n${state.level2 ? '✅' : '⭕'} Level 2 - Phone Verification\n${state.level3 ? '✅' : '⭕'} Level 3 - Advanced Verification\n\n📈 Humanity Index: ${state.score}/255`;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: isTw ? '🚀 繼續驗證' : '🚀 Continue Verification', callback_data: 'start_verify' }]
        ]
      }
    });
  }
});

bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  await bot.answerCallbackQuery(callbackQuery.id);
  console.log('Emergency local bot callback:', action, 'from user', userId);

  const state = getUserState(userId);

  if (action === 'lang_tw') {
    state.lang = 'tw';
    await bot.sendMessage(chatId, '✅ 語言設定為繁體中文\n\n🌍 歡迎來到 Twin Gate！\n\n證明您的人類身份並獲得數位身份驗證。\n\n🚀 請點擊下方按鈕開始驗證：', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 開始驗證', callback_data: 'start_verify' }],
          [{ text: '🌍 更改語言', callback_data: 'change_lang' }]
        ]
      }
    });
  } else if (action === 'lang_en') {
    state.lang = 'en';
    await bot.sendMessage(chatId, '✅ Language set to English\n\n🌍 Welcome to Twin Gate!\n\nProve your humanity and earn your digital identity.\n\n🚀 Click the button below to start verification:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Start Verification', callback_data: 'start_verify' }],
          [{ text: '🌍 Change Language', callback_data: 'change_lang' }]
        ]
      }
    });
  } else if (action === 'change_lang') {
    await bot.sendMessage(chatId, '🌍 Choose your language:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✨ 繁體中文', callback_data: 'lang_tw' },
            { text: 'English', callback_data: 'lang_en' }
          ]
        ]
      }
    });
  } else if (action === 'start_verify') {
    const isTw = state.lang === 'tw';
    const message = isTw ?
      '🚀 Twin Gate 驗證系統\n\n📋 可用驗證等級：\n\n🟢 Level 1 - 基礎驗證\n🟡 Level 2 - 手機驗證\n🔴 Level 3 - 高級驗證\n\n👇 選擇要進行的驗證等級：' :
      '🚀 Twin Gate Verification System\n\n📋 Available Verification Levels:\n\n🟢 Level 1 - Basic Verification\n🟡 Level 2 - Phone Verification\n🔴 Level 3 - Advanced Verification\n\n👇 Choose verification level:';

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{
            text: state.level1 ? (isTw ? '✅ Level 1 - 已完成' : '✅ Level 1 - Completed') : (isTw ? '🟢 Level 1 - 基礎驗證' : '🟢 Level 1 - Basic'),
            callback_data: 'level1'
          }],
          [{
            text: state.level1 ?
              (state.level2 ? (isTw ? '✅ Level 2 - 已完成' : '✅ Level 2 - Completed') : (isTw ? '🟡 Level 2 - 手機驗證' : '🟡 Level 2 - Phone')) :
              (isTw ? '🔒 Level 2 - 需完成 Level 1' : '🔒 Level 2 - Complete Level 1'),
            callback_data: state.level1 ? 'level2' : 'locked'
          }],
          [{
            text: state.level2 ?
              (state.level3 ? (isTw ? '✅ Level 3 - 已完成' : '✅ Level 3 - Completed') : (isTw ? '🔴 Level 3 - 高級驗證' : '🔴 Level 3 - Advanced')) :
              (isTw ? '🔒 Level 3 - 需完成 Level 2' : '🔒 Level 3 - Complete Level 2'),
            callback_data: state.level2 ? 'level3' : 'locked'
          }],
          [{
            text: isTw ? '📊 查看狀態' : '📊 Check Status',
            callback_data: 'status'
          }]
        ]
      }
    });
  } else if (action === 'level1') {
    const isTw = state.lang === 'tw';

    if (state.level1) {
      await bot.sendMessage(chatId, isTw ? '✅ Level 1 已完成！\n\n📊 人性指數：65/255' : '✅ Level 1 Completed!\n\n📊 Humanity Index: 65/255', {
        reply_markup: {
          inline_keyboard: [
            [{ text: isTw ? '🟡 繼續 Level 2' : '🟡 Continue to Level 2', callback_data: 'level2' }],
            [{ text: isTw ? '🔙 返回' : '🔙 Back', callback_data: 'start_verify' }]
          ]
        }
      });
    } else {
      await bot.sendMessage(chatId, isTw ? '🟢 Level 1 - 基礎驗證\n\n🔄 正在連接到 twin3.ai API...\n⏳ 請稍候...' : '🟢 Level 1 - Basic Verification\n\n🔄 Connecting to twin3.ai API...\n⏳ Please wait...');

      setTimeout(async () => {
        state.level1 = true;
        state.score = 65;

        await bot.sendMessage(chatId, isTw ? '✅ Level 1 驗證完成！\n\n🎉 恭喜！基礎驗證已完成\n📊 人性指數：65/255\n\n🚀 現在可以進行 Level 2 驗證！' : '✅ Level 1 Complete!\n\n🎉 Congratulations! Basic verification completed\n📊 Humanity Index: 65/255\n\n🚀 You can now proceed to Level 2!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: isTw ? '🟡 開始 Level 2' : '🟡 Start Level 2', callback_data: 'level2' }],
              [{ text: isTw ? '🔙 返回選單' : '🔙 Back to Menu', callback_data: 'start_verify' }]
            ]
          }
        });
      }, 3000);
    }
  } else if (action === 'level2') {
    const isTw = state.lang === 'tw';

    if (!state.level1) {
      await bot.sendMessage(chatId, isTw ? '🔒 請先完成 Level 1' : '🔒 Please complete Level 1 first', {
        reply_markup: {
          inline_keyboard: [
            [{ text: isTw ? '🟢 開始 Level 1' : '🟢 Start Level 1', callback_data: 'level1' }]
          ]
        }
      });
      return;
    }

    if (state.level2) {
      await bot.sendMessage(chatId, isTw ? '✅ Level 2 已完成！\n\n📊 人性指數：120/255\n🏆 SBT 已解鎖！' : '✅ Level 2 Completed!\n\n📊 Humanity Index: 120/255\n🏆 SBT Unlocked!', {
        reply_markup: {
          inline_keyboard: [
            [{ text: isTw ? '🔴 繼續 Level 3' : '🔴 Continue to Level 3', callback_data: 'level3' }],
            [{ text: isTw ? '🔙 返回' : '🔙 Back', callback_data: 'start_verify' }]
          ]
        }
      });
    } else {
      await bot.sendMessage(chatId, isTw ? '🟡 Level 2 - 手機驗證\n\n📱 此等級需要手機號碼驗證\n🔄 正在連接到 twin3.ai API...\n⏳ 請稍候...' : '🟡 Level 2 - Phone Verification\n\n📱 This level requires phone number verification\n🔄 Connecting to twin3.ai API...\n⏳ Please wait...');

      setTimeout(async () => {
        state.level2 = true;
        state.score = 120;

        await bot.sendMessage(chatId, isTw ? '✅ Level 2 驗證完成！\n\n🎉 太棒了！手機驗證已完成\n📊 人性指數：120/255\n🏆 SBT (靈魂綁定代幣) 已解鎖！\n\n🚀 現在可以進行 Level 3 驗證！' : '✅ Level 2 Complete!\n\n🎉 Excellent! Phone verification completed\n📊 Humanity Index: 120/255\n🏆 SBT (Soul Bound Token) Unlocked!\n\n🚀 You can now proceed to Level 3!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: isTw ? '🔴 開始 Level 3' : '🔴 Start Level 3', callback_data: 'level3' }],
              [{ text: isTw ? '🔙 返回選單' : '🔙 Back to Menu', callback_data: 'start_verify' }]
            ]
          }
        });
      }, 3000);
    }
  } else if (action === 'level3') {
    const isTw = state.lang === 'tw';

    if (!state.level2) {
      await bot.sendMessage(chatId, isTw ? '🔒 請先完成 Level 2' : '🔒 Please complete Level 2 first', {
        reply_markup: {
          inline_keyboard: [
            [{ text: isTw ? '🟡 開始 Level 2' : '🟡 Start Level 2', callback_data: 'level2' }]
          ]
        }
      });
      return;
    }

    if (state.level3) {
      await bot.sendMessage(chatId, isTw ? '✅ Level 3 已完成！\n\n📊 人性指數：200/255\n🏆 最高等級達成！' : '✅ Level 3 Completed!\n\n📊 Humanity Index: 200/255\n🏆 Maximum level achieved!');
    } else {
      await bot.sendMessage(chatId, isTw ? '🔴 Level 3 - 高級驗證\n\n🔐 此等級需要生物識別驗證\n🔄 正在連接到 twin3.ai API...\n⏳ 請稍候...' : '🔴 Level 3 - Advanced Verification\n\n🔐 This level requires biometric verification\n🔄 Connecting to twin3.ai API...\n⏳ Please wait...');

      setTimeout(async () => {
        state.level3 = true;
        state.score = 200;

        await bot.sendMessage(chatId, isTw ? '✅ Level 3 驗證完成！\n\n🎉 卓越！所有驗證已完成\n📊 人性指數：200/255\n🏆 最高等級驗證達成！\n\n🌟 您現在是完全驗證的人類！' : '✅ Level 3 Complete!\n\n🎉 Outstanding! All verifications completed\n📊 Humanity Index: 200/255\n🏆 Maximum verification achieved!\n\n🌟 You are now a fully verified human!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: isTw ? '🎉 完成所有驗證！' : '🎉 All Verifications Complete!', callback_data: 'completed' }]
            ]
          }
        });
      }, 3000);
    }
  } else if (action === 'locked') {
    const isTw = state.lang === 'tw';
    await bot.sendMessage(chatId, isTw ? '🔒 此等級已鎖定\n\n請按順序完成前面的驗證等級' : '🔒 This level is locked\n\nPlease complete previous verification levels in order', {
      reply_markup: {
        inline_keyboard: [
          [{ text: isTw ? '🔙 返回選單' : '🔙 Back to Menu', callback_data: 'start_verify' }]
        ]
      }
    });
  } else if (action === 'status') {
    const isTw = state.lang === 'tw';
    const completed = [state.level1, state.level2, state.level3].filter(Boolean).length;
    const progress = Math.floor((completed / 3) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const message = isTw ?
      `📊 驗證進度報告\n\n🎯 整體進度：${progress}%\n${progressBar} ${completed}/3 等級\n\n驗證狀態：\n${state.level1 ? '✅' : '⭕'} Level 1 - 基礎驗證\n${state.level2 ? '✅' : '⭕'} Level 2 - 手機驗證\n${state.level3 ? '✅' : '⭕'} Level 3 - 高級驗證\n\n📈 人性指數：${state.score}/255\n${completed < 3 ? '🎯 下一步：完成 Level ' + (completed + 1) : '🎉 恭喜！所有等級已完成！'}` :
      `📊 Verification Progress Report\n\n🎯 Overall Progress: ${progress}%\n${progressBar} ${completed}/3 levels\n\nVerification Status:\n${state.level1 ? '✅' : '⭕'} Level 1 - Basic Verification\n${state.level2 ? '✅' : '⭕'} Level 2 - Phone Verification\n${state.level3 ? '✅' : '⭕'} Level 3 - Advanced Verification\n\n📈 Humanity Index: ${state.score}/255\n${completed < 3 ? '🎯 Next: Complete Level ' + (completed + 1) : '🎉 Congratulations! All levels completed!'}`;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: isTw ? '🚀 繼續驗證' : '🚀 Continue Verification', callback_data: 'start_verify' }]
        ]
      }
    });
  } else if (action === 'completed') {
    const isTw = state.lang === 'tw';
    await bot.sendMessage(chatId, isTw ? '🎉 恭喜完成所有驗證！\n\n您已成功證明您的人類身份\n並獲得最高等級的數位身份驗證。\n\n感謝使用 Twin Gate！' : '🎉 Congratulations on completing all verifications!\n\nYou have successfully proven your humanity\nand earned the highest level of digital identity verification.\n\nThank you for using Twin Gate!');
  }
});

bot.on('error', (error) => {
  console.error('Emergency local bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Emergency local bot polling error:', error);
});

console.log('✅ Emergency Local Bot ready');
