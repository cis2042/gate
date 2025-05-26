const mongoose = require('mongoose');
const cryptoUtils = require('../utils/crypto');

const userSchema = new mongoose.Schema({
  // 基本資訊
  username: {
    type: String,
    required: [true, '使用者名稱為必填'],
    unique: true,
    trim: true,
    minlength: [3, '使用者名稱至少需要 3 個字元'],
    maxlength: [30, '使用者名稱不能超過 30 個字元'],
    match: [/^[a-zA-Z0-9_-]+$/, '使用者名稱只能包含字母、數字、底線和連字號']
  },
  email: {
    type: String,
    required: [true, '電子郵件為必填'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '請輸入有效的電子郵件']
  },
  password: {
    type: String,
    required: [true, '密碼為必填'],
    minlength: [8, '密碼至少需要 8 個字元'],
    select: false // 預設查詢時不包含密碼
  },

  // 個人資料資訊
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String, // URL to avatar image
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    dateOfBirth: {
      type: Date
    },
    location: {
      country: String,
      city: String,
      timezone: String
    }
  },

  // Account Status
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Twin3.ai 驗證資訊
  humanityIndex: {
    type: Number,
    min: 0,
    max: 255,
    default: null
  },
  verificationCompletedAt: {
    type: Date,
    default: null
  },
  verificationPlatform: {
    type: String,
    enum: ['discord', 'telegram', 'line'],
    default: null
  },

  // Blockchain Information
  walletAddress: {
    type: String,
    sparse: true, // Allow multiple null values
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format']
  },
  sbtTokenId: {
    type: String,
    sparse: true
  },
  sbtMintedAt: {
    type: Date
  },
  sbtMetadata: {
    tokenURI: String,
    attributes: mongoose.Schema.Types.Mixed
  },

  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    device: String,
    ip: String
  }],
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },

  // Activity Tracking
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },

  // Preferences
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    privacy: {
      profilePublic: {
        type: Boolean,
        default: false
      },
      showVerificationBadges: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ sbtTokenId: 1 });
userSchema.index({ verificationStatus: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActivity: -1 });

// Virtual fields
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.username;
});

userSchema.virtual('isFullyVerified').get(function() {
  return this.isVerified && this.emailVerified && this.verificationStatus === 'completed';
});

userSchema.virtual('hasSBT').get(function() {
  return !!this.sbtTokenId;
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if it's modified
  if (this.isModified('password')) {
    this.password = await cryptoUtils.hashPassword(this.password);
  }

  // Update lastActivity
  this.lastActivity = new Date();

  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await cryptoUtils.verifyPassword(candidatePassword, this.password);
};

userSchema.methods.generateAuthTokens = function() {
  const payload = {
    userId: this._id,
    username: this.username,
    role: this.role
  };

  const accessToken = cryptoUtils.generateJWT(payload);
  const refreshToken = cryptoUtils.generateRefreshToken(payload);

  return { accessToken, refreshToken };
};

userSchema.methods.addVerificationChannel = function(channel, identifier, data = {}) {
  const existingChannel = this.verificationChannels.find(vc => vc.channel === channel);

  if (existingChannel) {
    existingChannel.identifier = identifier;
    existingChannel.data = data;
  } else {
    this.verificationChannels.push({
      channel,
      identifier,
      data
    });
  }
};

userSchema.methods.markChannelVerified = function(channel) {
  const channelData = this.verificationChannels.find(vc => vc.channel === channel);
  if (channelData) {
    channelData.verified = true;
    channelData.verifiedAt = new Date();
  }
};

userSchema.methods.calculateVerificationScore = function() {
  const weights = {
    email: 10,
    phone: 15,
    twitter: 20,
    discord: 15,
    telegram: 15,
    github: 25,
    kyc: 30
  };

  let score = 0;
  this.verificationChannels.forEach(channel => {
    if (channel.verified && weights[channel.channel]) {
      score += weights[channel.channel];
    }
  });

  this.verificationScore = Math.min(score, 100);
  return this.verificationScore;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username });
};

userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);
