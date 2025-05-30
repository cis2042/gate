// 進度追蹤服務 - 提供視覺化進度指示
const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/userSession');

class ProgressTracker {
  constructor() {
    this.progressData = new Map();
  }

  /**
   * 創建進度條視覺化
   */
  createProgressBar(current, total, width = 10) {
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;

    const filledChar = '█';
    const emptyChar = '░';

    return filledChar.repeat(filled) + emptyChar.repeat(empty);
  }

  /**
   * 獲取驗證進度消息
   */
  getVerificationProgressMessage(verificationStatus, language = 'en-US') {
    const level = verificationStatus.verificationLevel || 0;
    const humanityIndex = verificationStatus.humanityIndex || 0;

    // 計算總體進度
    const totalProgress = Math.min(level / 3 * 100, 100);
    const progressBar = this.createProgressBar(level, 3, 12);

    // 等級狀態圖標
    const levelIcons = {
      0: '⭕',
      1: '🟢',
      2: '🟡',
      3: '🔴'
    };

    const message = `📊 **Verification Progress**\n\n` +
      `**Overall Progress:** ${Math.floor(totalProgress)}%\n` +
      `${progressBar} ${level}/3 levels\n\n` +
      `**Verification Levels:**\n` +
      `${level >= 1 ? '✅' : '⭕'} Level 1 - Basic verification\n` +
      `${level >= 2 ? '✅' : '⭕'} Level 2 - Phone verification\n` +
      `${level >= 3 ? '✅' : '⭕'} Level 3 - Advanced verification\n\n` +
      `**Humanity Index:** ${humanityIndex}/255\n` +
      `${this.createProgressBar(humanityIndex, 255, 15)}\n\n` +
      `${this.getNextStepMessage(level, language)}`;

    return message;
  }

  /**
   * 獲取下一步提示
   */
  getNextStepMessage(currentLevel, language) {
    const nextSteps = {
      0: '🎯 **Next:** Complete Level 1 to start your journey',
      1: '🎯 **Next:** Complete Level 2 to unlock SBT minting',
      2: '🎯 **Next:** Complete Level 3 for maximum verification',
      3: '🎉 **Congratulations!** All levels completed!'
    };

    return nextSteps[currentLevel] || nextSteps[0];
  }

  /**
   * 獲取等級詳細信息
   */
  getLevelDetails(level, language = 'en-US') {
    const levelDetails = {
      1: {
        title: '🟢 Level 1 - Basic Verification',
        description: 'Prove you\'re not a robot with Google reCAPTCHA',
        timeEstimate: '1-2 minutes',
        scoreRange: '50-80 points',
        requirements: ['Complete reCAPTCHA challenge', 'Basic human verification'],
        benefits: ['Start your verification journey', 'Unlock Level 2']
      },
      2: {
        title: '🟡 Level 2 - Phone Verification',
        description: 'Verify your identity with phone number',
        timeEstimate: '3-5 minutes',
        scoreRange: '80-150 points',
        requirements: ['Valid phone number', 'SMS verification code'],
        benefits: ['Unlock SBT minting', 'Higher humanity score', 'Access to more features']
      },
      3: {
        title: '🔴 Level 3 - Advanced Verification',
        description: 'Biometric verification with Apple/Google account',
        timeEstimate: '2-3 minutes',
        scoreRange: '120-200 points',
        requirements: ['Apple ID or Google account', 'Biometric authentication'],
        benefits: ['Maximum verification level', 'Highest humanity score', 'Premium features']
      }
    };

    return levelDetails[level];
  }

  /**
   * 創建等級詳情消息
   */
  createLevelDetailMessage(level, language = 'en-US') {
    const details = this.getLevelDetails(level, language);
    if (!details) return 'Level not found';

    const message = `${details.title}\n\n` +
      `📝 **Description:**\n${details.description}\n\n` +
      `⏱️ **Time needed:** ${details.timeEstimate}\n` +
      `📊 **Score range:** ${details.scoreRange}\n\n` +
      `**Requirements:**\n${details.requirements.map(req => `• ${req}`).join('\n')}\n\n` +
      `**Benefits:**\n${details.benefits.map(benefit => `✨ ${benefit}`).join('\n')}`;

    return message;
  }

  /**
   * 獲取時間估算
   */
  getTimeEstimate(levels = [1, 2, 3]) {
    const timeMap = {
      1: 2,  // 2 minutes
      2: 4,  // 4 minutes
      3: 3   // 3 minutes
    };

    const totalMinutes = levels.reduce((total, level) => total + (timeMap[level] || 0), 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * 創建時間估算消息
   */
  createTimeEstimateMessage(selectedLevels, language = 'en-US') {
    const totalTime = this.getTimeEstimate(selectedLevels);

    const message = `⏱️ **Time Estimate**\n\n` +
      `**Selected levels:** ${selectedLevels.join(', ')}\n` +
      `**Total time needed:** ~${totalTime}\n\n` +
      `**Breakdown:**\n` +
      selectedLevels.map(level => {
        const details = this.getLevelDetails(level);
        return `• Level ${level}: ${details?.timeEstimate || 'Unknown'}`;
      }).join('\n') + '\n\n' +
      `💡 **Tip:** You can complete levels one by one, no need to do all at once!`;

    return message;
  }



  /**
   * 保存進度數據
   */
  async saveProgress(userId, progressData) {
    this.progressData.set(userId, {
      ...progressData,
      timestamp: Date.now()
    });

    await updateUserSession(userId, { progress: progressData });
  }

  /**
   * 獲取進度數據
   */
  getProgress(userId) {
    return this.progressData.get(userId);
  }

  /**
   * 計算完成百分比
   */
  calculateCompletionPercentage(verificationStatus) {
    let completed = 0;
    let total = 6; // 3 levels + SBT + high score + all features

    if (verificationStatus.level1Completed) completed++;
    if (verificationStatus.level2Completed) completed++;
    if (verificationStatus.level3Completed) completed++;
    if (verificationStatus.hasSBT) completed++;
    if (verificationStatus.humanityIndex >= 100) completed++;
    if (verificationStatus.humanityIndex >= 200) completed++;

    return Math.floor((completed / total) * 100);
  }
}

// 創建單例實例
const progressTracker = new ProgressTracker();

module.exports = progressTracker;
