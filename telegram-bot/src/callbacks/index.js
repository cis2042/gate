const { Markup } = require('telegraf');
const logger = require('../utils/logger');
const apiClient = require('../services/apiClient');
const { getUserSession, updateUserSession, setUserState, clearUserState } = require('../utils/session');
const { formatUserProfile, formatVerificationStatus, formatSBTInfo } = require('../utils/formatters');
const { t, getSupportedLanguages, isLanguageSupported } = require('../locales');
const {
  createMainMenu,
  createVerificationLevelMenu,
  createVerificationInProgressMenu,
  createLanguageMenu
} = require('../utils/persistentMenu');
const {
  getUserVerificationStatus,
  startLevelVerification,
  markLevelCompleted,
  canUserAccessLevel
} = require('../utils/userStatus');
const {
  checkSBTStatus,
  requestSBTMint,
  checkMintStatus,
  getSBTDetails,
  formatTwin3SBTInfo
} = require('../services/sbtService');
const {
  createMainKeyboard,
  createVerificationKeyboard,
  createSBTKeyboard,
  createProfileKeyboard,
  createSettingsKeyboard
} = require('../utils/keyboards');
const groupService = require('../services/groupService');
const verificationFlowService = require('../services/verificationFlowService');
const sbtService = require('../services/sbtService');

// Helper functions from commands
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
    [Markup.button.callback('🚀 Start Verification', 'start_verification')],
    [Markup.button.callback('🌐 Language Settings', 'menu_language')]
  ]));
}

async function showVerificationTask(ctx, language) {
  const userId = ctx.from.id;
  const userStatus = await getUserVerificationStatus(userId);

  // 使用多語言系統
  const taskMessage = t('verification.task_title', language) + '\n\n' +
    t('verification.task_description', language) + '\n\n' +
    t('verification.task_info', language) + '\n\n' +
    `**${t('verification.current_level', language)}:**\n` +
    `${userStatus.verificationLevel >= 1 ? '✅' : '⭕'} Level 1 - ${t('verification.level1.description', language)}\n` +
    `${userStatus.verificationLevel >= 2 ? '✅' : '⭕'} Level 2 - ${t('verification.level2.description', language)}\n` +
    `${userStatus.verificationLevel >= 3 ? '✅' : '⭕'} Level 3 - ${t('verification.level3.description', language)}\n\n` +
    t('verification.requirement', language) + '\n\n' +
    `👇 **${t('buttons.start_verification', language)}:**`;

  // 創建直接驗證按鈕（不需要進入選單）
  const buttons = [];

  // Level 1 按鈕
  if (userStatus.verificationLevel < 1) {
    buttons.push([Markup.button.callback(
      `🟢 ${t('verification.level1.button', language)}`,
      'start_level_1'
    )]);
  } else {
    buttons.push([Markup.button.callback(
      `✅ Level 1 - ${t('verification.level1.title', language)}`,
      'level_1_completed'
    )]);
  }

  // Level 2 按鈕
  if (userStatus.verificationLevel < 2) {
    if (userStatus.verificationLevel >= 1) {
      buttons.push([Markup.button.callback(
        `🟡 ${t('verification.level2.button', language)}`,
        'start_level_2'
      )]);
    } else {
      buttons.push([Markup.button.callback(
        `🔒 Level 2 - ${t('verification.level2.title', language)}`,
        'level_locked'
      )]);
    }
  } else {
    buttons.push([Markup.button.callback(
      `✅ Level 2 - ${t('verification.level2.title', language)}`,
      'level_2_completed'
    )]);
  }

  // Level 3 按鈕
  if (userStatus.verificationLevel < 3) {
    if (userStatus.verificationLevel >= 2) {
      buttons.push([Markup.button.callback(
        `🔴 ${t('verification.level3.button', language)}`,
        'start_level_3'
      )]);
    } else {
      buttons.push([Markup.button.callback(
        `🔒 Level 3 - ${t('verification.level3.title', language)}`,
        'level_locked'
      )]);
    }
  } else {
    buttons.push([Markup.button.callback(
      `✅ Level 3 - ${t('verification.level3.title', language)}`,
      'level_3_completed'
    )]);
  }

  // 返回主選單按鈕
  buttons.push([Markup.button.callback(
    t('buttons.back_to_main', language),
    'back_to_main'
  )]);

  await ctx.editMessageText(taskMessage, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard(buttons)
  });
}

