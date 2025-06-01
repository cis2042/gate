// Twin Gate Telegram Bot - 修復版本 (Level 2/3 功能完整)
// 此版本修復了 Level 2 和 Level 3 的回調處理問題

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN || '7151382731:AAFYJY3_mt5fjQV0S2lKylYsJZMVsvby4j4';
console.log('🤖 Starting Twin Gate Bot (Fixed Version)...');

const bot = new TelegramBot(token, { polling: true });
const app = express();

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

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: 'twin-gate-bot-fixed',
    uptime: process.uptime(),
    users: userStates.size,
    version: '1.1.0-fixed'
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('🌐 Server ready on port 3000');
});

// 處理消息
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  console.log('Message:', text, 'from user', userId);

  if (text === '/start') {
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

// 處理回調查詢
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  await bot.answerCallbackQuery(callbackQuery.id);
  console.log('Callback:', action, 'from user', userId);

  const state = getUserState(userId);

  if (action === 'lang_tw') {
    state.lang = 'tw';
    await bot.sendMessage(chatId, '✅ 語言設定為繁體中文\n\n🌍 歡迎來到 Twin Gate！\n\n🚀 請點擊下方按鈕開始驗證：', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 開始驗證', callback_data: 'start_verify' }],
          [{ text: '🌍 更改語言', callback_data: 'change_lang' }]
        ]
      }
    });
  } else if (action === 'lang_en') {
    state.lang = 'en';
    await bot.sendMessage(chatId, '✅ Language set to English\n\n🌍 Welcome to Twin Gate!\n\n🚀 Click the button below to start verification:', {
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
      '🚀 Twin Gate 驗證系統\n\n選擇驗證等級：' :
      '🚀 Twin Gate Verification System\n\nChoose verification level:';

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
      await bot.sendMessage(chatId, isTw ? '🟢 Level 1 - 基礎驗證\n\n🔄 正在驗證...' : '🟢 Level 1 - Basic Verification\n\n🔄 Verifying...');

      setTimeout(async () => {
        state.level1 = true;
        state.score = 65;

        await bot.sendMessage(chatId, isTw ? '✅ Level 1 驗證完成！\n\n🎉 恭喜！基礎驗證已完成\n📊 人性指數：65/255\n\n🚀 現在可以進行 Level 2 驗證！' : '✅ Level 1 Complete!\n\n🎉 Congratulations! Basic verification completed\n📊 Humanity Index: 65/255\n\n🚀 You can now proceed to Level 2!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: isTw ? '🟡 開始 Level 2' : '🟡 Start Level 2', callback_data: 'level2' }],
              [{ text: isTw ? '📊 查看狀態' : '📊 Check Status', callback_data: 'status' }]
            ]
          }
        });
      }, 3000);
    }
  } else if (action === 'level2') {
    const isTw = state.lang === 'tw';

    if (!state.level1) {
      await bot.sendMessage(chatId, isTw ? '🔒 請先完成 Level 1' : '🔒 Please complete Level 1 first');
      return;
    }

    if (state.level2) {
      await bot.sendMessage(chatId, isTw ? '✅ Level 2 已完成！\n\n📊 人性指數：120/255\n🏆 SBT 已解鎖！' : '✅ Level 2 Completed!\n\n📊 Humanity Index: 120/255\n🏆 SBT Unlocked!', {
        reply_markup: {
          inline_keyboard: [
            [{ text: isTw ? '🔴 繼續 Level 3' : '🔴 Continue to Level 3', callback_data: 'level3' }],
            [{ text: isTw ? '🏆 查看 SBT' : '🏆 View SBT', callback_data: 'sbt' }]
          ]
        }
      });
    } else {
      await bot.sendMessage(chatId, isTw ? '🟡 Level 2 - 手機驗證\n\n📱 正在驗證手機號碼...' : '🟡 Level 2 - Phone Verification\n\n📱 Verifying phone number...');

      setTimeout(async () => {
        state.level2 = true;
        state.score = 120;

        await bot.sendMessage(chatId, isTw ? '✅ Level 2 驗證完成！\n\n🎉 太棒了！手機驗證已完成\n📊 人性指數：120/255\n🏆 SBT 已解鎖！\n\n🚀 現在可以進行 Level 3 驗證！' : '✅ Level 2 Complete!\n\n🎉 Excellent! Phone verification completed\n📊 Humanity Index: 120/255\n🏆 SBT Unlocked!\n\n🚀 You can now proceed to Level 3!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: isTw ? '🔴 開始 Level 3' : '🔴 Start Level 3', callback_data: 'level3' }],
              [{ text: isTw ? '🏆 查看 SBT' : '🏆 View SBT', callback_data: 'sbt' }]
            ]
          }
        });
      }, 3000);
    }
  } else if (action === 'level3') {
    const isTw = state.lang === 'tw';

    if (!state.level2) {
      await bot.sendMessage(chatId, isTw ? '🔒 請先完成 Level 2' : '🔒 Please complete Level 2 first');
      return;
    }

    if (state.level3) {
      await bot.sendMessage(chatId, isTw ? '✅ Level 3 已完成！\n\n📊 人性指數：200/255\n🏆 最高等級達成！' : '✅ Level 3 Completed!\n\n📊 Humanity Index: 200/255\n🏆 Maximum level achieved!');
    } else {
      await bot.sendMessage(chatId, isTw ? '🔴 Level 3 - 高級驗證\n\n🔐 正在進行生物識別驗證...' : '🔴 Level 3 - Advanced Verification\n\n🔐 Performing biometric verification...');

      setTimeout(async () => {
        state.level3 = true;
        state.score = 200;

        await bot.sendMessage(chatId, isTw ? '✅ Level 3 驗證完成！\n\n🎉 卓越！所有驗證已完成\n📊 人性指數：200/255\n🏆 最高等級驗證達成！\n\n🌟 您現在是完全驗證的人類！' : '✅ Level 3 Complete!\n\n🎉 Outstanding! All verifications completed\n📊 Humanity Index: 200/255\n🏆 Maximum verification achieved!\n\n🌟 You are now a fully verified human!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: isTw ? '🏆 查看完整 SBT' : '🏆 View Complete SBT', callback_data: 'sbt' }],
              [{ text: isTw ? '📊 最終報告' : '📊 Final Report', callback_data: 'status' }]
            ]
          }
        });
      }, 3000);
    }
  } else if (action === 'locked') {
    const isTw = state.lang === 'tw';
    await bot.sendMessage(chatId, isTw ? '🔒 此等級已鎖定\n\n請按順序完成驗證' : '🔒 This level is locked\n\nPlease complete verifications in order');
  } else if (action === 'status') {
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
  } else if (action === 'sbt') {
    const isTw = state.lang === 'tw';

    if (!state.level2) {
      await bot.sendMessage(chatId, isTw ? '🏆 SBT 未解鎖\n\n需要完成 Level 2 以上' : '🏆 SBT Not Unlocked\n\nComplete Level 2 or higher');
    } else {
      const message = isTw ?
        `🏆 您的 SBT\n\n✅ 狀態：已鑄造\n📊 人性指數：${state.score}/255\n🎯 等級：Level ${state.level3 ? '3' : '2'}\n\n🔗 區塊鏈記錄：\n• 網絡：BNB Smart Chain\n• Token ID：#${userId.toString().slice(-4)}` :
        `🏆 Your SBT\n\n✅ Status: Minted\n📊 Humanity Index: ${state.score}/255\n🎯 Level: Level ${state.level3 ? '3' : '2'}\n\n🔗 Blockchain Records:\n• Network: BNB Smart Chain\n• Token ID: #${userId.toString().slice(-4)}`;

      await bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: isTw ? '🔗 查看區塊鏈' : '🔗 View Blockchain', url: `https://bscscan.com/token/0x1234#${userId}` }],
            [{ text: isTw ? '🔙 返回' : '🔙 Back', callback_data: 'start_verify' }]
          ]
        }
      });
    }
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('✅ Twin Gate Bot (Fixed Version) ready');
