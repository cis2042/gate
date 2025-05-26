const logger = require('./logger');

// In-memory session storage (in production, use Redis or database)
const sessions = new Map();

// Session timeout (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;

class SessionManager {
  constructor() {
    // Clean up expired sessions every hour
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  async getUserSession(userId) {
    try {
      const session = sessions.get(userId.toString());
      
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
        sessions.delete(userId.toString());
        logger.debug(`Session expired for user ${userId}`);
        return null;
      }

      // Update last activity
      session.lastActivity = Date.now();
      
      return session;
    } catch (error) {
      logger.error('Error getting user session:', error);
      return null;
    }
  }

  async updateUserSession(userId, data) {
    try {
      const userIdStr = userId.toString();
      const existingSession = sessions.get(userIdStr) || {};
      
      const updatedSession = {
        ...existingSession,
        ...data,
        userId,
        lastActivity: Date.now(),
        updatedAt: Date.now()
      };

      // Set createdAt if this is a new session
      if (!existingSession.createdAt) {
        updatedSession.createdAt = Date.now();
      }

      sessions.set(userIdStr, updatedSession);
      
      logger.debug(`Session updated for user ${userId}`, {
        userId,
        sessionKeys: Object.keys(updatedSession)
      });

      return updatedSession;
    } catch (error) {
      logger.error('Error updating user session:', error);
      throw error;
    }
  }

  async deleteUserSession(userId) {
    try {
      const userIdStr = userId.toString();
      const deleted = sessions.delete(userIdStr);
      
      if (deleted) {
        logger.debug(`Session deleted for user ${userId}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting user session:', error);
      throw error;
    }
  }

  async setUserToken(userId, token, refreshToken = null) {
    try {
      await this.updateUserSession(userId, {
        token,
        refreshToken,
        tokenSetAt: Date.now()
      });
      
      logger.debug(`Token set for user ${userId}`);
    } catch (error) {
      logger.error('Error setting user token:', error);
      throw error;
    }
  }

  async getUserToken(userId) {
    try {
      const session = await this.getUserSession(userId);
      return session?.token || null;
    } catch (error) {
      logger.error('Error getting user token:', error);
      return null;
    }
  }

  async isUserAuthenticated(userId) {
    try {
      const token = await this.getUserToken(userId);
      return !!token;
    } catch (error) {
      logger.error('Error checking user authentication:', error);
      return false;
    }
  }

  async setUserState(userId, state, data = {}) {
    try {
      await this.updateUserSession(userId, {
        state,
        stateData: data,
        stateSetAt: Date.now()
      });
      
      logger.debug(`State set for user ${userId}`, { state, data });
    } catch (error) {
      logger.error('Error setting user state:', error);
      throw error;
    }
  }

  async getUserState(userId) {
    try {
      const session = await this.getUserSession(userId);
      return {
        state: session?.state || null,
        data: session?.stateData || {}
      };
    } catch (error) {
      logger.error('Error getting user state:', error);
      return { state: null, data: {} };
    }
  }

  async clearUserState(userId) {
    try {
      await this.updateUserSession(userId, {
        state: null,
        stateData: {},
        stateSetAt: null
      });
      
      logger.debug(`State cleared for user ${userId}`);
    } catch (error) {
      logger.error('Error clearing user state:', error);
      throw error;
    }
  }

  async setVerificationData(userId, verificationId, channel, data = {}) {
    try {
      const session = await this.getUserSession(userId) || {};
      const verifications = session.verifications || {};
      
      verifications[channel] = {
        verificationId,
        channel,
        ...data,
        startedAt: Date.now()
      };

      await this.updateUserSession(userId, {
        verifications,
        currentVerification: { verificationId, channel }
      });
      
      logger.verificationEvent(userId, channel, 'started', { verificationId });
    } catch (error) {
      logger.error('Error setting verification data:', error);
      throw error;
    }
  }

  async getVerificationData(userId, channel = null) {
    try {
      const session = await this.getUserSession(userId);
      
      if (!session?.verifications) {
        return null;
      }

      if (channel) {
        return session.verifications[channel] || null;
      }

      return session.verifications;
    } catch (error) {
      logger.error('Error getting verification data:', error);
      return null;
    }
  }

  async updateVerificationData(userId, channel, data) {
    try {
      const session = await this.getUserSession(userId) || {};
      const verifications = session.verifications || {};
      
      if (verifications[channel]) {
        verifications[channel] = {
          ...verifications[channel],
          ...data,
          updatedAt: Date.now()
        };

        await this.updateUserSession(userId, { verifications });
        
        logger.verificationEvent(userId, channel, 'updated', data);
      }
    } catch (error) {
      logger.error('Error updating verification data:', error);
      throw error;
    }
  }

  cleanupExpiredSessions() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [userId, session] of sessions.entries()) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
          sessions.delete(userId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired sessions`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }

  getSessionStats() {
    try {
      const now = Date.now();
      const stats = {
        totalSessions: sessions.size,
        activeSessions: 0,
        authenticatedSessions: 0,
        averageSessionAge: 0
      };

      let totalAge = 0;

      for (const session of sessions.values()) {
        const age = now - session.createdAt;
        totalAge += age;

        if (now - session.lastActivity < 60 * 60 * 1000) { // Active in last hour
          stats.activeSessions++;
        }

        if (session.token) {
          stats.authenticatedSessions++;
        }
      }

      if (sessions.size > 0) {
        stats.averageSessionAge = totalAge / sessions.size;
      }

      return stats;
    } catch (error) {
      logger.error('Error getting session stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export convenience functions
module.exports = {
  getUserSession: (userId) => sessionManager.getUserSession(userId),
  updateUserSession: (userId, data) => sessionManager.updateUserSession(userId, data),
  deleteUserSession: (userId) => sessionManager.deleteUserSession(userId),
  setUserToken: (userId, token, refreshToken) => sessionManager.setUserToken(userId, token, refreshToken),
  getUserToken: (userId) => sessionManager.getUserToken(userId),
  isUserAuthenticated: (userId) => sessionManager.isUserAuthenticated(userId),
  setUserState: (userId, state, data) => sessionManager.setUserState(userId, state, data),
  getUserState: (userId) => sessionManager.getUserState(userId),
  clearUserState: (userId) => sessionManager.clearUserState(userId),
  setVerificationData: (userId, verificationId, channel, data) => sessionManager.setVerificationData(userId, verificationId, channel, data),
  getVerificationData: (userId, channel) => sessionManager.getVerificationData(userId, channel),
  updateVerificationData: (userId, channel, data) => sessionManager.updateVerificationData(userId, channel, data),
  getSessionStats: () => sessionManager.getSessionStats(),
  sessionManager
};
