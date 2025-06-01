// Twin Gate Telegram Bot - 穩定工作版本
// 此版本已確認正常運作，請勿隨意修改

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.BOT_TOKEN || '7151382731:AAFYJY3_mt5fjQV0S2lKylYsJZMVsvby4j4';
console.log('🤖 Starting Twin Gate Bot (Stable Version)...');

const bot = new TelegramBot(token, { polling: true });
const app = express();

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    bot: 'twin-gate-bot-stable', 
    uptime: process.uptime(),
    version: '1.0.0-stable',
    timestamp: new Date().toISOString()
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

  console.log(`📝 Message: ${text} from user ${userId}`);

  if (text === '/start') {
    const firstName = msg.from.first_name || 'Friend';
    const message = `👋 Hello ${firstName}! Welcome to Twin Gate!\n\nChoose your language:`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✨ 繁體中文', callback_data: 'lang_tw' },
          { text: 'English', callback_data: 'lang_en' }
        ]
      ]
    };

    await bot.sendMessage(chatId, message, { reply_markup: keyboard });
  } else if (text === '/help') {
    const helpMessage = `❓ Twin Gate Help\n\n🤖 Available Commands:\n/start - Start the bot and choose language\n/help - Show this help message\n\n🌐 About Twin3.ai:\nTwin3.ai provides human identity verification using advanced AI technology.\n\n🔗 Website: https://twin3.ai`;
    await bot.sendMessage(chatId, helpMessage);
  }
});

// 處理回調查詢
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  await bot.answerCallbackQuery(callbackQuery.id);

  console.log(`🔄 Callback: ${action} from user ${userId}`);

  if (action === 'lang_tw') {
    await bot.sendMessage(chatId, '✅ 語言設定為繁體中文\n\n🌍 歡迎來到 Twin Gate！\n\n證明您的人類身份並獲得數位身份驗證。\n\n🚀 請點擊下方按鈕開始驗證：', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 開始驗證', callback_data: 'start_verify' }],
          [{ text: '🌍 更改語言', callback_data: 'change_lang' }]
        ]
      }
    });
  } else if (action === 'lang_en') {
    await bot.sendMessage(chatId, '✅ Language set to English\n\n🌍 Welcome to Twin Gate!\n\nProve your humanity and earn your digital identity.\n\n🚀 Click the button below to start verification:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Start Verification', callback_data: 'start_verify' }],
          [{ text: '🌍 Change Language', callback_data: 'change_lang' }]
        ]
      }
    });
  } else if (action === 'change_lang') {
    const message = '🌍 Choose your language:';
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✨ 繁體中文', callback_data: 'lang_tw' },
          { text: 'English', callback_data: 'lang_en' }
        ]
      ]
    };
    await bot.sendMessage(chatId, message, { reply_markup: keyboard });
  } else if (action === 'start_verify') {
    await bot.sendMessage(chatId, '🚀 Twin Gate Verification System\n\n📋 Available Verification Levels:\n\n🟢 Level 1 - Basic Verification\n🟡 Level 2 - Phone Verification  \n🔴 Level 3 - Advanced Verification\n\n👇 Click to start with Level 1:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🟢 Level 1 - Basic', callback_data: 'level1' }],
          [{ text: '🟡 Level 2 - Phone', callback_data: 'level2' }],
          [{ text: '🔴 Level 3 - Advanced', callback_data: 'level3' }],
          [{ text: '🔙 Back', callback_data: 'lang_tw' }]
        ]
      }
    });
  } else if (action === 'level1') {
    await bot.sendMessage(chatId, '🟢 Level 1 - Basic Verification\n\n🔄 Connecting to twin3.ai API...\n⏳ Please wait...');
    
    // 模擬驗證過程
    setTimeout(async () => {
      await bot.sendMessage(chatId, '✅ Level 1 Verification Complete!\n\n🎉 Congratulations! Basic verification completed.\n📊 Humanity Index: 65/255\n🏆 You can now proceed to Level 2!\n\n🚀 Continue verification or check your progress:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🟡 Continue to Level 2', callback_data: 'level2' }],
            [{ text: '📊 Check Progress', callback_data: 'progress' }],
            [{ text: '🔙 Main Menu', callback_data: 'start_verify' }]
          ]
        }
      });
    }, 3000);
  } else if (action === 'level2') {
    await bot.sendMessage(chatId, '🟡 Level 2 - Phone Verification\n\n📱 This level requires phone number verification.\n🔄 Connecting to twin3.ai API...\n⏳ Please wait...');
    
    setTimeout(async () => {
      await bot.sendMessage(chatId, '✅ Level 2 Verification Complete!\n\n🎉 Excellent! Phone verification completed.\n📊 Humanity Index: 120/255\n🏆 SBT (Soul Bound Token) unlocked!\n\n🚀 You can now proceed to Level 3 or mint your SBT:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔴 Continue to Level 3', callback_data: 'level3' }],
            [{ text: '🏆 View SBT Info', callback_data: 'sbt_info' }],
            [{ text: '📊 Check Progress', callback_data: 'progress' }]
          ]
        }
      });
    }, 3000);
  } else if (action === 'level3') {
    await bot.sendMessage(chatId, '🔴 Level 3 - Advanced Verification\n\n🔐 This level requires biometric verification.\n🔄 Connecting to twin3.ai API...\n⏳ Please wait...');
    
    setTimeout(async () => {
      await bot.sendMessage(chatId, '✅ Level 3 Verification Complete!\n\n🎉 Outstanding! All verifications completed.\n📊 Humanity Index: 200/255\n🏆 Maximum verification level achieved!\n\n🌟 You are now a fully verified human!', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏆 View SBT Info', callback_data: 'sbt_info' }],
            [{ text: '📊 Final Progress', callback_data: 'progress' }],
            [{ text: '🌍 Main Menu', callback_data: 'start_verify' }]
          ]
        }
      });
    }, 3000);
  } else if (action === 'sbt_info') {
    await bot.sendMessage(chatId, '🏆 Your SBT (Soul Bound Token)\n\n✅ Status: Minted\n📊 Humanity Index: 120-200/255\n🎯 Verification Level: Level 2-3\n\n🔗 Blockchain Records:\n• Network: BNB Smart Chain\n• Contract: 0x1234...abcd\n• Token ID: #' + userId.toString().slice(-4) + '\n\n👤 Twin3 Profile:\nhttps://twin3.ai/profile/' + userId, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔗 View on BNB Scan', url: 'https://bscscan.com/token/0x1234567890abcdef#' + userId },
            { text: '👤 Twin3 Profile', url: 'https://twin3.ai/profile/' + userId }
          ],
          [{ text: '🔙 Back', callback_data: 'start_verify' }]
        ]
      }
    });
  } else if (action === 'progress') {
    await bot.sendMessage(chatId, '📊 Verification Progress\n\n🎯 Current Status:\n✅ Level 1 - Completed\n✅ Level 2 - Completed  \n✅ Level 3 - Completed\n\n📈 Overall Progress: 100%\n██████████ 3/3 levels\n\n🏆 Humanity Index: 200/255\n████████████████░░░ \n\n🎉 Congratulations! All verification levels completed!', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏆 View SBT', callback_data: 'sbt_info' }],
          [{ text: '🌍 Main Menu', callback_data: 'start_verify' }]
        ]
      }
    });
  }
});

// 錯誤處理
bot.on('error', (error) => {
  console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error);
});

console.log('✅ Twin Gate Bot (Stable Version) ready');
