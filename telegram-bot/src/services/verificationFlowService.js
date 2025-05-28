// 統一驗證流程服務
const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/session');
const { getUserVerificationStatus } = require('../utils/userStatus');
const { t } = require('../locales');
const { Markup } = require('telegraf');
const groupService = require('./groupService');

class VerificationFlowService {
  constructor() {
    this.flowStates = new Map(); // 用戶流程狀態
  }

  /**
   * 統一驗證流程入口
   * 根據用戶當前狀態智能決定下一步
   */
  async handleUnifiedFlow(ctx, command = 'start') {
    try {
      const userId = ctx.from.id;
      const firstName = ctx.from.first_name;
      const chatType = ctx.chat.type;

      // 追蹤用戶來源（如果是群組）
      if (ctx.sourceInfo && ctx.isGroupChat) {
        await groupService.trackUserSource(userId, ctx.sourceInfo);
      }

      // 獲取用戶會話和狀態
      const session = await getUserSession(userId);
      const verificationStatus = await getUserVerificationStatus(userId);

      // 決定流程路徑
      const flowPath = this.determineFlowPath(session, verificationStatus, chatType, command);

      // 執行對應的流程
      return await this.executeFlow(ctx, flowPath, {
        session,
        verificationStatus,
        firstName,
        chatType
      });

    } catch (error) {
      logger.error('Error in unified verification flow:', error);
      return await this.handleFlowError(ctx, error);
    }
  }

  /**
   * 決定用戶應該進入哪個流程路徑
   */
  determineFlowPath(session, verificationStatus, chatType, command) {
    // 群組中的特殊處理
    if (chatType === 'group' || chatType === 'supergroup') {
      return 'group_welcome';
    }

    // 新用戶 - 語言選擇
    if (!session || !session.language) {
      return 'language_selection';
    }

    // 根據命令和驗證狀態智能決定路徑
    switch (command) {
      case 'verify':
        // 如果沒有任何驗證，顯示驗證開始
        if (verificationStatus.verificationLevel === 0) {
          return 'verification_start';
        }
        // 如果有部分驗證，顯示儀表板
        return 'verification_dashboard';

      case 'status':
      case 'dashboard':
        return 'verification_dashboard';

      case 'start':
        // 新用戶或未完成驗證的用戶，引導到驗證
        if (verificationStatus.verificationLevel === 0) {
          return 'verification_start';
        }
        // 已有驗證的用戶，顯示主儀表板
        return 'main_dashboard';

      default:
        // 默認：根據驗證狀態決定
        if (verificationStatus.verificationLevel === 0) {
          return 'verification_start';
        }
        return 'main_dashboard';
    }
  }

  /**
   * 執行對應的流程
   */
  async executeFlow(ctx, flowPath, context) {
    const { session, verificationStatus, firstName, chatType } = context;
    const language = session?.language || 'en-US';

    switch (flowPath) {
      case 'group_welcome':
        return await this.showGroupWelcome(ctx, firstName);

      case 'language_selection':
        return await this.showLanguageSelection(ctx, firstName);

      case 'verification_dashboard':
        return await this.showVerificationDashboard(ctx, language, verificationStatus);

      case 'verification_start':
        return await this.showVerificationStart(ctx, language, verificationStatus);

      case 'main_dashboard':
        return await this.showMainDashboard(ctx, language, firstName, verificationStatus);

      default:
        return await this.showMainDashboard(ctx, language, firstName, verificationStatus);
    }
  }

