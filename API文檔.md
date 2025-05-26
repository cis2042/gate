# Twin Gate API 文檔

## 📋 概述

Twin Gate API 提供完整的多渠道人類身份驗證服務，包括使用者管理、身份驗證、SBT 鑄造等功能。

### 基本資訊
- **基礎 URL**: `http://localhost:3001/api/v1`
- **認證方式**: JWT Bearer Token
- **回應格式**: JSON
- **API 版本**: v1

## 🔐 認證

### 註冊新使用者
```http
POST /auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**回應**:
```json
{
  "success": true,
  "message": "使用者註冊成功",
  "data": {
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "username": "user123",
      "email": "user@example.com",
      "role": "user",
      "isVerified": false,
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### 使用者登入
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### 刷新代幣
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 獲取當前使用者資訊
```http
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ✅ 驗證管理

### 獲取可用驗證渠道
```http
GET /verification/channels
```

**回應**:
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "channel": "twitter",
        "name": "Twitter",
        "description": "通過發布推文驗證您的 Twitter 帳戶",
        "difficulty": "easy",
        "score": 20,
        "estimatedTime": "5 分鐘"
      },
      {
        "channel": "discord",
        "name": "Discord",
        "description": "加入我們的 Discord 伺服器並驗證會員身份",
        "difficulty": "easy",
        "score": 15,
        "estimatedTime": "3 分鐘"
      }
    ],
    "maxScore": 130,
    "minimumScoreForSBT": 60
  }
}
```

### 開始驗證流程
```http
POST /verification/start
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "channel": "twitter",
  "challengeType": "post",
  "identifier": "user_handle"
}
```

**回應**:
```json
{
  "success": true,
  "message": "驗證已成功開始",
  "data": {
    "verificationId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "channel": "twitter",
    "challengeType": "post",
    "challengeData": {
      "requiredText": "驗證我的 Twin Gate 帳戶：ABC123XYZ",
      "instructions": "將此文字作為推文發布並提供推文 URL",
      "expiresAt": "2024-01-01T12:00:00.000Z"
    },
    "status": "pending"
  }
}
```

### 提交驗證證明
```http
POST /verification/submit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "verificationId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "proofData": {
    "tweetUrl": "https://twitter.com/user/status/1234567890",
    "screenshot": "base64_encoded_image"
  }
}
```

### 檢查驗證狀態
```http
GET /verification/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**回應**:
```json
{
  "success": true,
  "data": {
    "totalVerifications": 5,
    "completedVerifications": 3,
    "pendingVerifications": 1,
    "failedVerifications": 1,
    "totalScore": 65,
    "channels": {
      "twitter": [
        {
          "id": "64f1a2b3c4d5e6f7g8h9i0j1",
          "status": "completed",
          "score": 20,
          "startedAt": "2024-01-01T10:00:00.000Z",
          "completedAt": "2024-01-01T10:15:00.000Z"
        }
      ]
    }
  }
}
```

## 🏆 SBT 管理

### 鑄造 SBT
```http
POST /sbt/mint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "metadata": {
    "customAttribute": "value"
  }
}
```

**回應**:
```json
{
  "success": true,
  "message": "SBT 鑄造已成功啟動",
  "data": {
    "tokenId": "twin3_sbt_1234567890",
    "status": "pending",
    "metadata": {
      "name": "Twin3 SBT #user123",
      "description": "Twin3 靈魂綁定代幣，代表使用者 user123 的已驗證身份",
      "image": "https://api.twingate.com/images/sbt/gold.png",
      "attributes": [
        {
          "trait_type": "驗證等級",
          "value": "Gold"
        },
        {
          "trait_type": "驗證分數",
          "value": 65,
          "display_type": "number",
          "max_value": 100
        }
      ]
    },
    "tokenURI": "https://api.twingate.com/metadata/twin3_sbt_1234567890",
    "estimatedConfirmationTime": "5-10 分鐘"
  }
}
```

### 獲取代幣元數據
```http
GET /sbt/metadata/{tokenId}
```

### 獲取我的代幣
```http
GET /sbt/my-tokens
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 獲取 SBT 資訊
```http
GET /users/sbt
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**回應**:
```json
{
  "success": true,
  "data": {
    "hasSBT": true,
    "sbt": {
      "tokenId": "twin3_sbt_1234567890",
      "walletAddress": "0x1234567890123456789012345678901234567890",
      "metadata": {
        "name": "Twin3 SBT #user123",
        "verificationData": {
          "verificationLevel": "gold",
          "verificationScore": 65
        }
      },
      "status": "minted",
      "mintedAt": "2024-01-01T12:00:00.000Z",
      "blockExplorerUrl": "https://polygonscan.com/token/0x.../twin3_sbt_1234567890"
    }
  }
}
```

## 👤 使用者管理

### 獲取個人資料
```http
GET /users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 更新個人資料
```http
PUT /users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "profile": {
    "firstName": "張",
    "lastName": "三",
    "bio": "Twin Gate 使用者",
    "location": {
      "city": "台北",
      "country": "台灣"
    }
  }
}
```

### 獲取驗證狀態
```http
GET /users/verification-status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🛡️ 管理員 API

### 獲取儀表板資料
```http
GET /admin/dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 獲取所有使用者
```http
GET /admin/users?page=1&limit=20&role=user&verified=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 獲取系統統計
```http
GET /admin/stats?timeframe=30d
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔧 系統端點

### 健康檢查
```http
GET /health
```

**回應**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "database": "connected",
  "blockchain": "connected"
}
```

## 📊 錯誤代碼

### HTTP 狀態碼
- `200` - 成功
- `201` - 已創建
- `400` - 請求錯誤
- `401` - 未授權
- `403` - 禁止訪問
- `404` - 未找到
- `409` - 衝突
- `429` - 請求過多
- `500` - 伺服器錯誤

### 錯誤回應格式
```json
{
  "success": false,
  "message": "錯誤描述",
  "errors": [
    {
      "field": "email",
      "message": "電子郵件格式無效"
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

## 🔒 安全性

### 認證
- 所有受保護的端點都需要有效的 JWT 代幣
- 代幣應在 `Authorization` 標頭中以 `Bearer` 格式提供
- 代幣有效期為 7 天，可使用刷新代幣延長

### 速率限制
- 每個 IP 每 15 分鐘最多 100 個請求
- 超過限制將返回 429 狀態碼

### 輸入驗證
- 所有輸入都經過驗證和清理
- 使用 express-validator 進行參數驗證
- 防止 SQL 注入和 XSS 攻擊

## 📝 範例

### 完整驗證流程
```javascript
// 1. 註冊使用者
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePassword123'
  })
});

const { data: { tokens } } = await registerResponse.json();

// 2. 開始 Twitter 驗證
const verifyResponse = await fetch('/api/v1/verification/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.accessToken}`
  },
  body: JSON.stringify({
    channel: 'twitter',
    challengeType: 'post',
    identifier: 'twitter_handle'
  })
});

// 3. 提交驗證證明
const submitResponse = await fetch('/api/v1/verification/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.accessToken}`
  },
  body: JSON.stringify({
    verificationId: 'verification_id',
    proofData: {
      tweetUrl: 'https://twitter.com/user/status/123'
    }
  })
});

// 4. 鑄造 SBT
const mintResponse = await fetch('/api/v1/sbt/mint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokens.accessToken}`
  },
  body: JSON.stringify({
    walletAddress: '0x1234567890123456789012345678901234567890'
  })
});
```

---

**Twin Gate API** - 強大且安全的身份驗證服務 🔐✨
