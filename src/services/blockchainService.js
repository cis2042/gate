const { ethers } = require('ethers');
const blockchainConfig = require('../config/blockchain');
const logger = require('../utils/logger');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.sbtContract = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      await blockchainConfig.initialize();
      this.provider = blockchainConfig.getProvider();
      this.wallet = blockchainConfig.getWallet();
      this.sbtContract = blockchainConfig.getSBTContract();
      this.initialized = true;
      
      logger.info('🔗 Blockchain service initialized successfully');
    } catch (error) {
      logger.error('Blockchain service initialization failed:', error);
      this.initialized = false;
    }
  }

  async mintSBT(walletAddress, tokenId, metadataURI) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      logger.info(`Minting SBT for wallet: ${walletAddress}`, {
        tokenId,
        metadataURI
      });

      // Estimate gas
      const gasEstimate = await this.sbtContract.mint.estimateGas(
        walletAddress,
        tokenId,
        metadataURI
      );

      // Get current gas price
      const gasPrice = await this.provider.getFeeData();

      // Execute mint transaction
      const tx = await this.sbtContract.mint(
        walletAddress,
        tokenId,
        metadataURI,
        {
          gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
          gasPrice: gasPrice.gasPrice
        }
      );

      logger.info(`SBT mint transaction sent: ${tx.hash}`, {
        tokenId,
        walletAddress,
        gasUsed: gasEstimate.toString(),
        gasPrice: gasPrice.gasPrice.toString()
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      logger.info(`SBT minted successfully: ${tx.hash}`, {
        tokenId,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: gasPrice.gasPrice.toString(),
        blockTimestamp: new Date()
      };
    } catch (error) {
      logger.error('SBT minting failed:', error);
      throw error;
    }
  }

  async revokeSBT(tokenId) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      logger.info(`Revoking SBT: ${tokenId}`);

      const gasEstimate = await this.sbtContract.revoke.estimateGas(tokenId);
      const gasPrice = await this.provider.getFeeData();

      const tx = await this.sbtContract.revoke(tokenId, {
        gasLimit: gasEstimate.mul(120).div(100),
        gasPrice: gasPrice.gasPrice
      });

      const receipt = await tx.wait();

      logger.info(`SBT revoked successfully: ${tx.hash}`, {
        tokenId,
        blockNumber: receipt.blockNumber
      });

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        blockTimestamp: new Date()
      };
    } catch (error) {
      logger.error('SBT revocation failed:', error);
      throw error;
    }
  }

  async updateTokenURI(tokenId, newMetadataURI) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      logger.info(`Updating token URI for: ${tokenId}`, {
        newMetadataURI
      });

      const gasEstimate = await this.sbtContract.setTokenURI.estimateGas(
        tokenId,
        newMetadataURI
      );
      const gasPrice = await this.provider.getFeeData();

      const tx = await this.sbtContract.setTokenURI(tokenId, newMetadataURI, {
        gasLimit: gasEstimate.mul(120).div(100),
        gasPrice: gasPrice.gasPrice
      });

      const receipt = await tx.wait();

      logger.info(`Token URI updated successfully: ${tx.hash}`, {
        tokenId,
        blockNumber: receipt.blockNumber
      });

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        blockTimestamp: new Date()
      };
    } catch (error) {
      logger.error('Token URI update failed:', error);
      throw error;
    }
  }

  async getTokenInfo(tokenId) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const [owner, tokenURI, exists] = await Promise.all([
        this.sbtContract.ownerOf(tokenId).catch(() => null),
        this.sbtContract.tokenURI(tokenId).catch(() => null),
        this.sbtContract.exists(tokenId).catch(() => false)
      ]);

      return {
        exists,
        owner,
        tokenURI
      };
    } catch (error) {
      logger.error('Failed to get token info:', error);
      throw error;
    }
  }

  async verifySignature(message, signature, expectedAddress) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  async getBalance(address) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Failed to get balance:', error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  async getCurrentBlockNumber() {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Failed to get current block number:', error);
      throw error;
    }
  }

  async getGasPrice() {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const feeData = await this.provider.getFeeData();
      return {
        gasPrice: feeData.gasPrice.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      };
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      throw error;
    }
  }

  async estimateGas(to, data, value = '0') {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      const gasEstimate = await this.provider.estimateGas({
        to,
        data,
        value: ethers.parseEther(value)
      });
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  // Event listening methods
  async listenToMintEvents(callback) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      this.sbtContract.on('Transfer', (from, to, tokenId, event) => {
        if (from === ethers.ZeroAddress) {
          // This is a mint event
          callback({
            type: 'mint',
            to,
            tokenId: tokenId.toString(),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        }
      });

      logger.info('Started listening to SBT mint events');
    } catch (error) {
      logger.error('Failed to listen to mint events:', error);
      throw error;
    }
  }

  async listenToRevokeEvents(callback) {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }

    try {
      this.sbtContract.on('Revoked', (tokenId, event) => {
        callback({
          type: 'revoke',
          tokenId: tokenId.toString(),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });
      });

      logger.info('Started listening to SBT revoke events');
    } catch (error) {
      logger.error('Failed to listen to revoke events:', error);
      throw error;
    }
  }

  // Utility methods
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  formatEther(wei) {
    return ethers.formatEther(wei);
  }

  parseEther(ether) {
    return ethers.parseEther(ether);
  }

  generateRandomWallet() {
    return ethers.Wallet.createRandom();
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
