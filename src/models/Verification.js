const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 平台資訊
  platform: {
    type: String,
    required: true,
    enum: ['discord', 'telegram', 'line'],
    index: true
  },

  platformUserId: {
    type: String,
    required: true,
    index: true
  },

  username: {
    type: String,
    required: false
  },

  // 驗證代幣和 URL
  verificationToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  verificationUrl: {
    type: String,
    required: true
  },

  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },

  // Twin3.ai 驗證結果
  humanityIndex: {
    type: Number,
    min: 0,
    max: 255,
    default: null
  },

  passed: {
    type: Boolean,
    default: false
  },

  verificationData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Challenge Information
  challengeType: {
    type: String,
    enum: ['post', 'follow', 'join', 'message', 'code', 'document', 'biometric'],
    required: true
  },

  challengeData: {
    // For social media verifications
    requiredText: String,
    postUrl: String,
    followTarget: String,
    joinTarget: String,

    // For code-based verifications
    verificationCode: String,
    codeExpires: Date,

    // For document verifications
    documentType: String,
    documentUrl: String,

    // For manual verifications
    instructions: String,

    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed
  },

  // Submission Information
  submissionData: {
    // User's response/proof
    proofUrl: String,
    proofText: String,
    documentUrls: [String],

    // Verification details
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Admin/moderator who verified
    },

    // Additional data collected during verification
    collectedData: mongoose.Schema.Types.Mixed
  },

  // Scoring and Assessment
  verificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  confidenceLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'low'
  },

  // Timing
  startedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: {
    type: Date
  },

  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  },

  // Retry Information
  attemptNumber: {
    type: Number,
    default: 1
  },

  maxAttempts: {
    type: Number,
    default: 3
  },

  // Error Handling
  errorMessage: String,
  errorCode: String,

  // Admin Notes
  adminNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // External References
  externalId: String, // ID from external service (Twitter, Discord, etc.)
  externalData: mongoose.Schema.Types.Mixed, // Data from external APIs

  // Blockchain Integration
  blockchainTxHash: String, // Transaction hash if verification triggers blockchain action
  blockchainConfirmed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
verificationSchema.index({ userId: 1, channel: 1 });
verificationSchema.index({ status: 1, createdAt: -1 });
verificationSchema.index({ expiresAt: 1 });
verificationSchema.index({ 'challengeData.verificationCode': 1 });
verificationSchema.index({ externalId: 1 });

// Virtual fields
verificationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

verificationSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const remaining = this.expiresAt - now;
  return remaining > 0 ? remaining : 0;
});

verificationSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return new Date() - this.startedAt;
});

// Pre-save middleware
verificationSchema.pre('save', function(next) {
  // Set completion time when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Set default expiration time if not set
  if (!this.expiresAt) {
    const expirationHours = {
      'twitter': 24,
      'discord': 24,
      'telegram': 24,
      'github': 48,
      'email': 1,
      'phone': 1,
      'kyc': 168, // 7 days
      'manual': 168
    };

    const hours = expirationHours[this.channel] || 24;
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  next();
});

// Instance methods
verificationSchema.methods.markCompleted = function(score = 100, verifiedBy = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.verificationScore = score;
  this.submissionData.verifiedAt = new Date();

  if (verifiedBy) {
    this.submissionData.verifiedBy = verifiedBy;
  }

  // Set confidence level based on score
  if (score >= 90) {
    this.confidenceLevel = 'very_high';
  } else if (score >= 75) {
    this.confidenceLevel = 'high';
  } else if (score >= 50) {
    this.confidenceLevel = 'medium';
  } else {
    this.confidenceLevel = 'low';
  }
};

verificationSchema.methods.markFailed = function(errorMessage, errorCode = null) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.errorCode = errorCode;
  this.completedAt = new Date();
};

verificationSchema.methods.addAdminNote = function(note, adminId) {
  this.adminNotes.push({
    note,
    addedBy: adminId,
    addedAt: new Date()
  });
};

verificationSchema.methods.canRetry = function() {
  return this.attemptNumber < this.maxAttempts && !this.isExpired;
};

verificationSchema.methods.incrementAttempt = function() {
  this.attemptNumber += 1;
  this.status = 'pending';
  this.errorMessage = undefined;
  this.errorCode = undefined;
};

// Static methods
verificationSchema.statics.findByUser = function(userId, channel = null) {
  const query = { userId };
  if (channel) {
    query.channel = channel;
  }
  return this.find(query).sort({ createdAt: -1 });
};

verificationSchema.statics.findPending = function(channel = null) {
  const query = { status: 'pending' };
  if (channel) {
    query.channel = channel;
  }
  return this.find(query).sort({ createdAt: 1 });
};

verificationSchema.statics.findByCode = function(code) {
  return this.findOne({
    'challengeData.verificationCode': code,
    status: { $in: ['pending', 'in_progress'] },
    expiresAt: { $gt: new Date() }
  });
};

verificationSchema.statics.getStats = function(timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          channel: '$channel',
          status: '$status'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$verificationScore' }
      }
    },
    {
      $group: {
        _id: '$_id.channel',
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgScore: '$avgScore'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

module.exports = mongoose.model('Verification', verificationSchema);
