const { Pool } = require('pg');
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
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

// PostgreSQL 連接配置
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'twin_gate',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // 最大連接數
  idleTimeoutMillis: 30000, // 閒置超時
  connectionTimeoutMillis: 2000, // 連接超時
};

// 創建連接池
const pool = new Pool(dbConfig);

// 連接池事件監聽
pool.on('connect', (client) => {
  logger.info('New client connected to PostgreSQL', {
    processId: client.processID,
    database: dbConfig.database
  });
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    stack: err.stack,
    processId: client?.processID
  });
});

// 資料庫查詢包裝器
class Database {
  constructor() {
    this.pool = pool;
  }

  // 執行查詢
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query execution failed', {
        query: text,
        params,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // 執行事務
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // 獲取單一記錄
  async findOne(table, conditions = {}, columns = '*') {
    const whereClause = Object.keys(conditions).length > 0 
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : '';
    
    const query = `SELECT ${columns} FROM ${table} ${whereClause} LIMIT 1`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows[0] || null;
  }

  // 獲取多筆記錄
  async findMany(table, conditions = {}, options = {}) {
    const { columns = '*', orderBy, limit, offset } = options;
    
    const whereClause = Object.keys(conditions).length > 0 
      ? 'WHERE ' + Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ')
      : '';
    
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';
    
    const query = `SELECT ${columns} FROM ${table} ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows;
  }

  // 插入記錄
  async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // 更新記錄
  async update(table, data, conditions) {
    const setClause = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${Object.keys(data).length + index + 1}`).join(' AND ');
    
    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const values = [...Object.values(data), ...Object.values(conditions)];
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // 刪除記錄
  async delete(table, conditions) {
    const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    const query = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    const values = Object.values(conditions);
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // 檢查連接
  async checkConnection() {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      logger.info('Database connection successful', {
        currentTime: result.rows[0].current_time
      });
      return true;
    } catch (error) {
      logger.error('Database connection failed', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // 關閉連接池
  async close() {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool', {
        error: error.message,
        stack: error.stack
      });
    }
  }
}

// 創建資料庫實例
const database = new Database();

// 優雅關閉處理
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await database.close();
  process.exit(0);
});

module.exports = {
  database,
  pool,
  logger
};
