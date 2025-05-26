# Twin Gate - API 文檔

## 📋 文檔資訊

- **版本**：v1.0.0
- **創建日期**：2025-01-26
- **最後更新**：2025-01-26
- **API 版本**：v1
- **基礎 URL**：`https://api.twingate.com/v1`

## 🔐 認證方式

### Bot Token 認證
所有 API 請求都需要在 Header 中包含 Bot Token：

```http
Authorization: Bot YOUR_BOT_TOKEN
Content-Type: application/json
```

### Twin3.ai API 整合
內部使用 Twin3.ai API 進行身份驗證：

```http
X-API-Key: YOUR_TWIN3_API_KEY
Content-Type: application/json
```

## 📱 Telegram Bot API

### 用戶管理

#### 獲取用戶資訊
```http
GET /users/{userId}
```

**參數：**
- `userId` (string): Telegram 用戶 ID

**響應：**
```json
{
  "success": true,
  "data": {
    "userId": "123456789",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "languageCode": "en-US",
    "verificationLevel": 2,
    "humanityIndex": 150,
    "sbtMinted": true,
    "createdAt": "2025-01-26T10:00:00Z",
    "updatedAt": "2025-01-26T12:00:00Z"
  }
}
```

#### 更新用戶語言設定
```http
PUT /users/{userId}/language
```

**請求體：**
```json
{
  "languageCode": "zh-TW"
}
```

**響應：**
```json
{
  "success": true,
  "message": "Language updated successfully"
}
```

### 驗證系統

#### 開始 Level 1 驗證
```http
POST /verification/level1/start
```

**請求體：**
```json
{
  "userId": "123456789",
  "sessionId": "session_abc123"
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "verificationId": "verify_123",
    "verificationUrl": "https://twin3.ai/verify/abc123",
    "expiresAt": "2025-01-26T10:15:00Z",
    "level": 1,
    "type": "recaptcha"
  }
}
```

#### 檢查驗證狀態
```http
GET /verification/{verificationId}/status
```

**響應：**
```json
{
  "success": true,
  "data": {
    "verificationId": "verify_123",
    "status": "completed",
    "level": 1,
    "humanityIndex": 75,
    "completedAt": "2025-01-26T10:12:00Z",
    "nextLevel": 2
  }
}
```

#### 開始 Level 2 驗證 (SMS)
```http
POST /verification/level2/start
```

**請求體：**
```json
{
  "userId": "123456789",
  "phoneNumber": "+1234567890"
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "verificationId": "verify_456",
    "verificationUrl": "https://twin3.ai/verify/def456",
    "expiresAt": "2025-01-26T10:15:00Z",
    "level": 2,
    "type": "sms"
  }
}
```

#### 開始 Level 3 驗證 (生物識別)
```http
POST /verification/level3/start
```

**請求體：**
```json
{
  "userId": "123456789",
  "deviceInfo": {
    "platform": "ios",
    "version": "17.0"
  }
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "verificationId": "verify_789",
    "verificationUrl": "https://twin3.ai/verify/ghi789",
    "expiresAt": "2025-01-26T10:15:00Z",
    "level": 3,
    "type": "biometric"
  }
}
```

### SBT 管理

#### 檢查 SBT 鑄造資格
```http
GET /sbt/eligibility/{userId}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "verificationLevel": 2,
    "humanityIndex": 150,
    "requirements": {
      "minLevel": 2,
      "minHumanityIndex": 100,
      "completed": true
    }
  }
}
```

#### 鑄造 SBT
```http
POST /sbt/mint
```

**請求體：**
```json
{
  "userId": "123456789",
  "walletAddress": "0x1234...abcd" // 可選，如果不提供則自動生成
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "tokenId": "12345",
    "walletAddress": "0x1234...abcd",
    "transactionHash": "0xabcd...1234",
    "metadata": {
      "name": "Twin Gate Human Verification SBT",
      "description": "Proof of Human Identity",
      "verificationLevel": 2,
      "humanityIndex": 150,
      "issuedAt": "2025-01-26T12:00:00Z"
    }
  }
}
```

#### 獲取用戶 SBT 資訊
```http
GET /sbt/user/{userId}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "hasSBT": true,
    "tokenId": "12345",
    "walletAddress": "0x1234...abcd",
    "metadata": {
      "name": "Twin Gate Human Verification SBT",
      "verificationLevel": 2,
      "humanityIndex": 150,
      "issuedAt": "2025-01-26T12:00:00Z"
    }
  }
}
```

