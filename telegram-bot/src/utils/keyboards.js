const { Markup } = require('telegraf');
const { t } = require('../locales');

// 創建主選單鍵盤 - 簡化版本
function createMainKeyboard(language = 'zh-TW') {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🚀 開始驗證', 'start_verification')
    ],
    [
      Markup.button.callback('🌐 語言設定', 'menu_language')
    ]
  ]);
}

// Create verification channels keyboard
function createVerificationKeyboard(channels) {
  const buttons = [];

  // Group channels in rows of 2
  for (let i = 0; i < channels.length; i += 2) {
    const row = [];

    // First channel in row
    const channel1 = channels[i];
    row.push(Markup.button.callback(
      `${getChannelEmoji(channel1.channel)} ${channel1.name}`,
      `verify_${channel1.channel}`
    ));

    // Second channel in row (if exists)
    if (i + 1 < channels.length) {
      const channel2 = channels[i + 1];
      row.push(Markup.button.callback(
        `${getChannelEmoji(channel2.channel)} ${channel2.name}`,
        `verify_${channel2.channel}`
      ));
    }

    buttons.push(row);
  }

  // Add navigation buttons
  buttons.push([
    Markup.button.callback('📊 Check Status', 'check_status'),
    Markup.button.callback('🔙 Back to Menu', 'main_menu')
  ]);

  return Markup.inlineKeyboard(buttons);
}

// Create verification step keyboard
function createVerificationStepKeyboard(channel, step = 'start') {
  const buttons = [];

  switch (step) {
    case 'start':
      buttons.push([
        Markup.button.callback('🚀 Begin Verification', `begin_${channel}`),
        Markup.button.callback('ℹ️ More Info', `info_${channel}`)
      ]);
      break;

    case 'submit':
      buttons.push([
        Markup.button.callback('📤 Submit Proof', `submit_${channel}`),
        Markup.button.callback('🔄 Refresh Instructions', `refresh_${channel}`)
      ]);
      break;

    case 'waiting':
      buttons.push([
        Markup.button.callback('🔄 Check Status', `status_${channel}`),
        Markup.button.callback('❌ Cancel', `cancel_${channel}`)
      ]);
      break;

    case 'completed':
      buttons.push([
        Markup.button.callback('✅ Continue to Next', 'continue_verification'),
        Markup.button.callback('📊 View Status', 'check_status')
      ]);
      break;

    case 'failed':
      buttons.push([
        Markup.button.callback('🔄 Retry', `retry_${channel}`),
        Markup.button.callback('❓ Get Help', 'get_help')
      ]);
      break;
  }

  // Always add back button
  buttons.push([
    Markup.button.callback('🔙 Back to Channels', 'view_channels')
  ]);

  return Markup.inlineKeyboard(buttons);
}

// Create SBT action keyboard
function createSBTKeyboard(hasSBT, eligibleForMint = false) {
  const buttons = [];

  if (hasSBT) {
    buttons.push([
      Markup.button.callback('🔍 View Details', 'sbt_details'),
      Markup.button.callback('🔗 View on Explorer', 'sbt_explorer')
    ]);
    buttons.push([
      Markup.button.callback('📤 Share SBT', 'share_sbt'),
      Markup.button.callback('🔄 Refresh', 'refresh_sbt')
    ]);
  } else if (eligibleForMint) {
    buttons.push([
      Markup.button.callback('🏆 Mint SBT Now', 'mint_sbt'),
      Markup.button.callback('ℹ️ Learn More', 'sbt_info')
    ]);
  } else {
    buttons.push([
      Markup.button.callback('✅ Complete Verification', 'continue_verification'),
      Markup.button.callback('ℹ️ What is SBT?', 'sbt_info')
    ]);
  }

  buttons.push([
    Markup.button.callback('🔙 Back to Menu', 'main_menu')
  ]);

  return Markup.inlineKeyboard(buttons);
}

// Create profile management keyboard
function createProfileKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Edit Profile', 'edit_profile'),
      Markup.button.callback('🔄 Refresh', 'refresh_profile')
    ],
    [
      Markup.button.callback('🔐 Privacy Settings', 'privacy_settings'),
      Markup.button.callback('🗑️ Delete Account', 'delete_account')
    ],
    [
      Markup.button.callback('🔙 Back to Menu', 'main_menu')
    ]
  ]);
}

// Create settings keyboard
function createSettingsKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌐 Language', 'change_language'),
      Markup.button.callback('🔔 Notifications', 'notification_settings')
    ],
    [
      Markup.button.callback('🔐 Privacy', 'privacy_settings'),
      Markup.button.callback('📊 Data Export', 'export_data')
    ],
    [
      Markup.button.callback('🗑️ Delete Data', 'delete_data'),
      Markup.button.callback('🔙 Back to Menu', 'main_menu')
    ]
  ]);
}

// Create confirmation keyboard
function createConfirmationKeyboard(action, data = '') {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Confirm', `confirm_${action}_${data}`),
      Markup.button.callback('❌ Cancel', `cancel_${action}`)
    ]
  ]);
}

