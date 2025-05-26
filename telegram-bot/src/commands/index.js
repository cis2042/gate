const { Markup } = require('telegraf');
const logger = require('../utils/logger');
const apiClient = require('../services/apiClient');
const { getUserSession, updateUserSession } = require('../utils/session');
const { formatUserProfile, formatVerificationStatus, formatSBTInfo } = require('../utils/formatters');
const { createMainKeyboard, createVerificationKeyboard, createVerificationLevelMenu } = require('../utils/keyboards');
const { t, getSupportedLanguages } = require('../locales');
const { createMainMenu, createLanguageMenu } = require('../utils/persistentMenu');
const { getUserVerificationStatus } = require('../utils/userStatus');

// Helper function to show main welcome message
async function showMainWelcome(ctx, language, firstName) {
  const userId = ctx.from.id;
  const userStatus = await getUserVerificationStatus(userId);

  const welcomeMessage = t('welcome.title', language) + '\n\n' +
    t('welcome.subtitle', language, { firstName }) + '\n\n' +
    t('welcome.description', language) + '\n\n' +
    `🎯 ${t('menu.status', language)}: Level ${userStatus.verificationLevel}/3\n` +
    `📊 Humanity Index: ${userStatus.humanityIndex}/255\n\n` +
    t('welcome.what_you_get', language) + '\n\n' +
    t('welcome.get_started', language);

  await ctx.replyWithMarkdown(welcomeMessage, Markup.inlineKeyboard([
    [Markup.button.callback(t('buttons.start_verification', language), 'start_verification')],
    [Markup.button.callback(t('buttons.check_status', language), 'check_status')],
    [Markup.button.callback(t('buttons.learn_more', language), 'learn_more')],
    [Markup.button.callback('🌐 ' + t('menu.language', language), 'menu_language')]
  ]));
}

// Helper function to show Twin3.ai verification task
async function showVerificationTask(ctx, language) {
  const userId = ctx.from.id;
  const userStatus = await getUserVerificationStatus(userId);

  const taskMessage = `**Task #001**\n\n` +
    `**Proof of Humanity**\n\n` +
    `您必須證明您不是機器人才能成為我們的一員。有些機器人已經變得如此複雜，很難將它們與真人區分開來。您通過的人類驗證任務等級越高，您就越有可能是真人。\n\n` +
    `人類驗證任務目前開放到第 3 級，您將通過日常生活中熟悉的驗證方法來證明您不是機器人。此過程僅用於身份或設備識別，不會保留您的個人資訊。\n\n` +
    `**您目前的身份等級：**\n` +
    `${userStatus.verificationLevel >= 1 ? '✅' : '⭕'} Level 1\n` +
    `${userStatus.verificationLevel >= 2 ? '✅' : '⭕'} Level 2\n` +
    `${userStatus.verificationLevel >= 3 ? '✅' : '⭕'} Level 3\n\n` +
    `完成至少第 2 級以獲得免費鑄造您的 DNA NFT。`;

  await ctx.replyWithMarkdown(taskMessage, createVerificationLevelMenu(language, userStatus.verificationLevel, userStatus.currentLevel));
}

