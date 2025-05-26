const { validationResult } = require('express-validator');
const Verification = require('../models/Verification');
const User = require('../models/User');
const cryptoUtils = require('../utils/crypto');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

class VerificationController {
  // 獲取可用的驗證渠道
  async getAvailableChannels(req, res) {
    try {
      const verificationLevels = [
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
      ];

      res.json({
        success: true,
        data: {
          verificationLevels,
          scoreRange: {
            min: 0,
            max: 255
          },
          passingThreshold: parseInt(process.env.VERIFICATION_PASSING_THRESHOLD) || 100,
          sbtMintingThreshold: parseInt(process.env.SBT_MINTING_THRESHOLD) || 100,
          twin3Integration: {
            apiBaseUrl: process.env.TWIN3_API_URL || 'https://api.twin3.ai',
            webVerificationUrl: process.env.TWIN3_WEB_VERIFICATION_URL || 'https://verify.twin3.ai',
            note: '所有驗證都通過 twin3.ai API 處理'
          }
        }
      });
    } catch (error) {
      logger.error('Get available channels error:', error);
      throw new AppError('Failed to get available channels', 500);
    }
  }

  // 開始驗證流程 - 生成驗證鏈接
  async startVerification(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '驗證失敗',
        errors: errors.array()
      });
    }

    try {
      const { platform, userId: platformUserId, username } = req.body;
      const user = req.user;

      // 檢查使用者是否已有進行中的驗證
      const existingVerification = await Verification.findOne({
        userId: user._id,
        status: { $in: ['pending', 'in_progress'] }
      });

      if (existingVerification) {
        return res.status(409).json({
          success: false,
          message: '您已有進行中的驗證',
          data: {
            verificationId: existingVerification._id,
            verificationUrl: existingVerification.verificationUrl,
            status: existingVerification.status
          }
        });
      }

      // 生成唯一的驗證代幣
      const verificationToken = this.generateVerificationToken();

      // 創建新的驗證記錄
      const verification = new Verification({
        userId: user._id,
        platform: platform || 'telegram', // discord, telegram, line
        platformUserId,
        username,
        verificationToken,
        verificationUrl: this.generateVerificationUrl(verificationToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 分鐘過期
      });

      await verification.save();

      logger.info(`驗證開始: platform=${platform} for user ${user.email}`, {
        userId: user._id,
        verificationId: verification._id,
        platform,
        platformUserId
      });

      res.status(201).json({
        success: true,
        message: '驗證鏈接已生成',
        data: {
          verificationId: verification._id,
          verificationUrl: verification.verificationUrl,
          verificationToken,
          expiresAt: verification.expiresAt,
          status: verification.status,
          instructions: '請點擊驗證鏈接完成 twin3.ai 人類身份驗證'
        }
      });
    } catch (error) {
      logger.error('Start verification error:', error);
      throw new AppError('Failed to start verification', 500);
    }
  }

  // Submit verification proof
  async submitVerification(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { verificationId, proofData } = req.body;
      const user = req.user;

      const verification = await Verification.findOne({
        _id: verificationId,
        userId: user._id
      });

      if (!verification) {
        return res.status(404).json({
          success: false,
          message: 'Verification not found'
        });
      }

      if (verification.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Verification is not in pending status'
        });
      }

      if (verification.isExpired) {
        return res.status(400).json({
          success: false,
          message: 'Verification has expired'
        });
      }

      // Update verification with proof data
      verification.status = 'in_progress';
      verification.submissionData = {
        ...verification.submissionData,
        ...proofData,
        submittedAt: new Date()
      };

      await verification.save();

      // Process verification based on channel
      const result = await this.processVerification(verification);

      res.json({
        success: true,
        message: 'Verification submitted successfully',
        data: {
          verificationId: verification._id,
          status: verification.status,
          result
        }
      });
    } catch (error) {
      logger.error('Submit verification error:', error);
      throw new AppError('Failed to submit verification', 500);
    }
  }

  // 處理 twin3.ai 驗證結果回調
  async handleVerificationCallback(req, res) {
    try {
      const { verificationToken, humanityIndex, verificationData, signature } = req.body;

      // 驗證簽名（確保請求來自 twin3.ai）
      if (!this.verifyTwin3Signature(req.body, signature)) {
        return res.status(401).json({
          success: false,
          message: '無效的簽名'
        });
      }

      // 查找驗證記錄
      const verification = await Verification.findOne({
        verificationToken,
        status: { $in: ['pending', 'in_progress'] }
      });

      if (!verification) {
        return res.status(404).json({
          success: false,
          message: '驗證記錄未找到'
        });
      }

      // 更新驗證結果
      verification.humanityIndex = humanityIndex;
      verification.verificationData = verificationData;
      verification.completedAt = new Date();

      const passingThreshold = parseInt(process.env.VERIFICATION_PASSING_THRESHOLD) || 100;
      verification.status = humanityIndex >= passingThreshold ? 'completed' : 'failed';
      verification.passed = humanityIndex >= passingThreshold;

      await verification.save();

      // 更新使用者驗證狀態
      const user = await User.findById(verification.userId);
      if (user) {
        user.humanityIndex = humanityIndex;
        user.isVerified = verification.passed;
        user.verificationCompletedAt = new Date();
        await user.save();

        // 如果驗證通過且達到 SBT 鑄造門檻，觸發 SBT 鑄造
        const sbtThreshold = parseInt(process.env.SBT_MINTING_THRESHOLD) || 100;
        if (verification.passed && humanityIndex >= sbtThreshold) {
          await this.triggerSBTMinting(user._id, humanityIndex);
        }
      }

      // 發送通知給使用者（通過 Bot）
      await this.sendVerificationResultNotification(verification);

      logger.info(`驗證結果處理完成: humanityIndex=${humanityIndex} for user ${user?.email}`, {
        userId: verification.userId,
        verificationId: verification._id,
        humanityIndex,
        passed: verification.passed
      });

      res.json({
        success: true,
        message: '驗證結果已處理'
      });
    } catch (error) {
      logger.error('Verification callback error:', error);
      throw new AppError('Failed to handle verification callback', 500);
    }
  }

  // Get verification status
  async getVerificationStatus(req, res) {
    try {
      const user = req.user;

      const verifications = await Verification.findByUser(user._id);

      const statusSummary = {
        totalVerifications: verifications.length,
        completedVerifications: verifications.filter(v => v.status === 'completed').length,
        pendingVerifications: verifications.filter(v => v.status === 'pending').length,
        failedVerifications: verifications.filter(v => v.status === 'failed').length,
        totalScore: user.verificationScore,
        channels: {}
      };

      // Group by channel
      verifications.forEach(verification => {
        if (!statusSummary.channels[verification.channel]) {
          statusSummary.channels[verification.channel] = [];
        }
        statusSummary.channels[verification.channel].push({
          id: verification._id,
          status: verification.status,
          score: verification.verificationScore,
          startedAt: verification.startedAt,
          completedAt: verification.completedAt
        });
      });

      res.json({
        success: true,
        data: statusSummary
      });
    } catch (error) {
      logger.error('Get verification status error:', error);
      throw new AppError('Failed to get verification status', 500);
    }
  }

  // Get verification history
  async getVerificationHistory(req, res) {
    try {
      const user = req.user;
      const { page = 1, limit = 20 } = req.query;

      const verifications = await Verification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Verification.countDocuments({ userId: user._id });

      res.json({
        success: true,
        data: {
          verifications: verifications.map(v => ({
            id: v._id,
            channel: v.channel,
            challengeType: v.challengeType,
            status: v.status,
            verificationScore: v.verificationScore,
            startedAt: v.startedAt,
            completedAt: v.completedAt,
            errorMessage: v.errorMessage
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get verification history error:', error);
      throw new AppError('Failed to get verification history', 500);
    }
  }

  // 輔助方法
  generateChallengeData(channel, taskLevel, identifier) {
    const challengeData = {
      metadata: {
        generatedAt: new Date(),
        identifier,
        taskLevel
      }
    };

    // 根據任務等級設定不同的分數和難度
    const taskConfig = this.getTaskConfig(channel, taskLevel);
    challengeData.expectedScore = taskConfig.score;
    challengeData.difficulty = taskConfig.difficulty;

    switch (channel) {
      case 'twitter':
        challengeData.instructions = `完成 Twitter ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('twitter', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/twitter/${taskLevel}`;
        break;

      case 'discord':
        challengeData.instructions = `完成 Discord ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('discord', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/discord/${taskLevel}`;
        break;

      case 'telegram':
        challengeData.instructions = `完成 Telegram ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('telegram', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/telegram/${taskLevel}`;
        break;

      case 'github':
        challengeData.instructions = `完成 GitHub ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('github', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/github/${taskLevel}`;
        break;

      case 'email':
        challengeData.instructions = `完成 Email ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('email', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/email/${taskLevel}`;
        break;

      case 'phone':
        challengeData.instructions = `完成 Phone ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('phone', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/phone/${taskLevel}`;
        break;

      case 'kyc':
        challengeData.instructions = `完成 KYC ${taskLevel} 驗證任務`;
        challengeData.taskDescription = this.getTaskDescription('kyc', taskLevel);
        challengeData.twin3ApiEndpoint = `/api/verification/kyc/${taskLevel}`;
        break;

      default:
        challengeData.instructions = `完成 ${taskLevel} 驗證任務`;
        challengeData.taskDescription = '請聯繫 twin3 API 獲取具體任務詳情';
        challengeData.twin3ApiEndpoint = `/api/verification/${channel}/${taskLevel}`;
    }

    // 添加驗證代幣用於與 twin3 API 整合
    challengeData.verificationToken = this.generateVerificationToken();

    return challengeData;
  }

  // 獲取任務配置
  getTaskConfig(channel, taskLevel) {
    const configs = {
      twitter: {
        task1: { score: 10, difficulty: 'easy' },
        task2: { score: 15, difficulty: 'medium' },
        task3: { score: 20, difficulty: 'hard' }
      },
      discord: {
        task1: { score: 8, difficulty: 'easy' },
        task2: { score: 12, difficulty: 'medium' },
        task3: { score: 15, difficulty: 'hard' }
      },
      telegram: {
        task1: { score: 8, difficulty: 'easy' },
        task2: { score: 12, difficulty: 'medium' },
        task3: { score: 15, difficulty: 'hard' }
      },
      github: {
        task1: { score: 15, difficulty: 'easy' },
        task2: { score: 20, difficulty: 'medium' },
        task3: { score: 25, difficulty: 'hard' }
      },
      email: {
        task1: { score: 5, difficulty: 'easy' },
        task2: { score: 8, difficulty: 'medium' },
        task3: { score: 10, difficulty: 'hard' }
      },
      phone: {
        task1: { score: 8, difficulty: 'easy' },
        task2: { score: 12, difficulty: 'medium' },
        task3: { score: 15, difficulty: 'hard' }
      },
      kyc: {
        task1: { score: 20, difficulty: 'medium' },
        task2: { score: 25, difficulty: 'hard' },
        task3: { score: 30, difficulty: 'very_hard' }
      }
    };

    return configs[channel]?.[taskLevel] || { score: 10, difficulty: 'medium' };
  }

  // 獲取任務描述
  getTaskDescription(channel, taskLevel) {
    const descriptions = {
      twitter: {
        task1: '基礎 Twitter 帳戶驗證',
        task2: '進階 Twitter 活動驗證',
        task3: '高級 Twitter 影響力驗證'
      },
      discord: {
        task1: '基礎 Discord 帳戶驗證',
        task2: '進階 Discord 社群參與驗證',
        task3: '高級 Discord 貢獻驗證'
      },
      telegram: {
        task1: '基礎 Telegram 帳戶驗證',
        task2: '進階 Telegram 活動驗證',
        task3: '高級 Telegram 社群驗證'
      },
      github: {
        task1: '基礎 GitHub 帳戶驗證',
        task2: '進階 GitHub 專案驗證',
        task3: '高級 GitHub 貢獻驗證'
      },
      email: {
        task1: '基礎電子郵件驗證',
        task2: '進階電子郵件域名驗證',
        task3: '高級電子郵件信譽驗證'
      },
      phone: {
        task1: '基礎電話號碼驗證',
        task2: '進階電話號碼地區驗證',
        task3: '高級電話號碼實名驗證'
      },
      kyc: {
        task1: '基礎身份文件驗證',
        task2: '進階生物識別驗證',
        task3: '高級身份背景調查'
      }
    };

    return descriptions[channel]?.[taskLevel] || `${channel} ${taskLevel} 驗證任務`;
  }

  // 生成驗證代幣
  generateVerificationToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  sanitizeChallengeData(challengeData) {
    // 移除敏感資料後再發送給客戶端
    const sanitized = { ...challengeData };
    delete sanitized.verificationCode;
    delete sanitized.verificationToken; // 不要暴露驗證代幣給前端
    return sanitized;
  }

  async processVerification(verification) {
    // This is a placeholder for verification processing logic
    // In a real implementation, this would handle different verification types

    switch (verification.channel) {
      case 'email':
      case 'phone':
        // These would be processed when the code is verified
        return { message: 'Awaiting code verification' };

      default:
        // Auto-approve for demo purposes
        verification.markCompleted(75);
        await verification.save();

        // Update user verification data
        const user = await User.findById(verification.userId);
        user.markChannelVerified(verification.channel);
        user.calculateVerificationScore();
        await user.save();

        return { message: 'Verification completed successfully' };
    }
  }

  // Placeholder methods for other verification functions
  async verifyCode(req, res) {
    res.status(501).json({
      success: false,
      message: 'Verify code functionality not yet implemented'
    });
  }

  async getVerificationDetails(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get verification details functionality not yet implemented'
    });
  }

  async retryVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Retry verification functionality not yet implemented'
    });
  }

  async cancelVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Cancel verification functionality not yet implemented'
    });
  }

  // Social media verification methods (placeholders)
  async startTwitterVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Twitter verification functionality not yet implemented'
    });
  }

  async verifyTwitterPost(req, res) {
    res.status(501).json({
      success: false,
      message: 'Twitter post verification functionality not yet implemented'
    });
  }

  async startDiscordVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Discord verification functionality not yet implemented'
    });
  }

  async verifyDiscordMembership(req, res) {
    res.status(501).json({
      success: false,
      message: 'Discord membership verification functionality not yet implemented'
    });
  }

  async startTelegramVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Telegram verification functionality not yet implemented'
    });
  }

  async verifyTelegramMembership(req, res) {
    res.status(501).json({
      success: false,
      message: 'Telegram membership verification functionality not yet implemented'
    });
  }

  async startGitHubVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'GitHub verification functionality not yet implemented'
    });
  }

  async handleGitHubCallback(req, res) {
    res.status(501).json({
      success: false,
      message: 'GitHub callback functionality not yet implemented'
    });
  }

  async sendEmailVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Send email verification functionality not yet implemented'
    });
  }

  async sendPhoneVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Send phone verification functionality not yet implemented'
    });
  }

  async startKYCVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'KYC verification functionality not yet implemented'
    });
  }

  async uploadKYCDocument(req, res) {
    res.status(501).json({
      success: false,
      message: 'Upload KYC document functionality not yet implemented'
    });
  }

  // Admin methods (placeholders)
  async getPendingVerifications(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get pending verifications functionality not yet implemented'
    });
  }

  async approveVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Approve verification functionality not yet implemented'
    });
  }

  async rejectVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Reject verification functionality not yet implemented'
    });
  }

  async getVerificationStats(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get verification stats functionality not yet implemented'
    });
  }
}

module.exports = new VerificationController();