// Create pagination keyboard
function createPaginationKeyboard(currentPage, totalPages, baseCallback) {
  const buttons = [];

  if (totalPages > 1) {
    const row = [];

    // Previous button
    if (currentPage > 1) {
      row.push(Markup.button.callback('⬅️ Previous', `${baseCallback}_${currentPage - 1}`));
    }

    // Page indicator
    row.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'noop'));

    // Next button
    if (currentPage < totalPages) {
      row.push(Markup.button.callback('Next ➡️', `${baseCallback}_${currentPage + 1}`));
    }

    buttons.push(row);
  }

  return Markup.inlineKeyboard(buttons);
}

// Create language selection keyboard
function createLanguageKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🇺🇸 English', 'lang_en'),
      Markup.button.callback('🇨🇳 中文', 'lang_zh')
    ],
    [
      Markup.button.callback('🇪🇸 Español', 'lang_es'),
      Markup.button.callback('🇫🇷 Français', 'lang_fr')
    ],
    [
      Markup.button.callback('🔙 Back', 'settings')
    ]
  ]);
}

// Create notification settings keyboard
function createNotificationKeyboard(settings = {}) {
  const { verification = true, sbt = true, security = true } = settings;

  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${verification ? '🔔' : '🔕'} Verification Updates`,
        'toggle_notif_verification'
      )
    ],
    [
      Markup.button.callback(
        `${sbt ? '🔔' : '🔕'} SBT Notifications`,
        'toggle_notif_sbt'
      )
    ],
    [
      Markup.button.callback(
        `${security ? '🔔' : '🔕'} Security Alerts`,
        'toggle_notif_security'
      )
    ],
    [
      Markup.button.callback('💾 Save Settings', 'save_notifications'),
      Markup.button.callback('🔙 Back', 'settings')
    ]
  ]);
}

// Create admin keyboard (for admin users)
function createAdminKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Bot Stats', 'admin_stats'),
      Markup.button.callback('👥 User Stats', 'admin_users')
    ],
    [
      Markup.button.callback('🔧 System Health', 'admin_health'),
      Markup.button.callback('📝 Logs', 'admin_logs')
    ],
    [
      Markup.button.callback('📢 Broadcast', 'admin_broadcast'),
      Markup.button.callback('🔙 Back', 'main_menu')
    ]
  ]);
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

// Create verification level menu
function createVerificationLevelMenu(language, completedLevel = 0, currentLevel = 1) {
  const buttons = [];

  // Level 1 按鈕
  const level1Status = completedLevel >= 1 ? '✅' : (currentLevel === 1 ? '🔄' : '⭕');
  const level1Text = `${level1Status} Level 1 - ${t('verification.level1.title', language)}`;
  const level1Action = completedLevel >= 1 ? 'level_1_completed' : 'start_level_1';
  buttons.push([Markup.button.callback(level1Text, level1Action)]);

  // Level 2 按鈕 (只有完成 Level 1 後才能點擊)
  const level2Status = completedLevel >= 2 ? '✅' : (currentLevel === 2 ? '🔄' : '⭕');
  const level2Text = `${level2Status} Level 2 - ${t('verification.level2.title', language)}`;
  const level2Action = completedLevel >= 2 ? 'level_2_completed' :
                      (completedLevel >= 1 ? 'start_level_2' : 'level_locked');
  buttons.push([Markup.button.callback(level2Text, level2Action)]);

  // Level 3 按鈕 (只有完成 Level 2 後才能點擊)
  const level3Status = completedLevel >= 3 ? '✅' : (currentLevel === 3 ? '🔄' : '⭕');
  const level3Text = `${level3Status} Level 3 - ${t('verification.level3.title', language)}`;
  const level3Action = completedLevel >= 3 ? 'level_3_completed' :
                      (completedLevel >= 2 ? 'start_level_3' : 'level_locked');
  buttons.push([Markup.button.callback(level3Text, level3Action)]);

  // 返回主選單按鈕
  buttons.push([Markup.button.callback(`🔙 ${t('buttons.back_to_main', language)}`, 'back_to_main')]);

  return Markup.inlineKeyboard(buttons);
}

// Create custom keyboard with dynamic buttons
function createCustomKeyboard(buttons, options = {}) {
  const { columns = 2, addBackButton = true, backCallback = 'main_menu' } = options;

  const keyboard = [];

  // Group buttons into rows
  for (let i = 0; i < buttons.length; i += columns) {
    const row = buttons.slice(i, i + columns);
    keyboard.push(row);
  }

  // Add back button if requested
  if (addBackButton) {
    keyboard.push([
      Markup.button.callback('🔙 Back', backCallback)
    ]);
  }

  return Markup.inlineKeyboard(keyboard);
}

module.exports = {
  createMainKeyboard,
  createVerificationKeyboard,
  createVerificationStepKeyboard,
  createVerificationLevelMenu,
  createSBTKeyboard,
  createProfileKeyboard,
  createSettingsKeyboard,
  createConfirmationKeyboard,
  createPaginationKeyboard,
  createLanguageKeyboard,
  createNotificationKeyboard,
  createAdminKeyboard,
  createCustomKeyboard,
  getChannelEmoji
};
