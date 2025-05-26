# Twin Gate Telegram Bot 部署指南

## 🎯 概述

本指南將幫助您快速部署和測試 Twin Gate Telegram Bot，實現與 Twin3.ai 的完整驗證流程整合。

## 📋 前置需求

### 系統需求
- **Node.js**: 18.0+ 版本
- **npm**: 8.0+ 版本
- **PostgreSQL**: 14+ 版本 (後端資料庫)
- **Redis**: 6.0+ 版本 (可選，用於會話快取)

### 必要憑證
- **Telegram Bot Token**: 從 [@BotFather](https://t.me/BotFather) 獲取
- **Twin3.ai API 憑證**: 聯繫 Twin3.ai 獲取
- **後端 API**: Twin Gate 後端服務運行中

## 🚀 快速開始

### 1. 創建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 發送 `/newbot` 指令
3. 按照指示設定 Bot 名稱和用戶名
4. 獲取 Bot Token (格式: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. 可選：設定 Bot 頭像和描述

### 2. 配置環境變數

複製環境變數模板：
```bash
cp telegram-bot/.env.example telegram-bot/.env
```

編輯 `telegram-bot/.env` 文件：
```env
# 必要配置
BOT_TOKEN=your_telegram_bot_token_here
BOT_USERNAME=YourBotUsername
API_BASE_URL=http://localhost:3001/api/v1

# 可選配置
ADMIN_CHAT_ID=your_admin_chat_id
TWIN3_API_URL=https://api.twin3.ai
TWIN3_WEB_VERIFICATION_URL=https://verify.twin3.ai
```

### 3. 安裝依賴

```bash
cd telegram-bot
npm install
```

### 4. 測試配置

運行測試腳本：
```bash
npm run test
# 或
node ../scripts/test-telegram-bot.js
```

### 5. 啟動 Bot

開發模式：
```bash
npm run dev
```

生產模式：
```bash
npm start
```

## 🔧 詳細配置

### 環境變數說明

#### 必要配置
| 變數 | 說明 | 範例 |
|------|------|------|
| `BOT_TOKEN` | Telegram Bot Token | `123456789:ABC...` |
| `API_BASE_URL` | 後端 API 基礎 URL | `http://localhost:3001/api/v1` |

#### 可選配置
| 變數 | 說明 | 預設值 |
|------|------|--------|
| `ADMIN_CHAT_ID` | 管理員聊天 ID | 無 |
| `LOG_LEVEL` | 日誌等級 | `info` |
| `API_TIMEOUT` | API 請求超時 | `30000` |
| `SESSION_CACHE_TTL` | 會話快取時間 | `3600` |

### Bot 指令列表

| 指令 | 功能 | 說明 |
|------|------|------|
| `/start` | 開始驗證之旅 | 註冊並開始使用 Bot |
| `/verify` | 開始驗證流程 | 啟動 Twin3.ai 驗證 |
| `/status` | 檢查驗證狀態 | 查看當前驗證進度 |
| `/profile` | 查看個人資料 | 顯示使用者資訊 |
| `/sbt` | 查看 SBT 資訊 | 顯示 SBT 狀態 |
| `/channels` | 可用的驗證渠道 | 顯示驗證等級說明 |
| `/help` | 獲取幫助 | 顯示使用說明 |
| `/settings` | Bot 設定 | 配置個人偏好 |
| `/stats` | 系統統計 | 管理員專用 |

## 🧪 測試流程

### 自動化測試

運行完整測試套件：
```bash
# 使用部署腳本
chmod +x scripts/deploy-telegram-bot.sh
./scripts/deploy-telegram-bot.sh --test

# 或直接運行測試
node scripts/test-telegram-bot.js
```

### 手動測試

1. **基本功能測試**：
   ```
   /start → 檢查歡迎訊息
   /help → 檢查幫助資訊
   /status → 檢查狀態顯示
   ```

2. **驗證流程測試**：
   ```
   /verify → 開始驗證
   點擊驗證鏈接 → 測試網頁跳轉
   完成驗證 → 檢查結果通知
   ```

3. **進階功能測試**：
   ```
   /profile → 檢查個人資料
   /sbt → 檢查 SBT 資訊
   /settings → 檢查設定功能
   ```

## 🔍 故障排除

### 常見問題

#### 1. Bot Token 無效
**錯誤**: `401 Unauthorized`
**解決方案**:
- 檢查 Bot Token 是否正確
- 確認 Token 沒有多餘的空格
- 重新從 @BotFather 獲取 Token

#### 2. API 連接失敗
**錯誤**: `ECONNREFUSED` 或 `timeout`
**解決方案**:
- 確認後端服務正在運行
- 檢查 `API_BASE_URL` 設定
- 測試網路連接

#### 3. 驗證流程失敗
**錯誤**: 驗證鏈接無效或過期
**解決方案**:
- 檢查 Twin3.ai API 配置
- 確認驗證代幣生成正常
- 檢查資料庫連接

#### 4. 權限問題
**錯誤**: 無法發送訊息
**解決方案**:
- 確認使用者已啟動 Bot (`/start`)
- 檢查 Bot 是否被封鎖
- 驗證聊天 ID 正確性

### 日誌分析

查看 Bot 日誌：
```bash
# 即時日誌
tail -f telegram-bot/logs/bot.log

# 錯誤日誌
grep "ERROR" telegram-bot/logs/bot.log

# 特定使用者日誌
grep "userId:123456" telegram-bot/logs/bot.log
```

### 除錯模式

啟用除錯模式：
```env
DEBUG_MODE=true
LOG_LEVEL=debug
LOG_ALL_MESSAGES=true
```

## 📊 監控與維護

### 健康檢查

Bot 提供內建健康檢查：
```bash
# 檢查 Bot 狀態
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# 檢查後端 API
curl -s "$API_BASE_URL/health"
```

### 效能監控

監控關鍵指標：
- 訊息處理延遲
- API 回應時間
- 錯誤率
- 活躍使用者數

### 定期維護

建議的維護任務：
- 每日檢查日誌檔案
- 每週清理過期會話
- 每月更新依賴套件
- 定期備份配置文件

## 🚀 生產部署

### Docker 部署

使用 Docker Compose：
```bash
# 啟動 Bot 服務
docker-compose --profile bots up telegram-bot

# 查看日誌
docker-compose logs -f telegram-bot
```

### PM2 部署

使用 PM2 進程管理：
```bash
# 安裝 PM2
npm install -g pm2

# 啟動 Bot
pm2 start telegram-bot/src/bot.js --name "twin-gate-telegram-bot"

# 查看狀態
pm2 status

# 查看日誌
pm2 logs twin-gate-telegram-bot
```

### 環境分離

建議使用不同的環境：
- **開發環境**: 本地測試
- **測試環境**: 功能驗證
- **生產環境**: 正式服務

## 📈 擴展功能

### 多語言支援

添加新語言：
1. 創建語言文件 `src/locales/en.json`
2. 更新訊息處理邏輯
3. 添加語言切換功能

### 自定義指令

添加新指令：
1. 在 `src/commands/index.js` 中添加指令處理器
2. 更新指令列表
3. 添加相應的回調處理

### 進階功能

可以添加的功能：
- 群組管理
- 內聯查詢
- 支付整合
- 檔案處理
- 排程任務

## 🔒 安全考量

### 最佳實踐

1. **環境變數安全**：
   - 不要將 `.env` 文件提交到版本控制
   - 使用強密碼和安全的 Token
   - 定期輪換憑證

2. **輸入驗證**：
   - 驗證所有使用者輸入
   - 防止注入攻擊
   - 限制訊息長度

3. **速率限制**：
   - 實施使用者速率限制
   - 防止濫用和垃圾訊息
   - 監控異常活動

4. **日誌安全**：
   - 不要記錄敏感資訊
   - 定期清理日誌檔案
   - 保護日誌檔案存取權限

## 📞 支援與聯繫

如果遇到問題，請：

1. 查看本指南的故障排除部分
2. 檢查 GitHub Issues
3. 聯繫開發團隊
4. 查看 Twin3.ai 官方文檔

---

**Twin Gate Telegram Bot** - 安全、可靠、易用的人類身份驗證解決方案 🤖✨
