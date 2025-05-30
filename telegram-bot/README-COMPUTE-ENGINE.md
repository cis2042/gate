# Twin Gate Telegram Bot - Compute Engine 部署

## 🏗️ 最終架構

### ✅ 已實現的 4 個要求

1. **✅ node-telegram-bot-api** - 官方推薦的 Telegram Bot 框架
2. **✅ PM2** - 進程管理器，自動重啟和監控
3. **✅ Google Compute Engine Ubuntu 24.04 LTS** - 虛擬機部署
4. **✅ 無 Docker** - 直接在 Ubuntu 上運行 Node.js

## 📋 架構概覽

```
Internet → Nginx (Port 80) → Node.js App (Port 3000) → PM2 → Ubuntu 24.04 LTS
                                     ↓
                              Telegram Bot API
```

### 🖥️ 服務器信息
- **實例名稱**: twin-gate-bot
- **區域**: asia-east1-a (台灣)
- **機器類型**: e2-micro
- **作業系統**: Ubuntu 24.04 LTS
- **外部 IP**: 34.80.77.23

## 🚀 快速部署

### 1. 設置環境變量
```bash
export BOT_TOKEN="7151382731:AAFYJY3_mt5fjQV0S2lKylYsJZMVsvby4j4"
```

### 2. 部署到 Compute Engine
```bash
# 一鍵部署
./deploy.sh production
```

### 3. 手動設置服務器 (首次)
```bash
# 連接到服務器
gcloud compute ssh ubuntu@twin-gate-bot --zone=asia-east1-a

# 運行設置腳本
./setup-server.sh
```

## 🔧 PM2 管理命令

### 本地 PM2 命令
```bash
npm run pm2:start     # 啟動服務
npm run pm2:stop      # 停止服務
npm run pm2:restart   # 重啟服務
npm run pm2:reload    # 重載服務 (零停機)
npm run pm2:logs      # 查看日誌
npm run pm2:status    # 查看狀態
npm run pm2:monit     # 監控界面
```

### 服務器上的 PM2 命令
```bash
# 連接到服務器
gcloud compute ssh ubuntu@twin-gate-bot --zone=asia-east1-a

# PM2 管理
pm2 status                    # 查看所有進程狀態
pm2 logs twin-gate-bot       # 查看 Bot 日誌
pm2 restart twin-gate-bot    # 重啟 Bot
pm2 reload twin-gate-bot     # 零停機重載
pm2 monit                    # 實時監控
pm2 save                     # 保存當前進程列表
```

## 📊 監控和維護

### 1. 健康檢查
```bash
# 檢查服務狀態
curl http://34.80.77.23/health

# 檢查 PM2 狀態
curl http://34.80.77.23/pm2/status
```

### 2. 查看日誌
```bash
# 連接服務器查看日誌
gcloud compute ssh ubuntu@twin-gate-bot --zone=asia-east1-a
pm2 logs twin-gate-bot --lines 100
```

### 3. 系統監控
```bash
# 連接服務器
gcloud compute ssh ubuntu@twin-gate-bot --zone=asia-east1-a

# 查看系統資源
htop                    # 系統監控
df -h                   # 磁盤使用
free -h                 # 內存使用
pm2 monit              # PM2 監控
```

## 🔄 自動化功能

### 1. 自動重啟
- PM2 自動重啟崩潰的進程
- 系統重啟後自動啟動 PM2
- 內存超限自動重啟 (500MB)

### 2. 日誌管理
- 自動日誌輪轉 (每日)
- 保留 30 天日誌
- 壓縮舊日誌文件

### 3. 健康監控
- 每 5 分鐘自動檢查進程狀態
- 自動重啟失敗的服務
- 監控內存和磁盤使用

## 🛠️ 故障排除

### 1. Bot 無回應
```bash
# 檢查 PM2 狀態
gcloud compute ssh ubuntu@twin-gate-bot --zone=asia-east1-a
pm2 status

# 重啟 Bot
pm2 restart twin-gate-bot

# 查看錯誤日誌
pm2 logs twin-gate-bot --err
```

### 2. 服務器連接問題
```bash
# 檢查實例狀態
gcloud compute instances list --filter="name:twin-gate-bot"

# 啟動實例
gcloud compute instances start twin-gate-bot --zone=asia-east1-a

# 檢查防火牆
gcloud compute firewall-rules list --filter="name:default-allow-http"
```

### 3. Webhook 問題
```bash
# 檢查 Webhook 狀態
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"

# 重新設置 Webhook
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d '{"url": "http://34.80.77.23/webhook"}'
```

## 📁 文件結構

```
telegram-bot/
├── src/                    # 源代碼
│   ├── bot.js             # 主程序
│   ├── utils/             # 工具函數
│   └── services/          # 服務模塊
├── ecosystem.config.js    # PM2 配置
├── setup-server.sh       # 服務器設置腳本
├── deploy.sh             # 部署腳本
├── package.json          # Node.js 依賴
└── README-COMPUTE-ENGINE.md
```

## 🔒 安全配置

### 1. 防火牆規則
- SSH (22): 允許
- HTTP (80): 允許
- HTTPS (443): 允許
- App (3000): 內部訪問

### 2. Nginx 配置
- 反向代理到 Node.js
- 自動 HTTPS 重定向
- 安全標頭配置

### 3. 系統安全
- 非 root 用戶運行
- 自動安全更新
- 日誌監控

## 📞 支援

- **服務器 IP**: 34.80.77.23
- **Bot URL**: https://t.me/twin3bot
- **健康檢查**: http://34.80.77.23/health
- **PM2 狀態**: http://34.80.77.23/pm2/status

---

**Twin Gate Telegram Bot 現在運行在 Google Compute Engine + PM2 架構上！** 🚀