function setupCommands(bot) {
  // Start command - 語言選擇
  bot.start(async (ctx) => {
    try {
      const userId = ctx.from.id;
      const username = ctx.from.username;
      const firstName = ctx.from.first_name;

      logger.userAction(userId, 'start_command', {
        username,
        firstName,
        chatType: ctx.chat.type
      });

      // 檢查用戶是否已選擇語言
      const session = await getUserSession(userId);
      if (session?.language) {
        // 用戶已選擇語言，顯示主選單
        await showMainWelcome(ctx, session.language, firstName);
        return;
      }

      // 顯示語言選擇
      const supportedLanguages = getSupportedLanguages();
      const welcomeMessage = `
🌍 *Welcome to Twin Gate!*

Hello ${firstName}! Please select your preferred language to continue.

請選擇您的語言以繼續。

Veuillez sélectionner votre langue pour continuer.

Bitte wählen Sie Ihre Sprache aus, um fortzufahren.

Por favor, seleccione su idioma para continuar.

言語を選択して続行してください。

언어를 선택하여 계속하십시오.

Пожалуйста, выберите ваш язык для продолжения.
      `;

      const languageButtons = [];
      for (let i = 0; i < supportedLanguages.length; i += 2) {
        const row = [];
        const lang1 = supportedLanguages[i];
        const lang2 = supportedLanguages[i + 1];

        row.push(Markup.button.callback(lang1.name, `lang_${lang1.code}`));
        if (lang2) {
          row.push(Markup.button.callback(lang2.name, `lang_${lang2.code}`));
        }
        languageButtons.push(row);
      }

      await ctx.replyWithMarkdown(welcomeMessage, Markup.inlineKeyboard(languageButtons));

      // Initialize user session without language
      await updateUserSession(userId, {
        started: true,
        startedAt: new Date(),
        username,
        firstName
      });

    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // Help command
  bot.help(async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'help_command');

      const session = await getUserSession(userId);
      const language = session?.language || 'zh-TW';

      const helpMessage = t('help.title', language) + '\n\n' +
        t('help.commands', language) + '\n\n' +
        t('help.verification_levels', language) + '\n\n' +
        t('help.getting_started', language) + '\n\n' +
        t('help.support', language) + '\n\n' +
        t('help.privacy', language);

      await ctx.replyWithMarkdown(helpMessage, Markup.inlineKeyboard([
        [Markup.button.callback(t('buttons.start_verification', language), 'start_verification')],
        [Markup.button.callback(t('buttons.learn_more', language), 'learn_more')],
        [Markup.button.url('📚 ' + t('help.documentation', language), 'https://docs.twingate.com')],
        [Markup.button.url('💬 ' + t('help.support_chat', language), 'https://t.me/twingate_support')]
      ]));

    } catch (error) {
      logger.error('Error in help command:', error);
      const session = await getUserSession(ctx.from.id);
      const language = session?.language || 'zh-TW';
      await ctx.reply(t('errors.general', language));
    }
  });

  // Verify command
  bot.command('verify', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'verify_command');

      const session = await getUserSession(userId);
      const language = session?.language || 'zh-TW';

      if (!session?.language) {
        await ctx.reply(t('errors.auth_required', language));
        return;
      }

      // 顯示 Twin3.ai 驗證任務
      await showVerificationTask(ctx, language);

    } catch (error) {
      logger.error('Error in verify command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // Status command
  bot.command('status', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'status_command');

      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 You need to register first. Please use /start to begin.');
        return;
      }

      try {
        const statusResponse = await apiClient.getVerificationStatus(session.token);

        if (statusResponse.success) {
          const message = formatVerificationStatus(statusResponse.data);
          await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh Status', 'refresh_status')],
            [Markup.button.callback('✅ Continue Verification', 'continue_verification')]
          ]));
        } else {
          throw new Error('Failed to get verification status');
        }
      } catch (error) {
        logger.error('Error getting verification status:', error);
        await ctx.reply('❌ Unable to load verification status. Please try again later.');
      }

    } catch (error) {
      logger.error('Error in status command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // Profile command
  bot.command('profile', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'profile_command');

      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 You need to register first. Please use /start to begin.');
        return;
      }

      try {
        const profileResponse = await apiClient.getUserProfile(session.token);

        if (profileResponse.success) {
          const message = formatUserProfile(profileResponse.data.user);
          await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
            [Markup.button.callback('✏️ Edit Profile', 'edit_profile')],
            [Markup.button.callback('🔄 Refresh', 'refresh_profile')]
          ]));
        } else {
          throw new Error('Failed to get user profile');
        }
      } catch (error) {
        logger.error('Error getting user profile:', error);
        await ctx.reply('❌ Unable to load profile. Please try again later.');
      }

    } catch (error) {
      logger.error('Error in profile command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // SBT command
  bot.command('sbt', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'sbt_command');

      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 You need to register first. Please use /start to begin.');
        return;
      }

      try {
        const sbtResponse = await apiClient.getSBTInfo(session.token);

        if (sbtResponse.success) {
          const message = formatSBTInfo(sbtResponse.data);

          const keyboard = sbtResponse.data.hasSBT
            ? Markup.inlineKeyboard([
                [Markup.button.url('🔍 View on Explorer', `${process.env.BLOCKCHAIN_EXPLORER_URL}/token/${sbtResponse.data.sbt?.tokenId}`)],
                [Markup.button.callback('🔄 Refresh', 'refresh_sbt')]
              ])
            : Markup.inlineKeyboard([
                [Markup.button.callback('🏆 Mint SBT', 'mint_sbt')],
                [Markup.button.callback('✅ Complete Verification', 'continue_verification')]
              ]);

          await ctx.replyWithMarkdown(message, keyboard);
        } else {
          throw new Error('Failed to get SBT information');
        }
      } catch (error) {
        logger.error('Error getting SBT info:', error);
        await ctx.reply('❌ Unable to load SBT information. Please try again later.');
      }

    } catch (error) {
      logger.error('Error in sbt command:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // Channels command - 顯示 Twin3.ai 驗證等級
  bot.command('channels', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'channels_command');

      const channelsMessage = `
🌍 *Twin3.ai 人類身份驗證等級*

🟢 **Level 1 - 基礎驗證** (必選)
• Google reCAPTCHA 人機驗證
• 預期分數：50-80 / 255
• 時間：1-2 分鐘

🟡 **Level 2 - 進階驗證** (可選)
• 手機短信驗證
• 預期分數：80-150 / 255
• 時間：3-5 分鐘

🔴 **Level 3 - 高級驗證** (可選)
• Apple/Google OAuth 登錄
• 預期分數：120-200 / 255
• 時間：2-3 分鐘

📊 *分數範圍：0-255*
🎯 *通過門檻：≥100 分*
🏆 *SBT 鑄造門檻：≥100 分*

💡 *提示：您可以選擇完成一個或多個級別的驗證來提高分數*
      `;

      await ctx.replyWithMarkdown(channelsMessage, Markup.inlineKeyboard([
        [Markup.button.callback('🚀 開始驗證', 'start_twin3_verification')],
        [Markup.button.callback('📊 檢查狀態', 'check_verification_status')],
        [Markup.button.callback('ℹ️ 了解更多', 'learn_more_verification')]
      ]));

    } catch (error) {
      logger.error('Error in channels command:', error);
      await ctx.reply('❌ 無法載入驗證資訊。請稍後再試。');
    }
  });

  // Settings command
  bot.command('settings', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'settings_command');

      const settingsMessage = `
⚙️ *Bot 設定*

配置您的 Twin Gate bot 體驗設定：

🔔 *通知設定*
• 驗證更新：已啟用
• SBT 鑄造提醒：已啟用
• 系統公告：已啟用

🌐 *語言設定*
• 目前語言：繁體中文

📊 *隱私設定*
• 分享驗證狀態：私人
• 允許直接訊息：已啟用

💾 *資料設定*
• 會話逾時：24 小時
• 自動登出：已停用
      `;

      await ctx.replyWithMarkdown(settingsMessage, Markup.inlineKeyboard([
        [Markup.button.callback('🔔 通知設定', 'settings_notifications')],
        [Markup.button.callback('🌐 語言設定', 'settings_language')],
        [Markup.button.callback('📊 隱私設定', 'settings_privacy')],
        [Markup.button.callback('💾 資料設定', 'settings_data')],
        [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
      ]));

    } catch (error) {
      logger.error('Error in settings command:', error);
      await ctx.reply('❌ 無法載入設定。請稍後再試。');
    }
  });

  // Stats command (for admins)
  bot.command('stats', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'stats_command');

      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 需要認證。請使用 /start 註冊。');
        return;
      }

      try {
        // Check if user is admin
        const userResponse = await apiClient.getUserProfile(session.token);
        if (!userResponse.success || userResponse.data.user.role !== 'admin') {
          await ctx.reply('❌ 此指令僅限管理員使用。');
          return;
        }

        // Get system statistics
        const statsResponse = await apiClient.getSystemStats(session.token);

        if (statsResponse.success) {
          const stats = statsResponse.data;
          const message = `
📊 *Twin Gate 系統統計*

👥 *使用者統計*
• 總使用者數：${stats.totalUsers || 0}
• 已驗證使用者：${stats.verifiedUsers || 0}
• 今日新註冊：${stats.todayRegistrations || 0}

✅ *驗證統計*
• 總驗證次數：${stats.totalVerifications || 0}
• 成功驗證：${stats.successfulVerifications || 0}
• 平均 Humanity Index：${stats.avgHumanityIndex || 0}/255

🏆 *SBT 統計*
• 已鑄造 SBT：${stats.mintedSBTs || 0}
• 待鑄造：${stats.pendingSBTs || 0}
• 鑄造成功率：${stats.sbtSuccessRate || 0}%

🤖 *Bot 統計*
• Telegram 活躍用戶：${stats.telegramActiveUsers || 0}
• Discord 活躍用戶：${stats.discordActiveUsers || 0}
• LINE 活躍用戶：${stats.lineActiveUsers || 0}

📈 *系統狀態*
• 系統運行時間：${stats.uptime || 'N/A'}
• API 回應時間：${stats.avgResponseTime || 'N/A'}ms
• 錯誤率：${stats.errorRate || 0}%

🕐 *更新時間：${new Date().toLocaleString('zh-TW')}*
          `;

          await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
            [Markup.button.callback('🔄 重新整理', 'refresh_stats')],
            [Markup.button.callback('📊 詳細報告', 'detailed_stats')],
            [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
          ]));
        } else {
          throw new Error('無法獲取統計資料');
        }
      } catch (error) {
        logger.error('Error getting stats:', error);
        await ctx.reply('❌ 無法獲取統計資料。請稍後再試。');
      }

    } catch (error) {
      logger.error('Stats command error:', error);
      await ctx.reply('❌ 統計指令執行失敗。請稍後再試。');
    }
  });
}

// Helper function to get channel emoji
function getChannelEmoji(channel) {
  const emojis = {
    twitter: '🐦',
    discord: '💬',
    telegram: '📱',
    github: '🐙',
    email: '📧',
    phone: '📞',
    kyc: '🆔'
  };
  return emojis[channel] || '📋';
}

module.exports = { setupCommands };
