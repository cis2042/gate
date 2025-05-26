#!/usr/bin/env node

/**
 * Twin Gate Telegram Bot 測試腳本
 * 用於測試 Bot 功能和 API 連接
 */

const axios = require('axios');
const winston = require('winston');
require('dotenv').config({ path: './telegram-bot/.env' });

// 設定日誌
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

// 測試配置
const config = {
  botToken: process.env.BOT_TOKEN,
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
  adminChatId: process.env.ADMIN_CHAT_ID,
  timeout: 10000
};

// 測試結果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// 測試函數
async function runTest(testName, testFunction) {
  testResults.total++;
  logger.info(`🧪 執行測試: ${testName}`);
  
  try {
    await testFunction();
    testResults.passed++;
    logger.info(`✅ 測試通過: ${testName}`);
  } catch (error) {
    testResults.failed++;
    logger.error(`❌ 測試失敗: ${testName} - ${error.message}`);
  }
}

// 測試 Bot Token
async function testBotToken() {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN 未設定');
  }

  const response = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`, {
    timeout: config.timeout
  });

  if (!response.data.ok) {
    throw new Error('Bot Token 無效');
  }

  const botInfo = response.data.result;
  logger.info(`Bot 資訊: @${botInfo.username} (ID: ${botInfo.id})`);
}

// 測試後端 API 連接
async function testApiConnection() {
  const healthUrl = `${config.apiBaseUrl}/health`;
  
  const response = await axios.get(healthUrl, {
    timeout: config.timeout
  });

  if (response.status !== 200) {
    throw new Error(`API 健康檢查失敗: ${response.status}`);
  }

  logger.info(`API 狀態: ${response.data.status || 'OK'}`);
}

// 測試 API 端點
async function testApiEndpoints() {
  const endpoints = [
    '/api/v1/health',
    '/api/v1/verification/channels'
  ];

  for (const endpoint of endpoints) {
    const url = `${config.apiBaseUrl}${endpoint}`;
    
    try {
      const response = await axios.get(url, {
        timeout: config.timeout,
        validateStatus: (status) => status < 500 // 允許 4xx 錯誤
      });
      
      logger.info(`端點 ${endpoint}: ${response.status}`);
    } catch (error) {
      throw new Error(`端點 ${endpoint} 無法訪問: ${error.message}`);
    }
  }
}

// 測試 Twin3.ai 配置
async function testTwin3Config() {
  const twin3Url = process.env.TWIN3_API_URL || 'https://api.twin3.ai';
  const twin3WebUrl = process.env.TWIN3_WEB_VERIFICATION_URL || 'https://verify.twin3.ai';

  // 檢查 URL 格式
  if (!twin3Url.startsWith('http')) {
    throw new Error('Twin3 API URL 格式無效');
  }

  if (!twin3WebUrl.startsWith('http')) {
    throw new Error('Twin3 Web URL 格式無效');
  }

  logger.info(`Twin3 API URL: ${twin3Url}`);
  logger.info(`Twin3 Web URL: ${twin3WebUrl}`);
}

// 測試環境變數
async function testEnvironmentVariables() {
  const requiredVars = ['BOT_TOKEN', 'API_BASE_URL'];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(`缺少必要的環境變數: ${missingVars.join(', ')}`);
  }

  logger.info('所有必要的環境變數都已設定');
}

// 測試 Bot 指令設定
async function testBotCommands() {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN 未設定');
  }

  const response = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMyCommands`, {
    timeout: config.timeout
  });

  if (!response.data.ok) {
    throw new Error('無法獲取 Bot 指令');
  }

  const commands = response.data.result;
  logger.info(`Bot 指令數量: ${commands.length}`);
  
  if (commands.length === 0) {
    logger.warn('Bot 尚未設定任何指令');
  } else {
    commands.forEach(cmd => {
      logger.info(`指令: /${cmd.command} - ${cmd.description}`);
    });
  }
}

// 測試 Redis 連接（如果配置了）
async function testRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.info('Redis 未配置，跳過測試');
    return;
  }

  // 這裡可以添加 Redis 連接測試
  logger.info(`Redis URL: ${redisUrl}`);
}

// 發送測試訊息給管理員
async function sendTestMessage() {
  if (!config.adminChatId || !config.botToken) {
    logger.info('管理員聊天 ID 未設定，跳過測試訊息發送');
    return;
  }

  const message = `🧪 Twin Gate Bot 測試完成\n\n` +
    `✅ 通過: ${testResults.passed}\n` +
    `❌ 失敗: ${testResults.failed}\n` +
    `📊 總計: ${testResults.total}\n\n` +
    `🕐 測試時間: ${new Date().toLocaleString('zh-TW')}`;

  try {
    await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      chat_id: config.adminChatId,
      text: message,
      parse_mode: 'HTML'
    }, {
      timeout: config.timeout
    });

    logger.info('測試結果已發送給管理員');
  } catch (error) {
    logger.warn(`無法發送測試訊息給管理員: ${error.message}`);
  }
}

// 主測試函數
async function runAllTests() {
  logger.info('🚀 開始 Twin Gate Telegram Bot 測試');
  logger.info('='.repeat(50));

  // 執行所有測試
  await runTest('環境變數檢查', testEnvironmentVariables);
  await runTest('Bot Token 驗證', testBotToken);
  await runTest('後端 API 連接', testApiConnection);
  await runTest('API 端點測試', testApiEndpoints);
  await runTest('Twin3.ai 配置檢查', testTwin3Config);
  await runTest('Bot 指令檢查', testBotCommands);
  await runTest('Redis 連接測試', testRedisConnection);

  // 顯示測試結果
  logger.info('='.repeat(50));
  logger.info('📊 測試結果摘要:');
  logger.info(`✅ 通過: ${testResults.passed}`);
  logger.info(`❌ 失敗: ${testResults.failed}`);
  logger.info(`📊 總計: ${testResults.total}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  logger.info(`🎯 成功率: ${successRate}%`);

  // 發送測試結果給管理員
  await sendTestMessage();

  // 根據測試結果決定退出碼
  if (testResults.failed > 0) {
    logger.error('❌ 部分測試失敗，請檢查配置');
    process.exit(1);
  } else {
    logger.info('🎉 所有測試通過！Bot 準備就緒');
    process.exit(0);
  }
}

// 處理未捕獲的錯誤
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未處理的 Promise 拒絕:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕獲的異常:', error);
  process.exit(1);
});

// 執行測試
if (require.main === module) {
  runAllTests().catch((error) => {
    logger.error('測試執行失敗:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults
};
