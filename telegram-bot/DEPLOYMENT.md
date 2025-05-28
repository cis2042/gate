# Twin Gate Telegram Bot - 部署文檔

## 部署概覽

Twin Gate Telegram Bot 已成功部署到 Google Cloud Run，提供高可用性和自動擴展的服務。

## 部署詳情

### 🌐 服務 URL
- **主要服務**: https://twin-gate-bot-60781120796.asia-east1.run.app
- **健康檢查**: https://twin-gate-bot-60781120796.asia-east1.run.app/health

### 🤖 Bot 資訊
- **Bot 用戶名**: @twin3bot
- **Bot ID**: 7151382731
- **Bot Token**: 7151382731:AAEri1r5pPsVWItZryHClRFjWWp0N46W8XI

### ☁️ Cloud Run 配置
- **項目**: twin-gate
- **項目編號**: 60781120796
- **區域**: asia-east1 (亞洲東部 - 台灣附近)
- **服務名稱**: twin-gate-bot
- **映像**: gcr.io/twin-gate/twin-gate-bot:latest

### 🔧 資源配置
- **記憶體**: 512Mi
- **CPU**: 1 vCPU
- **端口**: 3000
- **最大實例數**: 10
- **並發數**: 80
- **超時時間**: 300 秒

### 🌍 環境變數
```
NODE_ENV=production
BOT_TOKEN=7151382731:AAEri1r5pPsVWItZryHClRFjWWp0N46W8XI
BOT_USERNAME=twin3bot
API_BASE_URL=http://localhost:3001/api/v1
LOG_LEVEL=info
```

## 功能特性

### ✅ 已實現功能
1. **HTTP 健康檢查端點** - `/health` 和 `/`
2. **Telegram Bot 服務** - 支援輪詢模式
3. **自動擴展** - 根據流量自動調整實例數
4. **優雅關閉** - 支援 SIGTERM 和 SIGINT 信號
5. **錯誤處理** - 完整的錯誤捕獲和日誌記錄
6. **安全性** - 非 root 用戶運行，最小權限原則

### 🔄 Bot 命令
- `/verify` - 🚀 開始/查看驗證狀態
- `/sbt` - 🏆 查看 SBT 和個人資料
- `/help` - ❓ 獲取幫助和支援

## 監控和維護

### 📊 健康檢查
```bash
curl https://twin-gate-bot-60781120796.asia-east1.run.app/health
```

預期回應：
```json
{
  "status": "healthy",
  "uptime": 12.051200538,
  "timestamp": "2025-05-28T01:29:15.361Z",
  "botInfo": {
    "username": "twin3bot",
    "id": 7151382731
  },
  "environment": "production",
  "version": "1.0.0"
}
```

### 📝 日誌查看
```bash
gcloud run services logs read twin-gate-bot --region=asia-east1
```

### 🔄 重新部署
```bash
# 重新構建映像
gcloud builds submit --tag gcr.io/twin-gate/twin-gate-bot:latest .

# 重新部署服務
gcloud run deploy twin-gate-bot \
  --image gcr.io/twin-gate/twin-gate-bot:latest \
  --region asia-east1
```

## 安全考量

### 🔐 已實施的安全措施
1. **非 root 用戶** - 容器以 `twingate` 用戶運行
2. **最小映像** - 使用 Alpine Linux 基礎映像
3. **環境變數** - 敏感資訊通過環境變數管理
4. **網路隔離** - Cloud Run 提供的網路安全

### ⚠️ 注意事項
- Bot Token 目前通過環境變數傳遞，建議未來使用 Google Secret Manager
- API_BASE_URL 目前指向 localhost，需要更新為實際的後端 API 地址

## 下一步

### 🚀 待完成任務
1. **後端 API 部署** - 部署 Twin Gate 後端 API 服務
2. **資料庫設置** - 配置 PostgreSQL 或其他資料庫
3. **Secret Manager** - 將敏感資訊遷移到 Google Secret Manager
4. **監控設置** - 配置 Google Cloud Monitoring 和 Alerting
5. **CI/CD 管道** - 設置自動化部署管道

### 📞 支援聯絡
如有問題或需要支援，請聯絡開發團隊。

---
**部署時間**: 2025-05-28 01:29:06 UTC
**部署者**: Don.M.Wen@gmail.com
**版本**: 1.0.0
