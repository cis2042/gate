#!/usr/bin/env node

/**
 * Twin Gate Demo API Server
 * 用於測試 Telegram Bot 的簡化 API 服務器
 */

const express = require('express');
const cors = require('cors');
const winston = require('winston');

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

const app = express();
const PORT = process.env.PORT || 3001;

// 中間件
app.use(cors());
app.use(express.json());

// 模擬資料
const users = new Map();
const verifications = new Map();

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Twin Gate Demo API',
    version: '1.0.0'
  });
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Twin Gate Demo API',
    version: '1.0.0'
  });
});

// 使用者註冊
app.post('/api/v1/auth/register', (req, res) => {
  const { username, email, platform, platformUserId } = req.body;
  
  const userId = Date.now().toString();
  const user = {
    id: userId,
    username: username || `user_${userId}`,
    email: email || `${userId}@demo.com`,
    platform: platform || 'telegram',
    platformUserId: platformUserId || userId,
    humanityIndex: 0,
    isVerified: false,
    createdAt: new Date().toISOString()
  };
  
  users.set(userId, user);
  
  // 生成簡單的 JWT token (demo 用途)
  const token = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64');
  
  res.status(201).json({
    success: true,
    message: '註冊成功',
    data: {
      user,
      token
    }
  });
});

// 使用者登入
app.post('/api/v1/auth/login', (req, res) => {
  const { email, platformUserId } = req.body;
  
  // 查找使用者
  const user = Array.from(users.values()).find(u => 
    u.email === email || u.platformUserId === platformUserId
  );
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '使用者不存在'
    });
  }
  
  // 生成 token
  const token = Buffer.from(JSON.stringify({ userId: user.id, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64');
  
  res.json({
    success: true,
    message: '登入成功',
    data: {
      user,
      token
    }
  });
});

// 獲取驗證渠道
app.get('/api/v1/verification/channels', (req, res) => {
  res.json({
    success: true,
    data: {
      verificationLevels: [
        {
          level: 'level1',
          name: 'Level 1 - 基礎驗證',
          description: 'Google reCAPTCHA 人機驗證',
          required: true,
          estimatedScore: '50-80',
          estimatedTime: '1-2 分鐘',
          methods: ['recaptcha']
        },
        {
          level: 'level2', 
          name: 'Level 2 - 進階驗證',
          description: '手機短信驗證',
          required: false,
          estimatedScore: '80-150',
          estimatedTime: '3-5 分鐘',
          methods: ['sms']
        },
        {
          level: 'level3',
          name: 'Level 3 - 高級驗證', 
          description: 'Apple/Google OAuth 登錄驗證',
          required: false,
          estimatedScore: '120-200',
          estimatedTime: '2-3 分鐘',
          methods: ['apple_oauth', 'google_oauth']
        }
      ],
      scoreRange: { min: 0, max: 255 },
      passingThreshold: 100,
      sbtMintingThreshold: 100,
      twin3Integration: {
        apiBaseUrl: 'https://api.twin3.ai',
        webVerificationUrl: 'https://verify.twin3.ai',
        note: '所有驗證都通過 twin3.ai API 處理'
      }
    }
  });
});

// 開始驗證
app.post('/api/v1/verification/start', (req, res) => {
  const { platform, userId: platformUserId, username } = req.body;
  
  const verificationId = Date.now().toString();
  const verificationToken = Math.random().toString(36).substring(2, 15);
  const verificationUrl = `https://verify.twin3.ai/v/${verificationToken}`;
  
  const verification = {
    id: verificationId,
    platform: platform || 'telegram',
    platformUserId,
    username,
    verificationToken,
    verificationUrl,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  };
  
  verifications.set(verificationId, verification);
  
  res.status(201).json({
    success: true,
    message: '驗證鏈接已生成',
    data: {
      verificationId,
      verificationUrl,
      verificationToken,
      expiresAt: verification.expiresAt,
      status: verification.status,
      instructions: '請點擊驗證鏈接完成 twin3.ai 人類身份驗證'
    }
  });
});

// 檢查驗證狀態
app.get('/api/v1/verification/status/:token', (req, res) => {
  const { token } = req.params;
  
  const verification = Array.from(verifications.values()).find(v => 
    v.verificationToken === token
  );
  
  if (!verification) {
    return res.status(404).json({
      success: false,
      message: '驗證記錄未找到'
    });
  }
  
  // 模擬驗證結果
  const isExpired = new Date() > new Date(verification.expiresAt);
  const mockHumanityIndex = Math.floor(Math.random() * 255);
  const passed = mockHumanityIndex >= 100;
  
  res.json({
    success: true,
    data: {
      verificationId: verification.id,
      status: isExpired ? 'expired' : (passed ? 'completed' : 'failed'),
      humanityIndex: mockHumanityIndex,
      passed,
      createdAt: verification.createdAt,
      completedAt: passed ? new Date().toISOString() : null,
      expiresAt: verification.expiresAt,
      user: {
        username: verification.username,
        isVerified: passed,
        humanityIndex: mockHumanityIndex
      }
    }
  });
});

// 獲取使用者資料
app.get('/api/v1/user/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: '需要認證'
    });
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const user = users.get(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '使用者不存在'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '無效的認證代幣'
    });
  }
});

// 系統統計 (管理員)
app.get('/api/v1/admin/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: users.size,
      verifiedUsers: Array.from(users.values()).filter(u => u.isVerified).length,
      todayRegistrations: Math.floor(Math.random() * 10),
      totalVerifications: verifications.size,
      successfulVerifications: Math.floor(verifications.size * 0.8),
      avgHumanityIndex: 125,
      mintedSBTs: Math.floor(users.size * 0.6),
      pendingSBTs: Math.floor(users.size * 0.1),
      sbtSuccessRate: 95,
      telegramActiveUsers: users.size,
      discordActiveUsers: 0,
      lineActiveUsers: 0,
      uptime: '2 hours 15 minutes',
      avgResponseTime: 150,
      errorRate: 2.1
    }
  });
});

// 錯誤處理
app.use((err, req, res, next) => {
  logger.error('API Error:', err);
  res.status(500).json({
    success: false,
    message: '伺服器內部錯誤'
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '端點不存在'
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  logger.info(`🚀 Twin Gate Demo API Server 已啟動`);
  logger.info(`📡 監聽端口: ${PORT}`);
  logger.info(`🌐 健康檢查: http://localhost:${PORT}/health`);
  logger.info(`📋 API 文檔: http://localhost:${PORT}/api/v1/verification/channels`);
  logger.info('='.repeat(50));
});

// 優雅關閉
process.on('SIGINT', () => {
  logger.info('收到 SIGINT，正在關閉伺服器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM，正在關閉伺服器...');
  process.exit(0);
});
