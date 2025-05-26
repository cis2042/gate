const mongoose = require('mongoose');

const sbtSchema = new mongoose.Schema({
  // Token Information
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Owner Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  walletAddress: {
    type: String,
    required: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'],
    index: true
  },
  
  // Blockchain Information
  contractAddress: {
    type: String,
    required: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format']
  },
  
  network: {
    type: String,
    required: true,
    enum: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'],
    default: 'polygon'
  },
  
  chainId: {
    type: Number,
    required: true
  },
  
  // Transaction Information
  mintTxHash: {
    type: String,
    required: true,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format']
  },
  
  blockNumber: {
    type: Number,
    required: true
  },
  
  blockTimestamp: {
    type: Date,
    required: true
  },
  
  gasUsed: {
    type: Number
  },
  
  gasPrice: {
    type: String // Store as string to handle large numbers
  },
  
  // Metadata
  tokenURI: {
    type: String,
    required: true
  },
  
  metadata: {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    external_url: String,
    background_color: String,
    animation_url: String,
    youtube_url: String,
    
    // Twin3 specific attributes
    attributes: [{
      trait_type: {
        type: String,
        required: true
      },
      value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      },
      display_type: String, // 'number', 'boost_percentage', 'boost_number', 'date'
      max_value: Number
    }],
    
    // Verification data embedded in metadata
    verificationData: {
      verificationScore: {
        type: Number,
        min: 0,
        max: 100
      },
      verifiedChannels: [{
        channel: String,
        verifiedAt: Date,
        score: Number
      }],
      totalChannels: Number,
      verificationLevel: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
      },
      issuedAt: Date,
      expiresAt: Date, // If SBT has expiration
      version: {
        type: String,
        default: '1.0'
      }
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'minted', 'transferred', 'burned', 'revoked'],
    default: 'pending',
    index: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Revocation/Transfer Information
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedReason: String,
  revokedTxHash: String,
  
  transferredAt: Date,
  transferredTo: String, // New wallet address
  transferTxHash: String,
  
  // Upgrade/Update Information
  upgradedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SBT'
  },
  upgradedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SBT'
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  
  lastViewed: Date,
  
  // External Storage
  ipfsHash: String, // IPFS hash for metadata
  arweaveId: String, // Arweave transaction ID for permanent storage
  
  // Admin Information
  mintedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin who triggered the mint
  },
  
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
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
sbtSchema.index({ userId: 1, status: 1 });
sbtSchema.index({ walletAddress: 1, status: 1 });
sbtSchema.index({ mintTxHash: 1 });
sbtSchema.index({ network: 1, chainId: 1 });
sbtSchema.index({ 'metadata.verificationData.verificationLevel': 1 });
sbtSchema.index({ createdAt: -1 });

// Virtual fields
sbtSchema.virtual('isExpired').get(function() {
  if (this.metadata.verificationData.expiresAt) {
    return new Date() > this.metadata.verificationData.expiresAt;
  }
  return false;
});

sbtSchema.virtual('age').get(function() {
  return new Date() - this.createdAt;
});

sbtSchema.virtual('blockExplorerUrl').get(function() {
  const explorers = {
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
    80001: 'https://mumbai.polygonscan.com',
    56: 'https://bscscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io'
  };
  
  const baseUrl = explorers[this.chainId];
  return baseUrl ? `${baseUrl}/tx/${this.mintTxHash}` : null;
});

sbtSchema.virtual('openseaUrl').get(function() {
  const networks = {
    1: 'ethereum',
    137: 'matic',
    42161: 'arbitrum',
    10: 'optimism'
  };
  
  const network = networks[this.chainId];
  if (network) {
    return `https://opensea.io/assets/${network}/${this.contractAddress}/${this.tokenId}`;
  }
  return null;
});

// Pre-save middleware
sbtSchema.pre('save', function(next) {
  // Update status based on other fields
  if (this.revokedAt && this.status !== 'revoked') {
    this.status = 'revoked';
    this.isActive = false;
  }
  
  if (this.transferredAt && this.status !== 'transferred') {
    this.status = 'transferred';
  }
  
  // Ensure metadata has required Twin3 structure
  if (!this.metadata.verificationData) {
    this.metadata.verificationData = {
      issuedAt: new Date(),
      version: '1.0'
    };
  }
  
  next();
});

// Instance methods
sbtSchema.methods.revoke = function(reason, revokedBy, txHash) {
  this.status = 'revoked';
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  this.revokedBy = revokedBy;
  this.revokedTxHash = txHash;
};

sbtSchema.methods.transfer = function(newWalletAddress, txHash) {
  this.status = 'transferred';
  this.transferredAt = new Date();
  this.transferredTo = newWalletAddress;
  this.transferTxHash = txHash;
};

sbtSchema.methods.incrementView = function() {
  this.viewCount += 1;
  this.lastViewed = new Date();
};

sbtSchema.methods.addAdminNote = function(note, adminId) {
  this.adminNotes.push({
    note,
    addedBy: adminId,
    addedAt: new Date()
  });
};

sbtSchema.methods.updateMetadata = function(newMetadata) {
  this.metadata = { ...this.metadata, ...newMetadata };
  this.metadata.verificationData.version = '1.1'; // Increment version
};

sbtSchema.methods.getVerificationLevel = function() {
  const score = this.metadata.verificationData.verificationScore || 0;
  
  if (score >= 90) return 'diamond';
  if (score >= 75) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  return 'bronze';
};

// Static methods
sbtSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

sbtSchema.statics.findByWallet = function(walletAddress) {
  return this.find({ 
    walletAddress: walletAddress.toLowerCase(), 
    isActive: true 
  }).sort({ createdAt: -1 });
};

sbtSchema.statics.findByTokenId = function(tokenId) {
  return this.findOne({ tokenId, isActive: true });
};

sbtSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalMinted: { $sum: '$count' },
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

sbtSchema.statics.getVerificationLevelStats = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$metadata.verificationData.verificationLevel',
        count: { $sum: 1 },
        avgScore: { $avg: '$metadata.verificationData.verificationScore' }
      }
    }
  ]);
};

module.exports = mongoose.model('SBT', sbtSchema);
