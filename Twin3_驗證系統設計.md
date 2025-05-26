# Twin3.ai 驗證系統設計文檔

## 🎯 系統概述

Twin Gate 現已完全整合 twin3.ai 的驗證服務，提供無縫的人類身份驗證體驗。所有驗證都通過 twin3.ai 的專業驗證平台處理，確保高準確性和安全性。

## 🌍 使用者流程

### 場景：通過 Telegram Bot 首次接觸 Twin3

#### 1. 加入社群/啟動 Bot
- 使用者通過搜索或點擊鏈接找到 Twin3 的官方 Bot
- 發送 `/start` 指令啟動 Bot

#### 2. 收到歡迎與驗證引導
```
🌍 歡迎來到 Twin3 人類身份驗證

為了確保您是獨一無二的地球旅人，我們需要驗證您的真實人類身份。
這有助於我們共同維護一個真實、高質量的環境。

🔐 驗證等級說明：

🟢 Level 1 - 基礎驗證 (必選)
• Google reCAPTCHA 人機驗證
• 預期分數：50-80
• 時間：1-2 分鐘

🟡 Level 2 - 進階驗證 (可選)
• 手機短信驗證
• 預期分數：80-150
• 時間：3-5 分鐘

🔴 Level 3 - 高級驗證 (可選)
• Apple/Google OAuth 登錄
• 預期分數：120-200
• 時間：2-3 分鐘

📊 分數範圍：0-255
🎯 通過門檻：≥100 分
🏆 SBT 鑄造門檻：≥100 分
```

#### 3. 點擊驗證鏈接/執行指令
- 使用者點擊「🚀 開始驗證」按鈕
- Bot 生成獨特的驗證鏈接並回復：

```
🔗 驗證鏈接已生成

太好了！為了確保您是獨一無二的地球旅人，請點擊下方鏈接完成一個簡單的驗證步驟。

🌐 驗證網頁
點擊下方按鈕將在瀏覽器中打開 Twin3 驗證頁面。

⏰ 有效期限：30 分鐘
🔒 安全提示：此鏈接僅供您個人使用

完成驗證後，我會立即通知您結果！

[🚀 開始驗證] [🔄 檢查狀態] [🔙 返回主選單]
```

#### 4. 跳轉至網頁驗證頁面
- 使用者點擊鏈接後在瀏覽器中打開 twin3.ai 驗證頁面
- 頁面特色：
  - 簡潔、專業的設計
  - Twin3 品牌標識
  - 安全感十足的介面

#### 5. 完成驗證選項
**Level 1 (必選)**：
- Google reCAPTCHA 驗證
- 「我不是機器人」勾選或無感驗證

**Level 2 (可選)**：
- 手機短信驗證
- 輸入手機號碼，獲取並輸入驗證碼
- 隱私說明：僅用於驗證，不會被共享

**Level 3 (可選)**：
- Apple/Google OAuth 登錄
- 選擇任一方式進行授權登錄
- 權限範圍說明：僅基礎身份驗證

#### 6. 提交驗證並等待結果
- 完成選定的驗證步驟後點擊「提交」
- 頁面顯示「正在驗證，請稍候...」

#### 7. 驗證結果與 SBT 鑄造通知
**成功情況**（Humanity Index ≥ 100）：
```
✅ 驗證成功

🎯 您的 Humanity Index：150/255
📊 驗證狀態：已通過
📅 完成時間：2024-01-01 12:00:00

🎉 恭喜！您已成功完成 Twin3 人類驗證。
您的專屬 Twin3 SBT 正在為您準備中，這將是您在數字世界的獨特身份憑證。
```

**失敗情況**（Humanity Index < 100）：
```
❌ 驗證未通過

🎯 您的 Humanity Index：85/255
📊 驗證狀態：未達標準
📅 完成時間：2024-01-01 12:00:00

💡 您可以重新驗證以提高分數。建議完成更多驗證等級來提升您的 Humanity Index。
```

## 🔧 技術架構

### API 端點設計

#### 1. 獲取驗證選項
```http
GET /api/v1/verification/channels
Authorization: Bearer <token>
```

**回應**：
```json
{
  "success": true,
  "data": {
    "verificationLevels": [
      {
        "level": "level1",
        "name": "Level 1 - 基礎驗證",
        "description": "Google reCAPTCHA 人機驗證",
        "required": true,
        "estimatedScore": "50-80",
        "estimatedTime": "1-2 分鐘",
        "methods": ["recaptcha"]
      }
    ],
    "scoreRange": { "min": 0, "max": 255 },
    "passingThreshold": 100,
    "sbtMintingThreshold": 100,
    "twin3Integration": {
      "apiBaseUrl": "https://api.twin3.ai",
      "webVerificationUrl": "https://verify.twin3.ai"
    }
  }
}
```

#### 2. 開始驗證流程
```http
POST /api/v1/verification/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "telegram",
  "userId": "123456789",
  "username": "user123"
}
```

