const admin = require('firebase-admin');
const winston = require('winston');

// 設定日誌
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/firebase.log' })
  ]
});

// Firebase 配置
let firebaseApp = null;
let database = null;

const initializeFirebase = () => {
  try {
    // 檢查是否已初始化
    if (firebaseApp) {
      return firebaseApp;
    }

    // Firebase 服務帳戶金鑰配置
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };

    // 驗證必要的環境變數
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Missing required Firebase configuration. Please check your environment variables.');
    }

    // 初始化 Firebase Admin SDK
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com/`
    });

    // 獲取 Realtime Database 實例
    database = admin.database();

    logger.info('Firebase initialized successfully', {
      projectId: serviceAccount.project_id,
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Firebase Realtime Database 操作類
class FirebaseDatabase {
  constructor() {
    if (!database) {
      initializeFirebase();
    }
    this.db = database;
  }

  // 設定資料
  async set(path, data) {
    try {
      const ref = this.db.ref(path);
      await ref.set(data);
      logger.debug('Data set successfully', { path, data });
      return true;
    } catch (error) {
      logger.error('Failed to set data', {
        path,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 更新資料
  async update(path, updates) {
    try {
      const ref = this.db.ref(path);
      await ref.update(updates);
      logger.debug('Data updated successfully', { path, updates });
      return true;
    } catch (error) {
      logger.error('Failed to update data', {
        path,
        updates,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 獲取資料
  async get(path) {
    try {
      const ref = this.db.ref(path);
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      logger.debug('Data retrieved successfully', { path, hasData: !!data });
      return data;
    } catch (error) {
      logger.error('Failed to get data', {
        path,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 推送資料（生成唯一 key）
  async push(path, data) {
    try {
      const ref = this.db.ref(path);
      const newRef = await ref.push(data);
      const key = newRef.key;
      logger.debug('Data pushed successfully', { path, key, data });
      return key;
    } catch (error) {
      logger.error('Failed to push data', {
        path,
        data,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 刪除資料
  async remove(path) {
    try {
      const ref = this.db.ref(path);
      await ref.remove();
      logger.debug('Data removed successfully', { path });
      return true;
    } catch (error) {
      logger.error('Failed to remove data', {
        path,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 查詢資料
  async query(path, options = {}) {
    try {
      let ref = this.db.ref(path);

      // 應用查詢選項
      if (options.orderBy) {
        ref = ref.orderByChild(options.orderBy);
      }
      if (options.equalTo !== undefined) {
        ref = ref.equalTo(options.equalTo);
      }
      if (options.startAt !== undefined) {
        ref = ref.startAt(options.startAt);
      }
      if (options.endAt !== undefined) {
        ref = ref.endAt(options.endAt);
      }
      if (options.limitToFirst) {
        ref = ref.limitToFirst(options.limitToFirst);
      }
      if (options.limitToLast) {
        ref = ref.limitToLast(options.limitToLast);
      }

      const snapshot = await ref.once('value');
      const data = snapshot.val();
      logger.debug('Query executed successfully', { path, options, hasData: !!data });
      return data;
    } catch (error) {
      logger.error('Failed to execute query', {
        path,
        options,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 監聽資料變化
  listen(path, callback, eventType = 'value') {
    try {
      const ref = this.db.ref(path);
      ref.on(eventType, callback);
      logger.debug('Listener attached successfully', { path, eventType });
      return ref;
    } catch (error) {
      logger.error('Failed to attach listener', {
        path,
        eventType,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 移除監聽器
  unlisten(ref, callback = null, eventType = 'value') {
    try {
      ref.off(eventType, callback);
      logger.debug('Listener removed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to remove listener', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 獲取伺服器時間戳
  getServerTimestamp() {
    return admin.database.ServerValue.TIMESTAMP;
  }

  // 檢查連接狀態
  async checkConnection() {
    try {
      const ref = this.db.ref('.info/connected');
      const snapshot = await ref.once('value');
      const connected = snapshot.val();
      logger.info('Firebase connection status', { connected });
      return connected;
    } catch (error) {
      logger.error('Failed to check Firebase connection', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
}

// 創建 Firebase 資料庫實例
let firebaseDatabase = null;

const getFirebaseDatabase = () => {
  if (!firebaseDatabase) {
    firebaseDatabase = new FirebaseDatabase();
  }
  return firebaseDatabase;
};

// 優雅關閉處理
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing Firebase connections...');
  if (firebaseApp) {
    await firebaseApp.delete();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing Firebase connections...');
  if (firebaseApp) {
    await firebaseApp.delete();
  }
  process.exit(0);
});

module.exports = {
  initializeFirebase,
  getFirebaseDatabase,
  FirebaseDatabase,
  admin,
  logger
};
