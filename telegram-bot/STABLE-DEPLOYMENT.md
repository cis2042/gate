# Twin Gate Telegram Bot - 穩定版本部署說明

## 🎉 穩定版本配置

此版本已確認正常運作，語言一致性問題已完全解決。

### 📋 當前狀態
- ✅ **Bot 狀態**: 正常運行
- ✅ **語言功能**: 繁體中文/English 完全一致
- ✅ **驗證流程**: 3級驗證系統正常
- ✅ **用戶體驗**: 流暢無錯誤

### 🚀 部署配置

#### **服務器環境**
- **平台**: Google Compute Engine
- **系統**: Ubuntu 24.04 LTS
- **Node.js**: v18.20.8
- **進程管理**: PM2
- **反向代理**: Nginx

#### **Bot 配置**
- **文件**: `src/bot-stable.js`
- **模式**: Polling (穩定)
- **端口**: 3000
- **健康檢查**: `/health`

### 📁 文件結構
```
telegram-bot/
├── src/
│   ├── bot-stable.js          # 穩定工作版本 ⭐
│   └── bot.js                 # 原始複雜版本 (已棄用)
├── ecosystem.stable.config.js  # PM2 穩定配置
├── ecosystem.config.js         # PM2 原始配置
├── package.json
├── deploy.sh
├── DEPLOYMENT.md              # 原始部署文檔
└── STABLE-DEPLOYMENT.md       # 此文檔 (穩定版本)
```

### 🔧 部署步驟

#### **1. 環境準備**
```bash
# 設置環境變量
export BOT_TOKEN="7151382731:AAFYJY3_mt5fjQV0S2lKylYsJZMVsvby4j4"

# 安裝依賴
npm install --production
```

#### **2. 啟動 Bot (穩定版本)**
```bash
# 使用穩定配置啟動
pm2 start ecosystem.stable.config.js --env production

# 或直接啟動穩定版本
pm2 start src/bot-stable.js --name twin-gate-bot-stable
```

#### **3. 監控狀態**
```bash
# 檢查狀態
pm2 status

# 查看日誌
pm2 logs twin-gate-bot-stable

# 健康檢查
curl http://localhost:3000/health
```

### 🎯 功能特性

#### **✅ 已實現功能**
- **語言選擇**: 繁體中文 / English
- **語言一致性**: 選擇語言後所有界面統一
- **驗證流程**: Level 1-3 驗證系統
- **進度追蹤**: 驗證進度和人性指數
- **SBT 信息**: 模擬 Soul Bound Token 功能
- **錯誤處理**: 完善的錯誤處理機制

#### **🎮 用戶流程**
1. `/start` → 語言選擇
2. 選擇語言 → 歡迎界面 (語言一致)
3. 開始驗證 → 3級驗證選單
4. 完成驗證 → 獲得 SBT 和人性指數
5. 查看進度 → 完整進度報告

### ⚠️ 重要注意事項

#### **🔒 安全配置**
- Bot Token 使用環境變量
- 不在代碼中硬編碼敏感信息
- 日誌文件定期清理

#### **📊 監控要點**
- PM2 進程狀態保持 "online"
- 內存使用量 < 500MB
- 重啟次數 < 10 次/小時

#### **🚫 禁止操作**
- **不要修改** `src/bot-stable.js` 文件
- **不要更改** 當前的 polling 模式
- **不要添加** 複雜的依賴包

### 🔄 維護指南

#### **日常維護**
```bash
# 重啟 Bot
pm2 restart twin-gate-bot-stable

# 查看狀態
pm2 monit

# 清理日誌
pm2 flush
```

#### **故障排除**
1. **Bot 無回應**: 檢查 PM2 狀態和日誌
2. **語言錯亂**: 重啟 Bot 進程
3. **內存過高**: 檢查是否有內存洩漏

### 📞 支援信息

- **Bot 用戶名**: @twin3bot
- **健康檢查**: http://34.80.77.23/health
- **服務器 IP**: 34.80.77.23
- **維護狀態**: 正常運行 ✅

---

**最後更新**: 2025-06-01
**版本**: 1.0.0-stable
**狀態**: 生產環境正常運行