## 🔄 Webhook 回調

### Twin3.ai 驗證完成回調
```http
POST /webhook/verification/complete
```

**請求體：**
```json
{
  "verificationId": "verify_123",
  "userId": "123456789",
  "level": 1,
  "status": "completed",
  "humanityIndex": 75,
  "completedAt": "2025-01-26T10:12:00Z",
  "signature": "sha256_signature"
}
```

### SBT 鑄造完成回調
```http
POST /webhook/sbt/minted
```

**請求體：**
```json
{
  "userId": "123456789",
  "tokenId": "12345",
  "walletAddress": "0x1234...abcd",
  "transactionHash": "0xabcd...1234",
  "mintedAt": "2025-01-26T12:00:00Z",
  "signature": "sha256_signature"
}
```

## 📊 統計和分析

#### 獲取系統統計
```http
GET /stats/system
```

**響應：**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10000,
    "activeUsers": 1500,
    "verifications": {
      "level1": 8000,
      "level2": 5000,
      "level3": 2000
    },
    "sbtMinted": 4500,
    "averageHumanityIndex": 145
  }
}
```

#### 獲取用戶統計
```http
GET /stats/user/{userId}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "userId": "123456789",
    "joinedAt": "2025-01-20T10:00:00Z",
    "lastActiveAt": "2025-01-26T12:00:00Z",
    "verificationHistory": [
      {
        "level": 1,
        "completedAt": "2025-01-20T10:30:00Z",
        "humanityIndex": 75
      },
      {
        "level": 2,
        "completedAt": "2025-01-20T11:00:00Z",
        "humanityIndex": 150
      }
    ],
    "sbtInfo": {
      "minted": true,
      "tokenId": "12345",
      "mintedAt": "2025-01-20T11:30:00Z"
    }
  }
}
```

## ❌ 錯誤處理

### 錯誤響應格式
```json
{
  "success": false,
  "error": {
    "code": "INVALID_USER",
    "message": "User not found",
    "details": "The specified user ID does not exist in the system"
  }
}
```

### 常見錯誤代碼

| 錯誤代碼 | HTTP 狀態 | 描述 |
|---------|----------|------|
| `INVALID_USER` | 404 | 用戶不存在 |
| `VERIFICATION_NOT_FOUND` | 404 | 驗證記錄不存在 |
| `VERIFICATION_EXPIRED` | 400 | 驗證已過期 |
| `LEVEL_NOT_COMPLETED` | 400 | 前置等級未完成 |
| `SBT_ALREADY_MINTED` | 400 | SBT 已經鑄造 |
| `INSUFFICIENT_HUMANITY_INDEX` | 400 | Humanity Index 不足 |
| `RATE_LIMIT_EXCEEDED` | 429 | 請求頻率超限 |
| `TWIN3_API_ERROR` | 502 | Twin3.ai API 錯誤 |
| `INTERNAL_ERROR` | 500 | 內部服務器錯誤 |

## 🔒 安全考慮

### 速率限制
- **用戶級別**：每分鐘 60 次請求
- **IP 級別**：每分鐘 1000 次請求
- **驗證操作**：每小時 10 次驗證嘗試

### 數據驗證
- 所有輸入參數都會進行嚴格驗證
- SQL 注入防護
- XSS 攻擊防護
- CSRF 保護

### 隱私保護
- 最小化數據收集
- 敏感數據加密存儲
- 支援 GDPR 數據導出和刪除
- 定期數據清理

## 📝 API 使用範例

### JavaScript/Node.js
```javascript
const axios = require('axios');

// 開始 Level 1 驗證
async function startLevel1Verification(userId) {
  try {
    const response = await axios.post(
      'https://api.twingate.com/v1/verification/level1/start',
      { userId, sessionId: 'session_123' },
      {
        headers: {
          'Authorization': 'Bot YOUR_BOT_TOKEN',
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Verification failed:', error.response.data);
    throw error;
  }
}
```

### Python
```python
import requests

def start_level1_verification(user_id):
    url = "https://api.twingate.com/v1/verification/level1/start"
    headers = {
        "Authorization": "Bot YOUR_BOT_TOKEN",
        "Content-Type": "application/json"
    }
    data = {
        "userId": user_id,
        "sessionId": "session_123"
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

---

**文檔版本**：v1.0.0 | **最後更新**：2025-01-26