function setupCallbacks(bot) {
  // 統一流程回調處理器

  // 流程語言選擇
  bot.action(/^flow_lang_(.+)$/, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const languageCode = ctx.match[1];

      logger.userAction(userId, 'flow_language_selection', { language: languageCode });

      await ctx.answerCbQuery('✅ 語言設定完成！');

      // 更新用戶會話
      await updateUserSession(userId, { language: languageCode });

      // 直接進入驗證流程，不需要延遲
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');

    } catch (error) {
      logger.error('Error in flow language selection:', error);
      await ctx.answerCbQuery('❌ 語言設定失敗');
    }
  });

  // 流程主選單
  bot.action('flow_main', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'start');
    } catch (error) {
      logger.error('Error in flow_main callback:', error);
      await ctx.answerCbQuery('❌ 載入主選單失敗');
    }
  });

  // 流程驗證
  bot.action('flow_verify', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');
    } catch (error) {
      logger.error('Error in flow_verify callback:', error);
      await ctx.answerCbQuery('❌ 載入驗證流程失敗');
    }
  });

  // 流程儀表板
  bot.action('flow_dashboard', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'status');
    } catch (error) {
      logger.error('Error in flow_dashboard callback:', error);
      await ctx.answerCbQuery('❌ 載入儀表板失敗');
    }
  });

  // 流程重試
  bot.action('flow_retry', async (ctx) => {
    try {
      await ctx.answerCbQuery('🔄 正在重試...');

      // 獲取用戶最後的命令
      const session = await getUserSession(ctx.from.id);
      const lastCommand = session?.lastCommand || 'start';

      await verificationFlowService.handleUnifiedFlow(ctx, lastCommand);
    } catch (error) {
      logger.error('Error in flow_retry callback:', error);
      await ctx.answerCbQuery('❌ 重試失敗');
    }
  });

  // 開始驗證 (英文)
  bot.action('start_verification_en', async (ctx) => {
    try {
      const userId = ctx.from.id;
      await ctx.answerCbQuery('✅ Language set to English!');

      // 設置默認語言為英文
      await updateUserSession(userId, { language: 'en-US' });

      // 直接進入驗證流程
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');

    } catch (error) {
      logger.error('Error in start_verification_en callback:', error);
      await ctx.answerCbQuery('❌ Failed to start verification');
    }
  });

  // 語言設定
  bot.action('language_settings', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const { getSupportedLanguages } = require('../locales');
      const supportedLanguages = getSupportedLanguages();

      const message = `🌍 **Language Settings**\n\n` +
        `Please select your preferred language:\n` +
        `請選擇您的語言：`;

      const languageButtons = [];
      for (let i = 0; i < supportedLanguages.length; i += 2) {
        const row = [];
        const lang1 = supportedLanguages[i];
        const lang2 = supportedLanguages[i + 1];

        row.push(Markup.button.callback(lang1.name, `flow_lang_${lang1.code}`));
        if (lang2) {
          row.push(Markup.button.callback(lang2.name, `flow_lang_${lang2.code}`));
        }
        languageButtons.push(row);
      }

      // 添加返回按鈕
      languageButtons.push([Markup.button.callback('🔙 Back', 'back_to_welcome')]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(languageButtons)
      });

    } catch (error) {
      logger.error('Error in language_settings callback:', error);
      await ctx.answerCbQuery('❌ Failed to load language settings');
    }
  });

  // 返回歡迎頁面
  bot.action('back_to_welcome', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'start');
    } catch (error) {
      logger.error('Error in back_to_welcome callback:', error);
      await ctx.answerCbQuery('❌ Failed to go back');
    }
  });

  // 重定向到 verify
  bot.action('redirect_to_verify', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');
    } catch (error) {
      logger.error('Error in redirect_to_verify callback:', error);
      await ctx.answerCbQuery('❌ 重定向失敗');
    }
  });

  // 主選單回調處理器
  bot.action('menu_verification', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');
    } catch (error) {
      logger.error('Error in menu_verification callback:', error);
      await ctx.answerCbQuery('❌ 載入驗證選單失敗');
    }
  });

  // 返回主選單
  bot.action('back_to_main', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await verificationFlowService.handleUnifiedFlow(ctx, 'start');
    } catch (error) {
      logger.error('Error in back_to_main callback:', error);
      await ctx.answerCbQuery('❌ 返回主選單失敗');
    }
  });

  // 返回驗證選單
  bot.action('back_to_verification', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      // 使用統一驗證流程服務
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');

    } catch (error) {
      logger.error('Error in back_to_verification callback:', error);
      await ctx.answerCbQuery(t('errors.general', session?.language || 'en-US'));
    }
  });

  // 語言選擇選單
  bot.action('menu_language', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      const supportedLanguages = getSupportedLanguages();
      const message = '🌐 ' + t('welcome.language_selection', language).split('\n\n')[1];

      await ctx.editMessageText(message, {
        reply_markup: createLanguageMenu(supportedLanguages)
      });

    } catch (error) {
      logger.error('Error in menu_language callback:', error);
      const session = await getUserSession(ctx.from.id);
      await ctx.answerCbQuery(t('errors.general', session?.language || 'en-US'));
    }
  });

  // Language selection callbacks
  bot.action(/^lang_(.+)$/, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const languageCode = ctx.match[1];

      logger.userAction(userId, 'language_selection', { language: languageCode });

      await ctx.answerCbQuery();

      if (!isLanguageSupported(languageCode)) {
        await ctx.reply('❌ Unsupported language selected.');
        return;
      }

      // Update user session with selected language
      await updateUserSession(userId, { language: languageCode });

      // Show success message
      await ctx.reply(t('success.language_set', languageCode));

      // Show main welcome message
      const firstName = ctx.from.first_name;
      await showMainWelcome(ctx, languageCode, firstName);

    } catch (error) {
      logger.error('Error in language selection callback:', error);
      await ctx.reply('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // Level verification callbacks
  bot.action(/^verify_level_(\d+)$/, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const level = parseInt(ctx.match[1]);

      logger.userAction(userId, 'verify_level', { level });

      await ctx.answerCbQuery();

      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      if (!session?.language) {
        await ctx.reply(t('errors.auth_required', language));
        return;
      }

      // 檢查使用者是否可以進行此等級驗證
      const canAccess = await canUserAccessLevel(userId, level);
      if (!canAccess) {
        await ctx.answerCbQuery(`🔒 ${t('errors.auth_required', language)}`);
        return;
      }

      // Generate verification URL
      try {
        const response = await apiClient.startVerification({
          platform: 'telegram',
          userId: userId.toString(),
          username: ctx.from.username || ctx.from.first_name,
          level: level
        });

        if (response.success) {
          // 更新使用者狀態為驗證進行中
          await startLevelVerification(userId, level, {
            token: response.data.verificationToken,
            url: response.data.verificationUrl,
            expiresAt: response.data.expiresAt
          });

          const verificationMessage = `🔐 **Level ${level} 驗證**\n\n` +
            t('verification.verification_url', language, {
              url: response.data.verificationUrl
            });

          await ctx.editMessageText(verificationMessage, {
            parse_mode: 'Markdown',
            reply_markup: createVerificationInProgressMenu(language, level, response.data.verificationUrl)
          });

        } else {
          throw new Error(response.message || 'Failed to start verification');
        }
      } catch (error) {
        logger.error('Error starting verification:', error);
        await ctx.answerCbQuery(t('errors.api_error', language));
      }

    } catch (error) {
      logger.error('Error in level verification callback:', error);
      await ctx.answerCbQuery('❌ Sorry, something went wrong. Please try again later.');
    }
  });

  // 檢查等級驗證狀態
  bot.action(/^check_level_(\d+)_status$/, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const level = parseInt(ctx.match[1]);

      await ctx.answerCbQuery();

      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';
      const userStatus = await getUserVerificationStatus(userId);

      if (!userStatus.currentVerification || userStatus.currentVerification.level !== level) {
        await ctx.answerCbQuery('❌ 找不到進行中的驗證');
        return;
      }

      // 檢查驗證狀態
      try {
        const response = await apiClient.checkVerificationStatus(userStatus.currentVerification.token);

        if (response.success && response.data.status === 'completed' && response.data.passed) {
          // 驗證成功，標記等級為已完成
          await markLevelCompleted(userId, level, {
            humanityIndex: response.data.humanityIndex,
            completedAt: response.data.completedAt,
            verificationData: response.data
          });

          const updatedStatus = await getUserVerificationStatus(userId);

          let successMessage = `🎉 **Level ${level} 驗證成功！**\n\n` +
            `🎯 Humanity Index: ${response.data.humanityIndex}/255\n` +
            `📊 當前等級: ${updatedStatus.verificationLevel}/3\n\n`;

          if (level >= 2 && !updatedStatus.hasSBT) {
            // Level 2 完成，提醒可以鑄造 SBT
            successMessage += `🏆 **恭喜！您現在可以鑄造 Twin3 SBT！**\n\n` +
              `✅ 您已完成 Level 2 驗證，符合 SBT 鑄造條件\n` +
              `💎 Your exclusive SBT will be minted automatically\n\n`;
          }

          // 智能引導到下一步
          const buttons = [];
          if (updatedStatus.currentLevel <= 3) {
            successMessage += `✨ 您現在可以進行 Level ${updatedStatus.currentLevel} 驗證！`;
            buttons.push([Markup.button.callback(`🚀 繼續 Level ${updatedStatus.currentLevel}`, `start_level_${updatedStatus.currentLevel}`)]);
          } else {
            successMessage += '🏆 恭喜！您已完成所有驗證等級！';
          }

          // 如果可以鑄造 SBT，添加鑄造按鈕
          if (level >= 2 && !updatedStatus.hasSBT) {
            buttons.push([Markup.button.callback('🏆 立即鑄造 SBT', 'mint_sbt')]);
          }

          buttons.push([Markup.button.callback('📊 查看儀表板', 'flow_dashboard')]);
          buttons.push([Markup.button.callback('🏠 主選單', 'flow_main')]);

          await ctx.editMessageText(successMessage, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
          });

        } else if (response.success && response.data.status === 'failed') {
          // 驗證失敗
          const failMessage = `❌ **Level ${level} 驗證未通過**\n\n` +
            `🎯 Humanity Index: ${response.data.humanityIndex}/255\n` +
            `📊 需要分數: ≥100\n\n` +
            '💡 您可以重新嘗試驗證來提高分數。';

          await ctx.editMessageText(failMessage, {
            parse_mode: 'Markdown',
            reply_markup: createVerificationLevelMenu(language, userStatus.verificationLevel, userStatus.currentLevel)
          });

        } else {
          // 驗證仍在進行中
          await ctx.answerCbQuery('⏳ 驗證仍在進行中，請稍後再檢查');
        }

      } catch (error) {
        logger.error('Error checking verification status:', error);
        await ctx.answerCbQuery('❌ 無法檢查驗證狀態');
      }

    } catch (error) {
      logger.error('Error in check level status callback:', error);
      await ctx.answerCbQuery('❌ 檢查狀態時發生錯誤');
    }
  });

  // 開始 Level 1 驗證
  bot.action('start_level_1', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      // 生成 Level 1 驗證 URL
      try {
        const response = await apiClient.startVerification({
          platform: 'telegram',
          userId: userId.toString(),
          username: ctx.from.username || ctx.from.first_name,
          level: 1
        });

        if (response.success) {
          const verificationMessage = t('verification.verification_in_progress.level1_title', language) + '\n\n' +
            t('verification.verification_in_progress.click_link', language) + '\n\n' +
            `🔗 [${t('verification.level1.button', language)}](${response.data.verificationUrl})\n\n` +
            t('verification.verification_in_progress.link_expires', language) + '\n' +
            t('verification.verification_in_progress.complete_and_return', language);

          await ctx.editMessageText(verificationMessage, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🚀 開始驗證', response.data.verificationUrl)],
              [Markup.button.callback('🔄 檢查狀態', `check_level_${1}_status`)],
              [Markup.button.callback('🔙 返回驗證選單', 'back_to_verification')]
            ])
          });

          // 更新使用者狀態
          await startLevelVerification(userId, 1, {
            token: response.data.verificationToken,
            url: response.data.verificationUrl,
            expiresAt: response.data.expiresAt
          });

        } else {
          throw new Error(response.message || 'Failed to start verification');
        }
      } catch (error) {
        logger.error('Error starting Level 1 verification:', error);
        await ctx.answerCbQuery(t('errors.api_error', language));
      }

    } catch (error) {
      logger.error('Error in start_level_1 callback:', error);
      await ctx.answerCbQuery(t('errors.general', language));
    }
  });

  // 開始 Level 2 驗證
  bot.action('start_level_2', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';
      const userStatus = await getUserVerificationStatus(userId);

      await ctx.answerCbQuery();

      // 檢查是否已完成 Level 1
      if (userStatus.verificationLevel < 1) {
        await ctx.answerCbQuery(t('buttons.complete_previous_level', language));
        return;
      }

      // 生成 Level 2 驗證 URL
      try {
        const response = await apiClient.startVerification({
          platform: 'telegram',
          userId: userId.toString(),
          username: ctx.from.username || ctx.from.first_name,
          level: 2
        });

        if (response.success) {
          const verificationMessage = t('verification.verification_in_progress.level2_title', language) + '\n\n' +
            t('verification.verification_in_progress.click_link', language) + '\n\n' +
            `🔗 [${t('verification.level2.button', language)}](${response.data.verificationUrl})\n\n` +
            t('verification.verification_in_progress.link_expires', language) + '\n' +
            t('verification.verification_in_progress.complete_and_return', language) + '\n\n' +
            t('verification.verification_in_progress.level2_sbt_note', language);

          await ctx.editMessageText(verificationMessage, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🚀 開始驗證', response.data.verificationUrl)],
              [Markup.button.callback('🔄 檢查狀態', `check_level_${2}_status`)],
              [Markup.button.callback('🔙 返回驗證選單', 'back_to_verification')]
            ])
          });

          // 更新使用者狀態
          await startLevelVerification(userId, 2, {
            token: response.data.verificationToken,
            url: response.data.verificationUrl,
            expiresAt: response.data.expiresAt
          });

        } else {
          throw new Error(response.message || 'Failed to start verification');
        }
      } catch (error) {
        logger.error('Error starting Level 2 verification:', error);
        await ctx.answerCbQuery('❌ 無法開始驗證，請稍後再試');
      }

    } catch (error) {
      logger.error('Error in start_level_2 callback:', error);
      await ctx.answerCbQuery('❌ 發生錯誤');
    }
  });

  // 開始 Level 3 驗證
  bot.action('start_level_3', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';
      const userStatus = await getUserVerificationStatus(userId);

      await ctx.answerCbQuery();

      // 檢查是否已完成 Level 2
      if (userStatus.verificationLevel < 2) {
        await ctx.answerCbQuery('🔒 請先完成 Level 2 驗證');
        return;
      }

      // 生成 Level 3 驗證 URL
      try {
        const response = await apiClient.startVerification({
          platform: 'telegram',
          userId: userId.toString(),
          username: ctx.from.username || ctx.from.first_name,
          level: 3
        });

        if (response.success) {
          const verificationMessage = `🔐 **Level 3 驗證 - 生物識別**\n\n` +
            `✅ 點擊下方連結開始驗證：\n\n` +
            `🔗 [開始 Level 3 驗證](${response.data.verificationUrl})\n\n` +
            `⏰ 驗證連結有效期：15 分鐘\n` +
            `📱 請在新視窗中完成驗證後返回此處檢查狀態\n\n` +
            `🏆 完成 Level 3 可獲得最高 Humanity Index！`;

          await ctx.editMessageText(verificationMessage, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🚀 開始驗證', response.data.verificationUrl)],
              [Markup.button.callback('🔄 檢查狀態', `check_level_${3}_status`)],
              [Markup.button.callback('🔙 返回驗證選單', 'back_to_verification')]
            ])
          });

          // 更新使用者狀態
          await startLevelVerification(userId, 3, {
            token: response.data.verificationToken,
            url: response.data.verificationUrl,
            expiresAt: response.data.expiresAt
          });

        } else {
          throw new Error(response.message || 'Failed to start verification');
        }
      } catch (error) {
        logger.error('Error starting Level 3 verification:', error);
        await ctx.answerCbQuery('❌ 無法開始驗證，請稍後再試');
      }

    } catch (error) {
      logger.error('Error in start_level_3 callback:', error);
      await ctx.answerCbQuery('❌ 發生錯誤');
    }
  });

  // 鎖定的等級按鈕
  bot.action('level_locked', async (ctx) => {
    const userId = ctx.from.id;
    const session = await getUserSession(userId);
    const language = session?.language || 'en-US';
    await ctx.answerCbQuery(t('buttons.complete_previous_level', language));
  });

  // 已完成的等級按鈕
  bot.action(/^level_(\d+)_completed$/, async (ctx) => {
    const level = ctx.match[1];
    const userId = ctx.from.id;
    const session = await getUserSession(userId);
    const language = session?.language || 'en-US';
    await ctx.answerCbQuery(t('buttons.level_completed', language, { level }));
  });

  // SBT 選單處理器
  bot.action('menu_sbt', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      if (!session?.token) {
        await ctx.editMessageText(
          t('errors.auth_required', language),
          {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
            ])
          }
        );
        return;
      }

      // 獲取 SBT 詳細資訊
      try {
        const sbtDetails = await getSBTDetails(userId);
        const sbtMessage = formatTwin3SBTInfo(sbtDetails, language);

        const buttons = [];

        if (sbtDetails.hasSBT) {
          // 已有 SBT，顯示詳細資訊和管理選項
          buttons.push([
            Markup.button.callback('🔄 重新整理狀態', 'refresh_sbt_status'),
            Markup.button.callback('📋 查看詳細資訊', 'view_sbt_details')
          ]);
          if (sbtDetails.walletAddress) {
            buttons.push([
              Markup.button.url('🔗 查看錢包', `https://etherscan.io/address/${sbtDetails.walletAddress}`)
            ]);
          }
        } else if (sbtDetails.eligibleForMint) {
          // 可以鑄造 SBT
          buttons.push([
            Markup.button.callback('🎯 立即鑄造 SBT', 'mint_sbt')
          ]);
        } else {
          // 尚未符合條件
          buttons.push([
            Markup.button.callback('🚀 開始驗證', 'menu_verification')
          ]);
        }

        buttons.push([
          Markup.button.callback('🔙 返回主選單', 'back_to_main')
        ]);

        await ctx.editMessageText(sbtMessage, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(buttons)
        });

      } catch (error) {
        logger.error('Error getting SBT details:', error);
        await ctx.editMessageText(
          '❌ 無法載入 SBT 資訊，請稍後再試。',
          {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔄 重試', 'menu_sbt')],
              [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
            ])
          }
        );
      }

    } catch (error) {
      logger.error('Error in menu_sbt callback:', error);
      await ctx.answerCbQuery('❌ 載入 SBT 選單時發生錯誤');
    }
  });

  // SBT 鎖定狀態
  bot.action('sbt_locked', async (ctx) => {
    await ctx.answerCbQuery('🔒 完成 Level 2 驗證後即可解鎖 SBT 功能');
  });

  // 鑄造 SBT
  bot.action('mint_sbt', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      try {
        const mintResult = await requestSBTMint(userId);

        if (mintResult.success) {
          const mintMessage = `🎯 **SBT 鑄造已開始！**\n\n` +
            `✅ 鑄造請求已提交\n` +
            `🏭 請求 ID：${mintResult.data.mintRequestId}\n` +
            `💰 錢包地址：\n\`${mintResult.data.walletAddress}\`\n` +
            `⏰ 預計完成時間：${mintResult.data.estimatedMintTime || '5-10 分鐘'}\n\n` +
            `🔄 Twin3.ai 正在為您生成專屬錢包並鑄造 SBT...\n\n` +
            `💡 您可以點擊下方按鈕檢查鑄造進度。`;

          await ctx.editMessageText(mintMessage, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 返回 SBT 選單', 'menu_sbt')]
            ])
          });
        }

      } catch (error) {
        logger.error('Error minting SBT:', error);

        let errorMessage = '❌ 鑄造 SBT 時發生錯誤：\n\n';
        if (error.message.includes('not eligible')) {
          errorMessage += '🔒 您尚未符合 SBT 鑄造條件。請先完成 Level 2 驗證。';
        } else if (error.message.includes('already has')) {
          errorMessage += '✅ 您已經擁有 SBT 了！';
        } else {
          errorMessage += '🔧 系統暫時無法處理您的請求，請稍後再試。';
        }

        await ctx.editMessageText(errorMessage, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔄 重試', 'mint_sbt')],
            [Markup.button.callback('🔙 返回 SBT 選單', 'menu_sbt')]
          ])
        });
      }

    } catch (error) {
      logger.error('Error in mint_sbt callback:', error);
      await ctx.answerCbQuery('❌ 鑄造 SBT 時發生錯誤');
    }
  });

  // 檢查鑄造狀態
  bot.action('check_mint_status', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      try {
        const mintStatus = await checkMintStatus(userId);

        let statusMessage = '';
        let buttons = [];

        switch (mintStatus.status) {
          case 'pending':
            statusMessage = `⏳ **SBT 鑄造進行中**\n\n` +
              `🔄 狀態：處理中\n` +
              `⏰ 請耐心等待，通常需要 5-10 分鐘\n\n` +
              `💡 Twin3.ai 正在區塊鏈上為您鑄造專屬的 SBT...`;

            buttons = [
              [Markup.button.callback('🔙 返回 SBT 選單', 'menu_sbt')]
            ];
            break;

          case 'completed':
            statusMessage = `🎉 **SBT 鑄造成功！**\n\n` +
              `✅ 您的 Twin3 SBT 已成功鑄造\n` +
              `💎 Token ID：${mintStatus.tokenId}\n` +
              `📍 SBT 地址：\n\`${mintStatus.sbtAddress}\`\n` +
              `🔗 交易哈希：\n\`${mintStatus.txHash}\`\n\n` +
              `🏆 恭喜！您現在擁有專屬的人類身份證明！`;

            buttons = [
              [Markup.button.callback('🏆 查看 SBT 詳情', 'view_sbt_details')],
              [Markup.button.url('🔗 查看交易', `https://etherscan.io/tx/${mintStatus.txHash}`)],
              [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
            ];
            break;

          case 'failed':
            statusMessage = `❌ **SBT 鑄造失敗**\n\n` +
              `🔧 錯誤原因：${mintStatus.error || '未知錯誤'}\n\n` +
              `💡 請稍後重新嘗試鑄造。`;

            buttons = [
              [Markup.button.callback('🔄 重新鑄造', 'mint_sbt')],
              [Markup.button.callback('🔙 返回 SBT 選單', 'menu_sbt')]
            ];
            break;

          default:
            statusMessage = `❓ **未知狀態**\n\n` +
              `🔧 無法確定鑄造狀態，請聯繫客服。`;

            buttons = [
              [Markup.button.callback('🔙 返回 SBT 選單', 'menu_sbt')]
            ];
        }

        await ctx.editMessageText(statusMessage, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(buttons)
        });

      } catch (error) {
        logger.error('Error checking mint status:', error);
        await ctx.editMessageText(
          '❌ 無法檢查鑄造狀態，請稍後再試。',
          {
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 返回 SBT 選單', 'menu_sbt')]
            ])
          }
        );
      }

    } catch (error) {
      logger.error('Error in check_mint_status callback:', error);
      await ctx.answerCbQuery('❌ 檢查鑄造狀態時發生錯誤');
    }
  });

  // Main menu callback
  bot.action('main_menu', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const welcomeMessage = `
🚪 *Twin Gate - Main Menu*

Welcome back! Choose what you'd like to do:

✅ *Verification* - Complete identity verification
📊 *Status* - Check your progress
👤 *Profile* - Manage your account
🏆 *SBT* - View your Soul Bound Token
      `;

      await ctx.editMessageText(welcomeMessage, {
        parse_mode: 'Markdown',
        ...createMainKeyboard()
      });

    } catch (error) {
      logger.error('Error in main_menu callback:', error);
      await ctx.answerCbQuery('❌ Error loading main menu');
    }
  });

  // Start verification callback
  bot.action('start_verification', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      if (!session?.language) {
        await ctx.editMessageText(
          t('errors.auth_required', language),
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔙 Back', 'main_menu')]
            ])
          }
        );
        return;
      }

      // Show Twin3.ai verification task
      await showVerificationTask(ctx, language);

    } catch (error) {
      logger.error('Error in start_verification callback:', error);
      await ctx.answerCbQuery('❌ Error starting verification');
    }
  });

  // Check status callback - 重定向到 verify
  bot.action('check_status', async (ctx) => {
    try {
      await ctx.answerCbQuery('🔄 重定向到驗證功能...');
      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');
    } catch (error) {
      logger.error('Error in check_status redirect:', error);
      await ctx.answerCbQuery('❌ 重定向失敗');
    }
  });

  // Learn more callback - 重定向到 help
  bot.action('learn_more', async (ctx) => {
    try {
      await ctx.answerCbQuery('ℹ️ 查看幫助信息...');

      const helpMessage = `❓ **Twin Gate Bot Help**\n\n` +
        `🔐 **Human Identity Verification**\n` +
        `Prove your humanity and earn your digital identity through simple verification tasks.\n\n` +
        `**Available Commands:**\n` +
        `/verify - 🚀 Start verification\n` +
        `/sbt - 🏆 View your SBT\n` +
        `/help - ❓ Show this help\n\n` +
        `**Verification Levels:**\n` +
        `• Level 1 - Google reCAPTCHA\n` +
        `• Level 2 - SMS Verification\n` +
        `• Level 3 - Biometric Authentication\n\n` +
        `**Getting Started:**\n` +
        `1. Use 🚀 /verify to start\n` +
        `2. Complete levels in order\n` +
        `3. Mint SBT after Level 2\n` +
        `4. Achieve maximum score with Level 3\n\n` +
        `**Privacy:**\n` +
        `Your data is secure. We only store necessary verification information.`;

      await ctx.editMessageText(helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('🌐 Official Website', 'https://twin3.ai')],
          [Markup.button.url('📚 Documentation', 'https://docs.twin3.ai')],
          [Markup.button.url('💬 Support', 'https://t.me/twin3support')],
          [Markup.button.callback('🚀 Start Verification', 'redirect_to_verify')]
        ])
      });
    } catch (error) {
      logger.error('Error in learn_more redirect:', error);
      await ctx.answerCbQuery('❌ 載入幫助信息失敗');
    }
  });

  // View profile callback
  bot.action('view_profile', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from.id;
      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.editMessageText(
          '🔐 You need to register first.',
          {
            ...Markup.inlineKeyboard([
              [Markup.button.callback('📝 Register', 'register')],
              [Markup.button.callback('🔙 Back', 'main_menu')]
            ])
          }
        );
        return;
      }

      try {
        const profileResponse = await apiClient.getUserProfile(session.token);

        if (profileResponse.success) {
          const message = formatUserProfile(profileResponse.data.user);
          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...createProfileKeyboard()
          });
        } else {
          throw new Error('Failed to get user profile');
        }
      } catch (error) {
        logger.error('Error getting user profile:', error);
        await ctx.editMessageText(
          '❌ Unable to load profile.',
          {
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Retry', 'view_profile')],
              [Markup.button.callback('🔙 Back', 'main_menu')]
            ])
          }
        );
      }

    } catch (error) {
      logger.error('Error in view_profile callback:', error);
      await ctx.answerCbQuery('❌ Error loading profile');
    }
  });

  // View SBT callback
  bot.action('view_sbt', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from.id;
      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.editMessageText(
          '🔐 You need to register first.',
          {
            ...Markup.inlineKeyboard([
              [Markup.button.callback('📝 Register', 'register')],
              [Markup.button.callback('🔙 Back', 'main_menu')]
            ])
          }
        );
        return;
      }

      try {
        const sbtResponse = await apiClient.getSBTInfo(session.token);

        if (sbtResponse.success) {
          const message = formatSBTInfo(sbtResponse.data);
          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...createSBTKeyboard(sbtResponse.data.hasSBT, sbtResponse.data.eligibleForMint)
          });
        } else {
          throw new Error('Failed to get SBT information');
        }
      } catch (error) {
        logger.error('Error getting SBT info:', error);
        await ctx.editMessageText(
          '❌ Unable to load SBT information.',
          {
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔄 Retry', 'view_sbt')],
              [Markup.button.callback('🔙 Back', 'main_menu')]
            ])
          }
        );
      }

    } catch (error) {
      logger.error('Error in view_sbt callback:', error);
      await ctx.answerCbQuery('❌ Error loading SBT info');
    }
  });

  // Register callback
  bot.action('register', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const message = `
📝 *Registration*

To get started with Twin Gate, I'll help you create an account.

Please provide the following information:
1. Username (will be generated from your Telegram username)
2. Email address
3. Password

Let's start with your email address.
      `;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📧 Enter Email', 'enter_email')],
          [Markup.button.callback('🔙 Back', 'main_menu')]
        ])
      });

      // Set user state for registration
      await setUserState(ctx.from.id, 'registering', { step: 'email' });

    } catch (error) {
      logger.error('Error in register callback:', error);
      await ctx.answerCbQuery('❌ Error starting registration');
    }
  });

  // Enter email callback
  bot.action('enter_email', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await ctx.editMessageText(
        '📧 *Enter Your Email*\n\nPlease send me your email address:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('❌ Cancel', 'main_menu')]
          ])
        }
      );

      await setUserState(ctx.from.id, 'awaiting_email');

    } catch (error) {
      logger.error('Error in enter_email callback:', error);
      await ctx.answerCbQuery('❌ Error');
    }
  });

  // 開始 Twin3 驗證回調
  bot.action('start_twin3_verification', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from.id;
      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 需要認證。請使用 /start 註冊。');
        return;
      }

      await createVerificationLink(ctx, session, userId);

    } catch (error) {
      logger.error('Error in start_twin3_verification callback:', error);
      await ctx.answerCbQuery('❌ 錯誤：無法開始驗證');
    }
  });

  // 創建驗證鏈接回調
  bot.action('create_verification_link', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from.id;
      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 需要認證。請使用 /start 註冊。');
        return;
      }

      await createVerificationLink(ctx, session, userId);

    } catch (error) {
      logger.error('Error in create_verification_link callback:', error);
      await ctx.answerCbQuery('❌ 錯誤：無法創建驗證鏈接');
    }
  });

  // 檢查驗證狀態回調
  bot.action('check_verification_status', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from.id;
      const session = await getUserSession(userId);

      if (!session?.token) {
        await ctx.reply('🔐 需要認證。請使用 /start 註冊。');
        return;
      }

      try {
        const statusResponse = await apiClient.getVerificationStatus(session.token);

        if (statusResponse.success) {
          const message = formatVerificationStatus(statusResponse.data);
          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
            ])
          });
        } else {
          throw new Error('無法獲取驗證狀態');
        }
      } catch (error) {
        logger.error('Error getting verification status:', error);
        await ctx.editMessageText('❌ 無法獲取驗證狀態。請稍後再試。');
      }

    } catch (error) {
      logger.error('Error in check_verification_status callback:', error);
      await ctx.answerCbQuery('❌ 錯誤：無法檢查驗證狀態');
    }
  });

  // Show help callback
  bot.action('show_help', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const helpMessage = `
❓ *Twin Gate Help*

*Available Commands:*
/start - Start your verification journey
/verify - Begin verification process
/status - Check verification status
/profile - View your profile
/sbt - View SBT information
/help - Show this help

*Need Support?*
Contact our support team for assistance.
      `;

      await ctx.editMessageText(helpMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('💬 Support Chat', 'https://t.me/twingate_support')],
          [Markup.button.url('📚 Documentation', 'https://docs.twingate.com')],
          [Markup.button.callback('🔙 Back', 'main_menu')]
        ])
      });

    } catch (error) {
      logger.error('Error in show_help callback:', error);
      await ctx.answerCbQuery('❌ Error loading help');
    }
  });

  // 群組相關回調處理

  // 群組了解更多
  bot.action('learn_more_group', async (ctx) => {
    try {
      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      await ctx.answerCbQuery();

      const groupInfoMessage = `🔐 **Twin Gate 群組驗證系統**\n\n` +
        `✅ **功能特色**:\n` +
        `• 自動追蹤用戶來源\n` +
        `• 群組驗證統計\n` +
        `• 管理員控制面板\n` +
        `• 私人驗證流程\n\n` +
        `📊 **管理員命令**:\n` +
        `• \`/registergroup\` - 註冊群組\n` +
        `• \`/groupstats\` - 查看統計\n\n` +
        `🔒 **隱私保護**:\n` +
        `• 驗證過程完全私人\n` +
        `• 只追蹤來源群組\n` +
        `• 不存儲敏感信息\n\n` +
        `💡 **使用方式**:\n` +
        `1. 管理員註冊群組\n` +
        `2. 成員點擊驗證按鈕\n` +
        `3. 私訊完成驗證\n` +
        `4. 系統自動追蹤來源`;

      await ctx.editMessageText(groupInfoMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url('📚 詳細文檔', 'https://docs.twingate.com/group-guide')],
          [Markup.button.url('💬 技術支援', 'https://t.me/twingate_support')]
        ])
      });

    } catch (error) {
      logger.error('Error in learn_more_group callback:', error);
      await ctx.answerCbQuery('❌ 無法載入群組信息');
    }
  });

  // 查看群組統計
  bot.action('view_group_stats', async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      const userId = ctx.from.id;

      await ctx.answerCbQuery();

      const statsResult = groupService.getGroupStats(chatId.toString());

      if (statsResult.success) {
        const stats = statsResult.data;
        const message = `📊 **群組驗證統計**\n\n` +
          `🏷️ **群組**: ${stats.title}\n` +
          `✅ **驗證次數**: ${stats.verificationCount}\n` +
          `👥 **成員數**: ${stats.memberCount}\n` +
          `📅 **註冊時間**: ${new Date(stats.registeredAt).toLocaleDateString('en-US')}\n` +
          `🔄 **狀態**: ${stats.isActive ? '✅ 啟用' : '❌ 停用'}`;

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔄 重新整理', 'refresh_group_stats')],
            [Markup.button.callback('📊 詳細報告', 'detailed_group_report')]
          ])
        });
      } else {
        await ctx.answerCbQuery('❌ 無法獲取群組統計');
      }

    } catch (error) {
      logger.error('Error in view_group_stats callback:', error);
      await ctx.answerCbQuery('❌ 查看統計時發生錯誤');
    }
  });

  // SBT 相關回調處理器

  // 重定向到 SBT
  bot.action('redirect_to_sbt', async (ctx) => {
    try {
      const userId = ctx.from.id;
      await ctx.answerCbQuery();

      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      const profileResult = await sbtService.getUserProfileAndSBT(userId);

      if (profileResult.success) {
        const profileData = profileResult.data;
        const message = sbtService.formatCompleteProfile(profileData, language);
        const buttonData = sbtService.generateSBTButtons(profileData, language);

        const keyboard = buttonData.map(row =>
          row.map(btn =>
            btn.url ?
              Markup.button.url(btn.text, btn.url) :
              Markup.button.callback(btn.text, btn.callback_data)
          )
        );

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(keyboard)
        });
      } else {
        await ctx.editMessageText(
          '❌ 無法載入 SBT 信息，請稍後再試。',
          Markup.inlineKeyboard([
            [Markup.button.callback('🔄 重試', 'retry_sbt_load')],
            [Markup.button.callback('🏠 主選單', 'flow_main')]
          ])
        );
      }
    } catch (error) {
      logger.error('Error in redirect_to_sbt callback:', error);
      await ctx.answerCbQuery('❌ 載入 SBT 信息失敗');
    }
  });

  // 重試載入 SBT
  bot.action('retry_sbt_load', async (ctx) => {
    try {
      await ctx.answerCbQuery('🔄 正在重新載入...');

      const userId = ctx.from.id;
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      const profileResult = await sbtService.getUserProfileAndSBT(userId);

      if (profileResult.success) {
        const profileData = profileResult.data;
        const message = sbtService.formatCompleteProfile(profileData, language);
        const buttonData = sbtService.generateSBTButtons(profileData, language);

        const keyboard = buttonData.map(row =>
          row.map(btn =>
            btn.url ?
              Markup.button.url(btn.text, btn.url) :
              Markup.button.callback(btn.text, btn.callback_data)
          )
        );

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(keyboard)
        });
      } else {
        throw new Error('Failed to load SBT data');
      }
    } catch (error) {
      logger.error('Error in retry_sbt_load callback:', error);
      await ctx.answerCbQuery('❌ 重新載入失敗');
    }
  });

  // SBT 詳情
  bot.action('sbt_details', async (ctx) => {
    try {
      const userId = ctx.from.id;
      await ctx.answerCbQuery();

      const sbtDetails = await sbtService.getSBTDetails(userId);

      if (sbtDetails.hasSBT) {
        const detailMessage = `💎 **SBT 詳細資訊**\n\n` +
          `🆔 **Token ID**: ${sbtDetails.tokenId}\n` +
          `📅 **鑄造時間**: ${new Date(sbtDetails.mintedAt).toLocaleDateString('en-US')}\n` +
          `🎯 **Humanity Index**: ${sbtDetails.humanityIndex}/255\n` +
          `📊 **驗證等級**: Level ${sbtDetails.verificationLevel}/3\n\n` +
          `🔗 **區塊鏈資訊**:\n` +
          `💎 SBT 地址: \`${sbtDetails.sbtAddress}\`\n` +
          `💰 錢包地址: \`${sbtDetails.walletAddress}\`\n\n` +
          `📋 **屬性**:\n` +
          `${sbtDetails.attributes?.map(attr =>
            `• ${attr.trait_type}: ${attr.value}`
          ).join('\n') || '無特殊屬性'}\n\n` +
          `🎉 這是您在區塊鏈上的永久身份證明！`;

        await ctx.editMessageText(detailMessage, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.url('🔍 BNB Scan', sbtService.generateBlockchainExplorerUrl(sbtDetails.walletAddress, 'address', 'bsc')),
              Markup.button.url('👤 Twin3 頁面', sbtService.generateTwin3ProfileUrl(userId, ctx.from.username))
            ],
            [Markup.button.callback('🔙 返回 SBT', 'redirect_to_sbt')]
          ])
        });
      } else {
        await ctx.answerCbQuery('❌ 您尚未擁有 SBT');
      }
    } catch (error) {
      logger.error('Error in sbt_details callback:', error);
      await ctx.answerCbQuery('❌ 無法載入 SBT 詳情');
    }
  });

  // 鑄造 SBT
  bot.action('mint_sbt', async (ctx) => {
    try {
      const userId = ctx.from.id;
      await ctx.answerCbQuery('🏆 正在準備 SBT 鑄造...');

      const mintResult = await sbtService.requestSBTMint(userId);

      if (mintResult.success) {
        const mintData = mintResult.data;
        const message = `🎉 **SBT 鑄造請求已提交！**\n\n` +
          `✅ 請求 ID: ${mintData.mintRequestId}\n` +
          `💰 錢包地址: \`${mintData.walletAddress}\`\n` +
          `⏱️ 預計完成時間: ${mintData.estimatedMintTime}\n\n` +
          `🔄 Your SBT is being minted...\n\n` +
          `💡 鑄造完成後，您將收到通知。`;

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 返回 SBT', 'redirect_to_sbt')]
          ])
        });
      } else {
        throw new Error('Failed to request SBT mint');
      }
    } catch (error) {
      logger.error('Error in mint_sbt callback:', error);

      let errorMessage = '❌ SBT 鑄造請求失敗。\n\n';
      if (error.message.includes('not eligible')) {
        errorMessage += '您需要完成 Level 2 驗證才能鑄造 SBT。';
      } else if (error.message.includes('already has')) {
        errorMessage += '您已經擁有 SBT 了！';
      } else {
        errorMessage += '請稍後再試或聯繫技術支援。';
      }

      await ctx.editMessageText(errorMessage, {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🚀 繼續驗證', 'flow_verify')],
          [Markup.button.callback('🔙 返回 SBT', 'redirect_to_sbt')]
        ])
      });
    }
  });

  // 了解 SBT
  bot.action('learn_about_sbt', async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const sbtInfoMessage = `🏆 **What is Twin3 SBT?**\n\n` +
        `💎 **Soul Bound Token**\n` +
        `Your unique digital identity proof that cannot be transferred.\n\n` +
        `✨ **Features**:\n` +
        `• 🔒 Permanently linked to your identity\n` +
        `• 🌐 Blockchain-based verification\n` +
        `• 🎯 Records your Humanity Index\n` +
        `• 🏅 Shows your verification level\n\n` +
        `📋 **Requirements**:\n` +
        `• ✅ Complete Level 1 verification\n` +
        `• ✅ Complete Level 2 verification ← Required\n` +
        `• ⭐ Optional: Complete Level 3 verification\n\n` +
        `💡 Complete Level 2 verification to automatically mint your exclusive SBT!`;

      await ctx.editMessageText(sbtInfoMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🚀 開始驗證', 'flow_verify')],
          [Markup.button.url('📚 了解更多', 'https://docs.twin3.ai/sbt')],
          [Markup.button.callback('🔙 返回 SBT', 'redirect_to_sbt')]
        ])
      });

    } catch (error) {
      logger.error('Error in learn_about_sbt callback:', error);
      await ctx.answerCbQuery('❌ 無法載入 SBT 說明');
    }
  });
}

