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
    const language = session?.language || 'zh-TW';

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

    const message = `👋 **歡迎 ${firstName}！**\n\n` +
      `🔐 **Twin Gate 人類身份驗證**\n\n` +
      `✨ 點擊下方按鈕開始私人驗證流程\n` +
      `🔒 驗證過程完全保密，不會在群組中顯示\n\n` +
      `📊 **群組**: ${ctx.chat.title}\n` +
      `🎯 **來源追蹤**: 已啟用`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('🚀 開始驗證', `https://t.me/twin3bot?start=verify_${chatId}`)]
      ])
    });

    await groupService.updateGroupStats(chatId.toString(), 'user_interaction');
  }

  /**
   * 語言選擇流程 - 英文優先，簡化界面
   */
  async showLanguageSelection(ctx, firstName) {
    const message = `🌍 **Welcome to Twin Gate!**\n\n` +
      `Hello ${firstName}! Welcome to the Twin3.ai Human Identity Verification System.\n\n` +
      `🔐 **Twin Gate** helps you prove your humanity and earn a unique Humanity Index score\n` +
      `🎯 Complete verification to get your exclusive Twin3 SBT (Soul Bound Token)\n\n` +
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
    // 顯示完整的驗證任務界面，包含所有等級
    const taskMessage = `**Task #001**\n\n` +
      `**Proof of Humanity**\n\n` +
      `您必須證明您不是機器人才能成為我們的一員。有些機器人已經變得如此複雜，很難將它們與真人區分開來。您通過的人類驗證任務等級越高，您就越有可能是真人。\n\n` +
      `人類驗證任務目前開放到第 3 級，您將通過日常生活中熟悉的驗證方法來證明您不是機器人。此過程僅用於身份或設備識別，不會保留您的個人資訊。\n\n` +
      `**您目前的身份等級：**\n` +
      `${verificationStatus.verificationLevel >= 1 ? '✅' : '⭕'} Level 1 - Google reCAPTCHA\n` +
      `${verificationStatus.verificationLevel >= 2 ? '✅' : '⭕'} Level 2 - 手機驗證\n` +
      `${verificationStatus.verificationLevel >= 3 ? '✅' : '⭕'} Level 3 - 生物識別\n\n` +
      `完成至少第 2 級以獲得免費鑄造您的 DNA NFT。\n\n` +
      `👇 **選擇要進行的驗證等級：**`;

    // 創建驗證等級按鈕
    const buttons = [];

    // Level 1 按鈕
    if (verificationStatus.verificationLevel < 1) {
      buttons.push([Markup.button.callback('🟢 開始 Level 1 驗證', 'start_level_1')]);
    } else {
      buttons.push([Markup.button.callback('✅ Level 1 已完成', 'level_1_completed')]);
    }

    // Level 2 按鈕
    if (verificationStatus.verificationLevel < 2) {
      if (verificationStatus.verificationLevel >= 1) {
        buttons.push([Markup.button.callback('🟡 開始 Level 2 驗證', 'start_level_2')]);
      } else {
        buttons.push([Markup.button.callback('🔒 Level 2 (需完成 Level 1)', 'level_locked')]);
      }
    } else {
      buttons.push([Markup.button.callback('✅ Level 2 已完成', 'level_2_completed')]);
    }

    // Level 3 按鈕
    if (verificationStatus.verificationLevel < 3) {
      if (verificationStatus.verificationLevel >= 2) {
        buttons.push([Markup.button.callback('🔴 開始 Level 3 驗證', 'start_level_3')]);
      } else {
        buttons.push([Markup.button.callback('🔒 Level 3 (需完成 Level 2)', 'level_locked')]);
      }
    } else {
      buttons.push([Markup.button.callback('✅ Level 3 已完成', 'level_3_completed')]);
    }

    // 如果可以鑄造 SBT，添加 SBT 按鈕
    if (verificationStatus.verificationLevel >= 2 && !verificationStatus.hasSBT) {
      buttons.push([Markup.button.callback('🏆 鑄造 Twin3 SBT', 'mint_sbt')]);
    }

    // 返回主選單按鈕
    buttons.push([Markup.button.callback('🏠 主選單', 'flow_main')]);

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