  /**
   * 群組歡迎流程
   */
  async showGroupWelcome(ctx, firstName) {
    const chatId = ctx.chat.id;
    const groupInfo = {
      chatId: chatId.toString(),
      title: ctx.chat.title,
      username: ctx.chat.username,
      type: ctx.chat.type
    };

    // 自動註冊群組
    if (!groupService.isGroupRegistered(chatId.toString())) {
      await groupService.registerGroup(groupInfo, ctx.from.id);
    }

    const message = `👋 **Welcome ${firstName}!**\n\n` +
      `🔐 **Twin Gate Human Identity Verification**\n\n` +
      `✨ Click the button below to start private verification process\n` +
      `🔒 Verification process is completely confidential and will not be displayed in the group\n\n` +
      `📊 **Group**: ${ctx.chat.title}\n` +
      `🎯 **Source Tracking**: Enabled`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('🚀 Start Verification', `https://t.me/${process.env.BOT_USERNAME || 'twin3bot'}?start=verify_${chatId}`)]
      ])
    });

    await groupService.updateGroupStats(chatId.toString(), 'user_interaction');
  }

  /**
   * 語言選擇流程 - 英文優先，簡化界面
   */
  async showLanguageSelection(ctx, firstName) {
    const message = `🌍 **Welcome to Twin Gate!**\n\n` +
      `Hello ${firstName}! Prove your humanity and earn your digital identity.\n\n` +
      `🎯 **What you'll get:**\n` +
      `🏆 Unique SBT (Soul Bound Token)\n` +
      `📊 Humanity Index score (0-255)\n` +
      `🔐 Verified digital identity\n\n` +
      `**Choose an option to get started:**`;

    const buttons = [
      [Markup.button.callback('🚀 Start Verification', 'start_verification_en')],
      [Markup.button.callback('🌍 Language Settings', 'language_settings')]
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  }

  /**
   * 驗證儀表板 - 顯示當前狀態和可用操作
   */
  async showVerificationDashboard(ctx, language, verificationStatus) {
    const message = `📊 **${t('verification.dashboard_title', language)}**\n\n` +
      `🎯 **當前狀態**:\n` +
      `• 驗證等級: ${verificationStatus.verificationLevel}/3\n` +
      `• Humanity Index: ${verificationStatus.humanityIndex}/255\n` +
      `• SBT 狀態: ${verificationStatus.hasSBT ? '✅ 已鑄造' : '⭕ 未鑄造'}\n\n` +
      `📈 **驗證進度**:\n` +
      `${verificationStatus.verificationLevel >= 1 ? '✅' : '⭕'} Level 1 - Google reCAPTCHA\n` +
      `${verificationStatus.verificationLevel >= 2 ? '✅' : '⭕'} Level 2 - 手機驗證\n` +
      `${verificationStatus.verificationLevel >= 3 ? '✅' : '⭕'} Level 3 - 生物識別\n\n` +
      this.getNextStepMessage(verificationStatus, language);

    const buttons = this.createDashboardButtons(verificationStatus, language);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    }
  }

  /**
   * 驗證開始流程 - 顯示完整的驗證任務界面
   */
  async showVerificationStart(ctx, language, verificationStatus) {
    // 使用多語言系統
    const { t } = require('../locales');

    const taskMessage = `**Task #001**\n\n` +
      `**Proof of Humanity**\n\n` +
      `${t('verification.task_description', language)}\n\n` +
      `${t('verification.task_info', language)}\n\n` +
      `**${t('verification.current_level', language)}:**\n` +
      `${verificationStatus.verificationLevel >= 1 ? '✅' : '⭕'} Level 1 - ${t('verification.level1.title', language)}\n` +
      `${verificationStatus.verificationLevel >= 2 ? '✅' : '⭕'} Level 2 - ${t('verification.level2.title', language)}\n` +
      `${verificationStatus.verificationLevel >= 3 ? '✅' : '⭕'} Level 3 - ${t('verification.level3.title', language)}\n\n` +
      `${t('verification.requirement', language)}\n\n` +
      `👇 **${t('verification.choose_level', language)}:**`;

    // 創建驗證等級按鈕
    const buttons = [];

    // Level 1 按鈕
    if (verificationStatus.verificationLevel < 1) {
      buttons.push([Markup.button.callback(`🟢 ${t('verification.level1.button', language)}`, 'start_level_1')]);
    } else {
      buttons.push([Markup.button.callback(`✅ ${t('verification.level1.completed', language)}`, 'level_1_completed')]);
    }

    // Level 2 按鈕
    if (verificationStatus.verificationLevel < 2) {
      if (verificationStatus.verificationLevel >= 1) {
        buttons.push([Markup.button.callback(`🟡 ${t('verification.level2.button', language)}`, 'start_level_2')]);
      } else {
        buttons.push([Markup.button.callback(`🔒 ${t('verification.level2.locked', language)}`, 'level_locked')]);
      }
    } else {
      buttons.push([Markup.button.callback(`✅ ${t('verification.level2.completed', language)}`, 'level_2_completed')]);
    }

    // Level 3 按鈕
    if (verificationStatus.verificationLevel < 3) {
      if (verificationStatus.verificationLevel >= 2) {
        buttons.push([Markup.button.callback(`🔴 ${t('verification.level3.button', language)}`, 'start_level_3')]);
      } else {
        buttons.push([Markup.button.callback(`🔒 ${t('verification.level3.locked', language)}`, 'level_locked')]);
      }
    } else {
      buttons.push([Markup.button.callback(`✅ ${t('verification.level3.completed', language)}`, 'level_3_completed')]);
    }

    // 如果可以鑄造 SBT，添加 SBT 按鈕
    if (verificationStatus.verificationLevel >= 2 && !verificationStatus.hasSBT) {
      buttons.push([Markup.button.callback(`🏆 ${t('buttons.mint_sbt', language)}`, 'mint_sbt')]);
    }

    // 返回主選單按鈕
    buttons.push([Markup.button.callback(t('buttons.main_menu', language), 'flow_main')]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(taskMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    } else {
      await ctx.reply(taskMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    }
  }

  /**
   * 主儀表板 - 簡化按鈕
   */
  async showMainDashboard(ctx, language, firstName, verificationStatus) {
    const { t } = require('../locales');

    const message = `👋 **${t('welcome.back', language, { name: firstName })}**\n\n` +
      `🎯 **${t('dashboard.your_status', language)}**:\n` +
      `• ${t('dashboard.verification_level', language)}: ${verificationStatus.verificationLevel}/3\n` +
      `• Humanity Index: ${verificationStatus.humanityIndex}/255\n` +
      `• ${t('dashboard.pass_status', language)}: ${verificationStatus.humanityIndex >= 100 ? '✅ ' + t('status.passed', language) : '⭕ ' + t('status.not_passed', language)}\n\n` +
      `${this.getWelcomeMessage(verificationStatus, language)}`;

    const buttons = [
      [Markup.button.callback(t('buttons.continue_verification', language), 'flow_verify')],
      [Markup.button.callback(t('buttons.sbt_management', language), 'redirect_to_sbt')]
    ];

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    }
  }

  /**
   * 獲取下一步提示訊息
   */
  getNextStepMessage(verificationStatus, language) {
    if (verificationStatus.verificationLevel === 0) {
      return `💡 **下一步**: 完成 Level 1 驗證開始您的人類身份證明之旅`;
    } else if (verificationStatus.verificationLevel === 1) {
      return `💡 **下一步**: 完成 Level 2 驗證即可鑄造專屬 SBT`;
    } else if (verificationStatus.verificationLevel === 2) {
      return `💡 **下一步**: 完成 Level 3 驗證獲得最高等級認證`;
    } else {
      return `🎉 **恭喜**: 您已完成所有驗證等級！`;
    }
  }

  /**
   * 創建儀表板按鈕 - 簡化版本
   */
  createDashboardButtons(verificationStatus, language) {
    const { t } = require('../locales');
    const buttons = [];

    // 下一個可用的驗證等級
    const nextLevel = verificationStatus.verificationLevel + 1;
    if (nextLevel <= 3) {
      buttons.push([Markup.button.callback(
        `🎯 ${t('buttons.start_level', language)} ${nextLevel}`,
        `start_level_${nextLevel}`
      )]);
    }

    // SBT 相關按鈕
    if (verificationStatus.verificationLevel >= 2) {
      if (!verificationStatus.hasSBT) {
        buttons.push([Markup.button.callback(t('buttons.mint_sbt', language), 'mint_sbt')]);
      } else {
        buttons.push([Markup.button.callback(t('buttons.view_sbt', language), 'redirect_to_sbt')]);
      }
    }

    // 簡化的通用按鈕
    buttons.push([Markup.button.callback(t('buttons.main_menu', language), 'flow_main')]);

    return buttons;
  }

  /**
   * 獲取等級描述
   */
  getLevelDescription(level, language) {
    const descriptions = {
      1: '🟢 **Google reCAPTCHA 驗證**\n基礎人機驗證，證明您不是機器人',
      2: '🟡 **手機短信驗證**\n通過手機號碼驗證您的真實身份',
      3: '🔴 **生物識別驗證**\n使用 Apple/Google 帳戶進行高級身份驗證'
    };
    return descriptions[level] || '';
  }

  /**
   * 獲取等級分數範圍
   */
  getLevelScoreRange(level) {
    const ranges = {
      1: '50-80 分',
      2: '80-150 分',
      3: '120-200 分'
    };
    return ranges[level] || '';
  }

  /**
   * 獲取等級預計時間
   */
  getLevelDuration(level) {
    const durations = {
      1: '1-2 分鐘',
      2: '3-5 分鐘',
      3: '2-3 分鐘'
    };
    return durations[level] || '';
  }

  /**
   * 獲取歡迎訊息
   */
  getWelcomeMessage(verificationStatus, language) {
    if (verificationStatus.humanityIndex >= 100) {
      return `🎉 恭喜！您已通過人類身份驗證！`;
    } else if (verificationStatus.verificationLevel > 0) {
      return `💪 繼續努力！完成更多驗證等級來提高您的分數。`;
    } else {
      return `🚀 開始您的人類身份驗證之旅！`;
    }
  }

  /**
   * 處理流程錯誤
   */
  async handleFlowError(ctx, error) {
    logger.error('Verification flow error:', error);

    const errorMessage = `❌ **系統暫時無法使用**\n\n` +
      `請稍後再試，或聯繫技術支援。\n\n` +
      `錯誤代碼: ${error.code || 'UNKNOWN'}`;

    const buttons = [
      [Markup.button.callback('🔄 重試', 'flow_retry')],
      [Markup.button.url('💬 技術支援', 'https://t.me/twingate_support')]
    ];

    if (ctx.callbackQuery) {
      await ctx.editMessageText(errorMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    } else {
      await ctx.reply(errorMessage, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
      });
    }
  }

  /**
   * 更新用戶流程狀態
   */
  updateFlowState(userId, state) {
    this.flowStates.set(userId, {
      ...state,
      timestamp: Date.now()
    });
  }

  /**
   * 獲取用戶流程狀態
   */
  getFlowState(userId) {
    return this.flowStates.get(userId);
  }

  /**
   * 清理過期的流程狀態
   */
  cleanupExpiredStates() {
    const now = Date.now();
    const expireTime = 30 * 60 * 1000; // 30 分鐘

    for (const [userId, state] of this.flowStates.entries()) {
      if (now - state.timestamp > expireTime) {
        this.flowStates.delete(userId);
      }
    }
  }
}

// 創建單例實例
const verificationFlowService = new VerificationFlowService();

// 定期清理過期狀態
setInterval(() => {
  verificationFlowService.cleanupExpiredStates();
}, 5 * 60 * 1000); // 每 5 分鐘清理一次

module.exports = verificationFlowService;