// 輔助函數
async function createVerificationLink(ctx, session, userId) {
  try {
    const verificationData = {
      platform: 'telegram',
      userId: userId.toString(),
      username: ctx.from.username || ctx.from.first_name
    };

    const response = await apiClient.startVerification(session.token, verificationData);

    if (response.success) {
      const message = `
🔗 *驗證鏈接已生成*

太好了！為了確保您是獨一無二的地球旅人，請點擊下方鏈接完成一個簡單的驗證步驟。

🌐 **驗證網頁**
點擊下方按鈕將在瀏覽器中打開 Twin3 驗證頁面。

⏰ *有效期限：30 分鐘*
🔒 *安全提示：此鏈接僅供您個人使用*

完成驗證後，我會立即通知您結果！
      `;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🚀 開始驗證', response.data.verificationUrl)],
          [Markup.button.callback('🔄 檢查狀態', 'check_verification_status')],
          [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
        ])
      });

      // 儲存驗證資料到會話
      const { setVerificationData } = require('../utils/session');
      await setVerificationData(userId, response.data.verificationId, 'twin3', response.data);

    } else {
      throw new Error(response.message || '無法創建驗證鏈接');
    }
  } catch (error) {
    logger.error('Error creating verification link:', error);
    await ctx.editMessageText(
      `❌ 無法創建驗證鏈接：${error.message}`,
      {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 重試', 'create_verification_link')],
          [Markup.button.callback('🔙 返回主選單', 'back_to_main')]
        ])
      }
    );
  }
}

function formatTwin3VerificationStatus(data) {
  if (!data.user.isVerified) {
    return `
⏳ *驗證進行中*

📊 *當前狀態：* 等待驗證完成
⏰ *開始時間：* ${new Date(data.createdAt).toLocaleString('en-US')}
🔗 *驗證鏈接：* ${data.status === 'pending' ? '有效' : '已過期'}

💡 *提示：請完成網頁驗證後回來檢查狀態*
    `;
  }

  const humanityIndex = data.user.humanityIndex;
  const passed = humanityIndex >= 100;

  return `
${passed ? '✅' : '❌'} *驗證${passed ? '成功' : '未通過'}*

🎯 *您的 Humanity Index：${humanityIndex}/255*
📊 *驗證狀態：* ${passed ? '已通過' : '未達標準'}
📅 *完成時間：* ${new Date(data.user.verificationCompletedAt).toLocaleString('en-US')}

${passed ?
  '🎉 恭喜！您已成功完成 Twin3 人類驗證。您的專屬 Twin3 SBT 正在為您準備中！' :
  '💡 您可以重新驗證以提高分數。建議完成更多驗證等級來提升您的 Humanity Index。'}
  `;
}

// Helper functions
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

module.exports = { setupCallbacks };
