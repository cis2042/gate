const axios = require('axios');
const logger = require('../utils/logger');

class ApiClient {
  constructor() {
    this.baseURL = process.env.API_BASE_URL;
    this.timeout = parseInt(process.env.API_TIMEOUT) || 30000;
    this.client = this.createClient();
  }

  createClient() {
    const client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TwinGate-TelegramBot/1.0.0'
      }
    });

    // Request interceptor
    client.interceptors.request.use(
      (config) => {
        const startTime = Date.now();
        config.metadata = { startTime };

        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          method: config.method,
          url: config.url,
          headers: config.headers
        });

        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;

        logger.apiCall(
          response.config.method?.toUpperCase(),
          response.config.url,
          response.status,
          duration,
          {
            responseSize: JSON.stringify(response.data).length
          }
        );

        return response;
      },
      (error) => {
        const duration = error.config?.metadata?.startTime
          ? Date.now() - error.config.metadata.startTime
          : 0;

        logger.apiCall(
          error.config?.method?.toUpperCase() || 'UNKNOWN',
          error.config?.url || 'UNKNOWN',
          error.response?.status || 0,
          duration,
          {
            error: error.message,
            responseData: error.response?.data
          }
        );

        return Promise.reject(error);
      }
    );

    return client;
  }

  // Authentication methods
  async registerUser(userData) {
    try {
      const response = await this.client.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'registerUser');
    }
  }

  async loginUser(credentials) {
    try {
      const response = await this.client.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'loginUser');
    }
  }

  async getUserProfile(token) {
    try {
      const response = await this.client.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getUserProfile');
    }
  }

  // Verification methods
  async getVerificationChannels(token) {
    try {
      const response = await this.client.get('/verification/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getVerificationChannels');
    }
  }

  async startVerification(token, verificationData) {
    try {
      const response = await this.client.post('/verification/start', verificationData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'startVerification');
    }
  }

  async submitVerification(token, submissionData) {
    try {
      const response = await this.client.post('/verification/submit', submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'submitVerification');
    }
  }

  async getVerificationStatus(token) {
    try {
      const response = await this.client.get('/verification/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getVerificationStatus');
    }
  }

  async verifyCode(token, codeData) {
    try {
      const response = await this.client.post('/verification/verify-code', codeData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'verifyCode');
    }
  }

  // SBT methods
  async getSBTInfo(token) {
    try {
      const response = await this.client.get('/users/sbt', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getSBTInfo');
    }
  }

  async mintSBT(token, mintData) {
    try {
      const response = await this.client.post('/sbt/mint', mintData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'mintSBT');
    }
  }

  async getSBTMetadata(tokenId) {
    try {
      const response = await this.client.get(`/sbt/metadata/${tokenId}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getSBTMetadata');
    }
  }

  // User management methods
  async updateUserProfile(token, profileData) {
    try {
      const response = await this.client.put('/users/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'updateUserProfile');
    }
  }

  async getUserActivity(token) {
    try {
      const response = await this.client.get('/users/activity', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getUserActivity');
    }
  }

  // Utility methods
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'healthCheck');
    }
  }

  // Error handling
  handleApiError(error, method) {
    const errorInfo = {
      method,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    };

    logger.error(`API Error in ${method}:`, errorInfo);

    // Create user-friendly error messages
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          return new Error(data?.message || 'Invalid request data');
        case 401:
          return new Error('Authentication required or token expired');
        case 403:
          return new Error('Access denied');
        case 404:
          return new Error('Resource not found');
        case 409:
          return new Error(data?.message || 'Conflict with existing data');
        case 429:
          return new Error('Too many requests, please try again later');
        case 500:
          return new Error('Server error, please try again later');
        default:
          return new Error(data?.message || 'An unexpected error occurred');
      }
    } else if (error.request) {
      return new Error('Network error, please check your connection');
    } else {
      return new Error('Request configuration error');
    }
  }

  // Helper method to check if token is valid
  async validateToken(token) {
    try {
      await this.getUserProfile(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Twin3.ai SBT 相關 API
  async getSBTStatus(token) {
    try {
      const response = await this.client.get('/twin3/sbt/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getSBTStatus');
    }
  }

  async requestSBTMint(token, userData) {
    try {
      const response = await this.client.post('/twin3/sbt/mint', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'requestSBTMint');
    }
  }

  async checkMintStatus(token, mintRequestId) {
    try {
      const response = await this.client.get(`/twin3/sbt/mint/${mintRequestId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'checkMintStatus');
    }
  }

  async getSBTDetails(token, sbtAddress) {
    try {
      const response = await this.client.get(`/twin3/sbt/details/${sbtAddress}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'getSBTDetails');
    }
  }

  async checkVerificationStatus(token) {
    try {
      const response = await this.client.get('/twin3/verification/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, 'checkVerificationStatus');
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

module.exports = apiClient;