**回應**：
```json
{
  "success": true,
  "message": "驗證鏈接已生成",
  "data": {
    "verificationId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "verificationUrl": "https://verify.twin3.ai/v/abc123xyz",
    "verificationToken": "unique-token-string",
    "expiresAt": "2024-01-01T12:30:00.000Z",
    "status": "pending"
  }
}
```

#### 3. Twin3.ai 驗證結果回調
```http
POST /api/v1/verification/callback
Content-Type: application/json
X-Twin3-Signature: <signature>

{
  "verificationToken": "unique-token-string",
  "humanityIndex": 150,
  "verificationData": {
    "completedLevels": ["level1", "level2"],
    "methods": ["recaptcha", "sms"],
    "timestamp": "2024-01-01T12:15:00.000Z"
  },
  "signature": "verification-signature"
}
```

### 資料庫模型

#### Verification 模型
```javascript
{
  userId: ObjectId,
  platform: String, // 'discord', 'telegram', 'line'
  platformUserId: String,
  username: String,
  verificationToken: String, // 唯一驗證代幣
  verificationUrl: String, // twin3.ai 驗證頁面 URL
  status: String, // 'pending', 'in_progress', 'completed', 'failed', 'expired'
  humanityIndex: Number, // 0-255
  passed: Boolean,
  verificationData: Object, // twin3.ai 回傳的詳細資料
  createdAt: Date,
  completedAt: Date,
  expiresAt: Date
}
```

#### User 模型更新
```javascript
{
  // 原有欄位...
  
  // Twin3.ai 驗證資訊
  humanityIndex: Number, // 0-255
  verificationCompletedAt: Date,
  verificationPlatform: String, // 'discord', 'telegram', 'line'
  isVerified: Boolean // humanityIndex >= passingThreshold
}
```

## 🔐 安全機制

### 1. 驗證代幣
- 每個驗證請求生成唯一的 32 字節隨機代幣
- 代幣有 30 分鐘有效期
- 一次性使用，完成後失效

### 2. 簽名驗證
- twin3.ai 回調使用 HMAC-SHA256 簽名
- 驗證請求來源的真實性
- 防止偽造驗證結果

### 3. 平台綁定
- 驗證結果與特定平台使用者 ID 綁定
- 防止跨平台身份冒用
- 確保驗證結果的唯一性

## 🎯 分數系統

### Humanity Index 範圍
- **最小值**：0
- **最大值**：255
- **通過門檻**：100（可配置）
- **SBT 鑄造門檻**：100（可配置）

### 驗證等級分數估算
- **Level 1**：50-80 分
- **Level 2**：80-150 分
- **Level 3**：120-200 分
- **組合驗證**：可達 200+ 分

### 等級劃分
- 🥉 **Bronze** (0-99) - 未通過驗證
- 🥈 **Silver** (100-149) - 基礎驗證通過
- 🥇 **Gold** (150-199) - 進階驗證通過
- 💎 **Platinum** (200-255) - 完全驗證通過

## 🤖 Bot 整合

### 主要指令
- `/start` - 開始驗證之旅
- `/verify` - 開始驗證流程
- `/status` - 檢查驗證狀態
- `/profile` - 查看個人資料
- `/sbt` - 查看 SBT 資訊

### 回調按鈕
- `start_twin3_verification` - 開始 Twin3 驗證
- `create_verification_link` - 創建驗證鏈接
- `check_verification_status` - 檢查驗證狀態

### 通知機制
- 驗證完成後自動通知使用者
- 即時狀態更新
- SBT 鑄造進度通知

## 🔄 整合流程

### 1. 初始化
```javascript
// 環境變數配置
TWIN3_API_URL=https://api.twin3.ai
TWIN3_WEB_VERIFICATION_URL=https://verify.twin3.ai
TWIN3_API_KEY=your-api-key
TWIN3_WEBHOOK_SECRET=your-webhook-secret
VERIFICATION_PASSING_THRESHOLD=100
SBT_MINTING_THRESHOLD=100
```

### 2. 驗證流程
1. 使用者啟動驗證
2. 系統生成驗證代幣和 URL
3. 使用者在 twin3.ai 完成驗證
4. twin3.ai 回調驗證結果
5. 系統更新使用者狀態
6. 觸發 SBT 鑄造（如符合條件）

### 3. 錯誤處理
- 驗證超時自動失效
- 網路錯誤重試機制
- 無效簽名拒絕處理
- 使用者友善的錯誤訊息

## 📈 未來擴展

### 1. 多平台支援
- Discord Bot 整合
- LINE Bot 整合
- 網頁版驗證介面

### 2. 進階功能
- 驗證歷史記錄
- 分數趨勢分析
- 社群驗證挑戰
- 企業級驗證服務

### 3. 智能合約整合
- 自動 SBT 鑄造
- 鏈上驗證記錄
- 跨鏈身份證明

---

**Twin3.ai 驗證系統** - 專業、安全、可信賴的人類身份驗證解決方案 🌍✨
