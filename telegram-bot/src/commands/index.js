const { Markup } = require('telegraf');
const logger = require('../utils/logger');
const apiClient = require('../services/apiClient');
const { getUserSession, updateUserSession } = require('../utils/session');
const { formatUserProfile, formatVerificationStatus, formatSBTInfo } = require('../utils/formatters');
const { createMainKeyboard, createVerificationKeyboard, createVerificationLevelMenu } = require('../utils/keyboards');
const { t, getSupportedLanguages } = require('../locales');
const { createMainMenu, createLanguageMenu } = require('../utils/persistentMenu');
const { getUserVerificationStatus } = require('../utils/userStatus');
const groupService = require('../services/groupService');
const verificationFlowService = require('../services/verificationFlowService');
const sbtService = require('../services/sbtService');

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
    [Markup.button.callback('🚀 開始驗證', 'start_verification')],
    [Markup.button.callback('🌐 語言設定', 'menu_language')]
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
  // Start command - 直接進入統一流程
  bot.start(async (ctx) => {
    try {
      const userId = ctx.from.id;
      const username = ctx.from.username;
      const firstName = ctx.from.first_name;

      logger.userAction(userId, 'start_command', {
        username,
        firstName,
        chatType: ctx.chat.type,
        chatId: ctx.chat.id,
        sourceInfo: ctx.sourceInfo
      });

      // 初始化用戶會話
      await updateUserSession(userId, {
        started: true,
        startedAt: new Date(),
        username,
        firstName,
        lastCommand: 'start'
      });

      // 直接進入統一驗證流程
      await verificationFlowService.handleUnifiedFlow(ctx, 'start');

    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply('❌ 系統暫時無法使用，請稍後再試。');
    }
  });

  // Help command - 加入 Twin3.ai 介紹
  bot.help(async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'help_command');

      const session = await getUserSession(userId);
      const language = session?.language || 'zh-TW';

      const helpMessage = `❓ **Twin Gate Bot 說明**\n\n` +
        `🤖 **關於 Twin3.ai 人類驗證**\n` +
        `Twin3.ai 是領先的去中心化人類身份驗證平台，透過多層級驗證技術幫助用戶證明自己的人類身份，並獲得獨特的 Humanity Index 分數。\n\n` +
        `🔐 **Twin Gate** 是基於 Twin3.ai 技術的 Telegram 驗證機器人，提供：\n` +
        `• 三級漸進式人類身份驗證\n` +
        `• 0-255 分的 Humanity Index 評分系統\n` +
        `• 專屬的 SBT (Soul Bound Token) 鑄造\n` +
        `• 完整的隱私保護和數據安全\n\n` +
        `**可用指令：**\n` +
        `/verify - 🚀 開始/查看驗證狀態\n` +
        `/sbt - 🏆 查看 SBT 和個人資料\n` +
        `/help - ❓ 顯示此說明訊息\n\n` +
        `**驗證等級：**\n` +
        `• Level 1 - Google reCAPTCHA\n` +
        `• Level 2 - SMS 驗證\n` +
        `• Level 3 - 生物識別驗證\n\n` +
        `**開始使用：**\n` +
        `1. 使用 🚀 /verify 開始驗證\n` +
        `2. 依序完成驗證等級\n` +
        `3. 完成 Level 2 後可鑄造 SBT\n` +
        `4. 完成 Level 3 達到最高 Humanity Index\n\n` +
        `**支援：**\n` +
        `如需協助，請聯繫我們的支援團隊或查看官方文檔。\n\n` +
        `**隱私：**\n` +
        `您的數據經過加密保護，我們只儲存必要的驗證資訊。`;

      await ctx.replyWithMarkdown(helpMessage, Markup.inlineKeyboard([
        [Markup.button.url('🌐 Twin3.ai 官網', 'https://twin3.ai')],
        [Markup.button.url('📚 技術文檔', 'https://docs.twin3.ai')],
        [Markup.button.url('💬 支援群組', 'https://t.me/twin3support')],
        [Markup.button.callback('🚀 開始驗證', 'redirect_to_verify')]
      ]));

    } catch (error) {
      logger.error('Error in help command:', error);
      await ctx.reply('❌ 無法載入說明。請稍後再試。');
    }
  });

  // Verify command - 統一驗證流程
  bot.command('verify', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'verify_command');

      // 更新用戶會話
      await updateUserSession(userId, {
        lastCommand: 'verify'
      });

      // 使用統一驗證流程
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');

    } catch (error) {
      logger.error('Error in verify command:', error);
      await ctx.reply('❌ 驗證系統暫時無法使用，請稍後再試。');
    }
  });

  // Status command - 重定向到 verify
  bot.command('status', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'status_redirect_to_verify');

      // 重定向到 verify 功能
      await ctx.reply(
        '🔄 /status 功能已整合到 /verify 中！\n\n' +
        '請使用 /verify 查看您的驗證狀態和進度。',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📊 查看狀態', callback_data: 'redirect_to_verify' }]
            ]
          }
        }
      );

    } catch (error) {
      logger.error('Error in status command redirect:', error);
      await ctx.reply('❌ 請使用 /verify 查看狀態。');
    }
  });

  // Profile command - 重定向到 SBT
  bot.command('profile', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'profile_command_redirect');

      await ctx.reply(
        '📋 個人資料功能已整合到 SBT 管理中！\n\n' +
        '請使用 /sbt 命令查看您的完整個人資料、驗證狀態和 SBT 信息。',
        Markup.inlineKeyboard([
          [Markup.button.callback('🏆 查看 SBT 和個人資料', 'redirect_to_sbt')],
          [Markup.button.callback('🏠 主選單', 'flow_main')]
        ])
      );

    } catch (error) {
      logger.error('Error in profile command redirect:', error);
      await ctx.reply('❌ 請使用 /sbt 命令查看您的個人資料。');
    }
  });

  // SBT command - 整合個人資料和 SBT 管理
  bot.command('sbt', async (ctx) => {
    try {
      const userId = ctx.from.id;
      logger.userAction(userId, 'sbt_command');

      const session = await getUserSession(userId);
      const language = session?.language || 'zh-TW';

      // 檢查用戶是否已開始使用系統
      if (!session) {
        await ctx.reply(
          '🔐 請先使用 /start 開始您的 Twin Gate 驗證之旅！',
          Markup.inlineKeyboard([
            [Markup.button.callback('🚀 開始使用', 'flow_main')]
          ])
        );
        return;
      }

      try {
        // 獲取完整的用戶資料和 SBT 信息
        const profileResult = await sbtService.getUserProfileAndSBT(userId);

        if (profileResult.success) {
          const profileData = profileResult.data;

          // 格式化完整的個人資料信息
          const message = sbtService.formatCompleteProfile(profileData, language);

          // 生成動態按鈕
          const buttonData = sbtService.generateSBTButtons(profileData, language);

          // 轉換按鈕格式為 Telegraf 格式
          const keyboard = buttonData.map(row =>
            row.map(btn =>
              btn.url ?
                Markup.button.url(btn.text, btn.url) :
                Markup.button.callback(btn.text, btn.callback_data)
            )
          );

          await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(keyboard));

        } else {
          throw new Error(profileResult.error || 'Failed to get profile and SBT information');
        }

      } catch (error) {
        logger.error('Error getting SBT and profile info:', error);

        // 提供備用選項
        await ctx.reply(
          '❌ 無法載入 SBT 和個人資料信息。\n\n' +
          '請稍後再試，或使用下方按鈕：',
          Markup.inlineKeyboard([
            [Markup.button.callback('🔄 重試', 'retry_sbt_load')],
            [Markup.button.callback('🚀 開始驗證', 'flow_verify')],
            [Markup.button.callback('🏠 主選單', 'flow_main')]
          ])
        );
      }

    } catch (error) {
      logger.error('Error in sbt command:', error);
      await ctx.reply('❌ SBT 系統暫時無法使用，請稍後再試。');
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
        [Markup.button.callback('🚀 開始驗證', 'start_twin3_verification')]
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

  // Group stats command (for group admins)
  bot.command('groupstats', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;

      logger.userAction(userId, 'groupstats_command', {
        chatId,
        chatType
      });

      // 只在群組中使用
      if (!ctx.isGroupChat) {
        await ctx.reply('❌ 此命令只能在群組中使用。');
        return;
      }

      // 檢查用戶是否為群組管理員
      try {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        if (!['administrator', 'creator'].includes(member.status)) {
          await ctx.reply('❌ 只有群組管理員可以查看統計資料。');
          return;
        }
      } catch (error) {
        logger.error('Error checking admin status:', error);
        await ctx.reply('❌ 無法驗證管理員權限。');
        return;
      }

      // 獲取群組統計
      const statsResult = groupService.getGroupStats(chatId.toString());

      if (statsResult.success) {
        const stats = statsResult.data;
        const message = `📊 **群組驗證統計**\n\n` +
          `🏷️ **群組**: ${stats.title}\n` +
          `🆔 **ID**: \`${stats.chatId}\`\n\n` +
          `✅ **驗證統計**:\n` +
          `• 總驗證次數: ${stats.verificationCount}\n` +
          `• 群組成員數: ${stats.memberCount}\n\n` +
          `📅 **時間資訊**:\n` +
          `• 註冊時間: ${new Date(stats.registeredAt).toLocaleString('zh-TW')}\n` +
          `• 最後活動: ${stats.lastActivity ? new Date(stats.lastActivity).toLocaleString('zh-TW') : '無'}\n\n` +
          `🔄 **狀態**: ${stats.isActive ? '✅ 啟用' : '❌ 停用'}`;

        await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
          [Markup.button.callback('🔄 重新整理', 'refresh_group_stats')],
          [Markup.button.callback('📊 詳細報告', 'detailed_group_report')]
        ]));
      } else {
        await ctx.reply('❌ 無法獲取群組統計資料。請確保群組已註冊到 Twin Gate 系統。');
      }

    } catch (error) {
      logger.error('Error in groupstats command:', error);
      await ctx.reply('❌ 群組統計指令執行失敗。請稍後再試。');
    }
  });

  // Register group command (for group admins)
  bot.command('registergroup', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;

      logger.userAction(userId, 'registergroup_command', {
        chatId,
        chatType
      });

      // 只在群組中使用
      if (!ctx.isGroupChat) {
        await ctx.reply('❌ 此命令只能在群組中使用。');
        return;
      }

      // 檢查用戶是否為群組管理員
      try {
        const member = await ctx.telegram.getChatMember(chatId, userId);
        if (!['administrator', 'creator'].includes(member.status)) {
          await ctx.reply('❌ 只有群組管理員可以註冊群組。');
          return;
        }
      } catch (error) {
        logger.error('Error checking admin status:', error);
        await ctx.reply('❌ 無法驗證管理員權限。');
        return;
      }

      // 檢查群組是否已註冊
      if (groupService.isGroupRegistered(chatId.toString())) {
        await ctx.reply('✅ 此群組已經註冊到 Twin Gate 系統。');
        return;
      }

      // 註冊群組
      const groupInfo = {
        chatId: chatId.toString(),
        title: ctx.chat.title,
        username: ctx.chat.username,
        type: chatType
      };

      const result = await groupService.registerGroup(groupInfo, userId);

      if (result.success) {
        const message = `🎉 **群組註冊成功！**\n\n` +
          `🏷️ **群組**: ${ctx.chat.title}\n` +
          `🆔 **ID**: \`${chatId}\`\n` +
          `👤 **註冊者**: ${ctx.from.first_name}\n\n` +
          `✅ **功能已啟用**:\n` +
          `• 用戶來源追蹤\n` +
          `• 驗證統計\n` +
          `• 群組管理\n\n` +
          `📝 **可用命令**:\n` +
          `• \`/groupstats\` - 查看群組統計\n` +
          `• \`/start\` - 開始驗證流程`;

        await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
          [Markup.button.callback('📊 查看統計', 'view_group_stats')],
          [Markup.button.url('📚 使用指南', 'https://docs.twingate.com/group-guide')]
        ]));
      } else {
        await ctx.reply(`❌ 群組註冊失敗: ${result.error}`);
      }

    } catch (error) {
      logger.error('Error in registergroup command:', error);
      await ctx.reply('❌ 群組註冊指令執行失敗。請稍後再試。');
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
