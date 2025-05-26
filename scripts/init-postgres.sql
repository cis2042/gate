-- Twin Gate PostgreSQL 初始化腳本
-- 創建資料庫表格和索引

-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 使用者表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Twin3.ai 驗證資訊
    humanity_index INTEGER DEFAULT 0 CHECK (humanity_index >= 0 AND humanity_index <= 255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_completed_at TIMESTAMP NULL,
    verification_platform VARCHAR(20) NULL,
    
    -- 個人資料
    profile JSONB DEFAULT '{}',
    
    -- 系統欄位
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP NULL,
    
    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 驗證記錄表
CREATE TABLE IF NOT EXISTS verifications (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 平台資訊
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('discord', 'telegram', 'line')),
    platform_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NULL,
    
    -- 驗證代幣和 URL
    verification_token VARCHAR(255) UNIQUE NOT NULL,
    verification_url TEXT NOT NULL,
    
    -- 驗證狀態
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'expired')),
    
    -- Twin3.ai 驗證結果
    humanity_index INTEGER DEFAULT 0 CHECK (humanity_index >= 0 AND humanity_index <= 255),
    passed BOOLEAN DEFAULT FALSE,
    verification_data JSONB DEFAULT '{}',
    
    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes')
);

-- SBT 記錄表
CREATE TABLE IF NOT EXISTS sbts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 代幣資訊
    token_id VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    contract_address VARCHAR(255) NOT NULL,
    
    -- 元數據
    metadata JSONB DEFAULT '{}',
    token_uri TEXT NULL,
    
    -- 狀態
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'minting', 'minted', 'failed')),
    
    -- 區塊鏈資訊
    transaction_hash VARCHAR(255) NULL,
    block_number BIGINT NULL,
    network VARCHAR(50) DEFAULT 'polygon',
    
    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    minted_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 會話表（可選，用於 Bot 會話管理）
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    
    -- 會話資料
    session_data JSONB DEFAULT '{}',
    
    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- 系統日誌表
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引
-- 使用者表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_humanity_index ON users(humanity_index);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 驗證記錄表索引
CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_platform ON verifications(platform);
CREATE INDEX IF NOT EXISTS idx_verifications_platform_user_id ON verifications(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_token ON verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON verifications(expires_at);

-- SBT 記錄表索引
CREATE INDEX IF NOT EXISTS idx_sbts_user_id ON sbts(user_id);
CREATE INDEX IF NOT EXISTS idx_sbts_token_id ON sbts(token_id);
CREATE INDEX IF NOT EXISTS idx_sbts_wallet_address ON sbts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sbts_status ON sbts(status);
CREATE INDEX IF NOT EXISTS idx_sbts_created_at ON sbts(created_at);

-- 會話表索引
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_platform ON sessions(platform);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 系統日誌表索引
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- 創建觸發器函數來自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表創建觸發器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sbts_updated_at BEFORE UPDATE ON sbts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建清理過期記錄的函數
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS void AS $$
BEGIN
    -- 清理過期的驗證記錄
    DELETE FROM verifications 
    WHERE status = 'pending' AND expires_at < CURRENT_TIMESTAMP;
    
    -- 清理過期的會話
    DELETE FROM sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- 清理舊的系統日誌（保留 30 天）
    DELETE FROM system_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 創建管理員使用者（預設）
INSERT INTO users (username, email, password_hash, role, is_verified, email_verified)
VALUES (
    'admin',
    'admin@twin-gate.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- 插入一些示例數據（僅在開發環境）
-- 這些數據在生產環境中應該被移除
DO $$
BEGIN
    IF current_setting('server_version_num')::int >= 120000 THEN
        -- PostgreSQL 12+ 支援
        INSERT INTO users (username, email, password_hash, humanity_index, is_verified)
        VALUES 
            ('testuser1', 'test1@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 150, true),
            ('testuser2', 'test2@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 85, false)
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;

-- 創建視圖來簡化常用查詢
CREATE OR REPLACE VIEW user_verification_summary AS
SELECT 
    u.id,
    u.uuid,
    u.username,
    u.email,
    u.humanity_index,
    u.is_verified,
    u.verification_completed_at,
    u.verification_platform,
    COUNT(v.id) as total_verifications,
    COUNT(CASE WHEN v.status = 'completed' THEN 1 END) as completed_verifications,
    COUNT(CASE WHEN v.status = 'pending' THEN 1 END) as pending_verifications,
    COUNT(s.id) as total_sbts,
    COUNT(CASE WHEN s.status = 'minted' THEN 1 END) as minted_sbts,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN verifications v ON u.id = v.user_id
LEFT JOIN sbts s ON u.id = s.user_id
GROUP BY u.id, u.uuid, u.username, u.email, u.humanity_index, u.is_verified, 
         u.verification_completed_at, u.verification_platform, u.created_at, u.updated_at;

-- 完成初始化
SELECT 'Twin Gate PostgreSQL database initialized successfully!' as message;
