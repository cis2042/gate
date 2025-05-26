const { ethers } = require('ethers');
const logger = require('../utils/logger');

class BlockchainConfig {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.sbtContract = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize provider
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      if (!rpcUrl) {
        throw new Error('BLOCKCHAIN_RPC_URL is not defined');
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`🔗 Connected to blockchain network: ${network.name} (Chain ID: ${network.chainId})`);

      // Initialize wallet if private key is provided
      const privateKey = process.env.PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        const address = await this.wallet.getAddress();
        logger.info(`👛 Wallet initialized: ${address}`);
      }

      // Initialize SBT contract if address and ABI are provided
      const contractAddress = process.env.CONTRACT_ADDRESS;
      if (contractAddress && this.wallet) {
        try {
          // Load contract ABI
          const contractABI = require(process.env.SBT_CONTRACT_ABI_PATH || '../contracts/Twin3SBT.json');
          this.sbtContract = new ethers.Contract(contractAddress, contractABI, this.wallet);
          logger.info(`📄 SBT Contract initialized: ${contractAddress}`);
        } catch (error) {
          logger.warn('SBT Contract initialization failed:', error.message);
        }
      }

      this.initialized = true;
      logger.info('✅ Blockchain configuration initialized successfully');

    } catch (error) {
      logger.error('❌ Blockchain initialization failed:', error.message);
      throw error;
    }
  }

  getProvider() {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  getWallet() {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized. Call initialize() first.');
    }
    return this.wallet;
  }

  getSBTContract() {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized. Call initialize() first.');
    }
    return this.sbtContract;
  }

  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting balance:', error.message);
      throw error;
    }
  }

  async estimateGas(transaction) {
    try {
      return await this.provider.estimateGas(transaction);
    } catch (error) {
      logger.error('Error estimating gas:', error.message);
      throw error;
    }
  }

  async getGasPrice() {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice;
    } catch (error) {
      logger.error('Error getting gas price:', error.message);
      throw error;
    }
  }

  // Network configuration presets
  static getNetworkConfig(network) {
    const configs = {
      'ethereum-mainnet': {
        name: 'Ethereum Mainnet',
        chainId: 1,
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        blockExplorer: 'https://etherscan.io'
      },
      'polygon-mainnet': {
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com'
      },
      'polygon-mumbai': {
        name: 'Polygon Mumbai Testnet',
        chainId: 80001,
        rpcUrl: 'https://rpc-mumbai.maticvigil.com',
        blockExplorer: 'https://mumbai.polygonscan.com'
      },
      'ethereum-sepolia': {
        name: 'Ethereum Sepolia Testnet',
        chainId: 11155111,
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
        blockExplorer: 'https://sepolia.etherscan.io'
      }
    };

    return configs[network] || null;
  }
}

// Create singleton instance
const blockchainConfig = new BlockchainConfig();

module.exports = blockchainConfig;
