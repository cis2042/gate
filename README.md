# Twin Gate - Twin3.ai 人類身份驗證系統

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/cis2042/gate)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram Bot](https://img.shields.io/badge/telegram-bot-blue.svg)](#)

## 🌟 項目概述

Twin Gate 是一個基於 Twin3.ai 的多層級人類身份驗證系統，通過 Telegram Bot 提供便捷的身份驗證服務。用戶可以通過完成不同等級的驗證任務來證明自己的人類身份，並獲得相應的 Humanity Index 分數和 SBT（Soulbound Token）獎勵。

### 🎯 核心目標

- **人類身份驗證**：通過多層級驗證確保用戶的真實人類身份
- **去中心化身份**：基於區塊鏈技術的 SBT 身份證明
- **用戶友好體驗**：簡潔直觀的 Telegram Bot 界面
- **多語言支援**：支援 8 種語言的國際化體驗
- **隱私保護**：最小化數據收集，保護用戶隱私

## 🚀 主要功能

### 📱 Telegram Bot 功能
- **多語言支援**：繁體中文、簡體中文、English、한국어、Français、Deutsch、Español、Русский
- **三級驗證系統**：
  - Level 1: Google reCAPTCHA 驗證
  - Level 2: SMS 手機驗證
  - Level 3: 生物識別驗證
- **實時狀態追蹤**：驗證進度和 Humanity Index 顯示
- **SBT 鑄造**：完成 Level 2 後可鑄造專屬 SBT

### 🔐 驗證系統
- **Twin3.ai 整合**：使用 Twin3.ai API 進行身份驗證
- **分數系統**：0-255 Humanity Index 評分機制
- **通過門檻**：≥100 分即可通過驗證
- **順序解鎖**：必須按順序完成各級驗證

### 🏆 獎勵機制
- **SBT 鑄造**：完成 Level 2 驗證後可獲得 SBT
- **錢包生成**：Twin3.ai 自動為用戶生成專屬錢包
- **身份證明**：SBT 作為鏈上身份證明

## 📁 項目結構

```
gate/
├── docs/                    # 項目文檔
│   ├── PRD.md              # 產品需求文檔
│   ├── TECH_STACK.md       # 技術棧說明
│   ├── API.md              # API 文檔
│   └── DEPLOYMENT.md       # 部署指南
├── telegram-bot/           # Telegram Bot 源碼
│   ├── src/                # 源代碼目錄
│   │   ├── bot.js          # Bot 主入口
│   │   ├── commands/       # 命令處理器
│   │   ├── callbacks/      # 回調處理器
│   │   ├── middlewares/    # 中間件
│   │   ├── services/       # 業務邏輯服務
│   │   ├── utils/          # 工具函數
│   │   ├── locales/        # 多語言翻譯
│   │   └── config/         # 配置文件
│   ├── tests/              # 測試文件
│   └── package.json        # 依賴配置
├── scripts/                # 部署和測試腳本
├── .github/                # GitHub Actions 工作流
└── README.md               # 項目說明
```

## 🛠️ 技術棧

- **Bot 框架**：Telegraf.js
- **運行環境**：Node.js 18+
- **身份驗證**：Twin3.ai API
- **數據存儲**：PostgreSQL
- **區塊鏈**：Ethereum (SBT)
- **部署平台**：Google Cloud Run
- **CI/CD**：GitHub Actions
- **多語言**：i18next
- **日誌系統**：Winston

## 🚀 快速開始

### 前置要求
- Node.js 18+
- PostgreSQL 14+
- Telegram Bot Token
- Twin3.ai API Key

### 安裝步驟

1. **克隆項目**
```bash
git clone https://github.com/cis2042/gate.git
cd gate
```

2. **安裝依賴**
```bash
cd telegram-bot
npm install
```

3. **環境配置**
```bash
cp .env.example .env
# 編輯 .env 文件，填入必要的配置
```

4. **啟動服務**
```bash
npm start
```

### 環境變量配置

```env
# Telegram Bot
BOT_TOKEN=your-telegram-bot-token

# Twin3.ai API
TWIN3_API_URL=https://api.twin3.ai
TWIN3_API_KEY=your-twin3-api-key

# 數據庫
DATABASE_URL=postgresql://user:password@localhost:5432/twingate

# 其他配置
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

## 📖 使用指南

### 🎯 極簡命令結構 (精準版)

Twin Gate 採用極簡設計，**只保留 3 個核心命令**：

#### **🚀 核心命令 - 只有 3 個**
```
/verify  - 🚀 開始/查看驗證狀態
/sbt     - 🏆 查看 SBT 和個人資料
/help    - ❓ 獲取幫助和支援
```

#### **📱 命令整合說明**
- **✅ /start + /status + /verify → /verify**
  - 統一的驗證入口和狀態查看
  - 智能判斷用戶狀態並顯示對應界面

- **✅ /profile + /sbt → /sbt**
  - 完整的個人資料和 SBT 管理
  - 包含區塊鏈連結和 Twin3.ai 整合

#### **🌐 Twin3.ai 深度整合**
- **官網連結**：https://twin3.ai
- **技術文檔**：https://docs.twin3.ai
- **支援群組**：https://t.me/twin3support
- **個人頁面**：自動生成 Twin3.ai 個人檔案連結

#### **👥 群組支援 - 來源追蹤**
- ✅ 支援加入任何 Telegram 群組
- 🎯 自動追蹤用戶來源群組
- 📊 群組管理員可查看驗證統計
- 🔒 驗證過程完全私人進行

### 命令重定向說明

**已整合的命令 (自動重定向)：**
- `/start` → 重定向到 `/verify`
- `/status` → 重定向到 `/verify`
- `/profile` → 重定向到 `/sbt`

**核心命令：**
- `/verify` - 🚀 驗證流程和狀態查看 ⭐ **主要功能**
- `/sbt` - 🏆 SBT 和個人資料管理 ⭐ **主要功能**
- `/help` - ❓ 獲取幫助信息，包含 Twin3.ai 介紹

**管理命令：**
- `/groupstats` - 群組統計 (僅群組管理員)
- `/registergroup` - 註冊群組 (僅群組管理員)

### 🏆 SBT 管理功能 (新增)

#### **統一的 SBT 和個人資料界面**
```
/sbt
```
**整合功能包括：**
- 📋 完整個人資料顯示
- 🎯 驗證進度和 Humanity Index
- 💎 SBT 狀態和詳細信息
- 🔗 區塊鏈瀏覽器連結 (BNB Scan)
- 👤 Twin3.ai 個人頁面連結
- 🏆 SBT 鑄造和管理功能

#### **智能按鈕功能**
- **已有 SBT 用戶**：查看 BNB Scan、Twin3 頁面、SBT 詳情
- **可鑄造 SBT 用戶**：一鍵鑄造 SBT、查看進度
- **未達標用戶**：繼續驗證、了解 SBT、Twin3 頁面

## 🧪 測試

```bash
# 運行所有測試
npm test

# 運行特定測試
npm run test:unit
npm run test:integration

# 測試覆蓋率
npm run test:coverage
```

## 📊 監控和日誌

- **日誌系統**：Winston 結構化日誌
- **性能監控**：請求響應時間追蹤
- **用戶行為分析**：驗證流程數據統計
- **錯誤追蹤**：詳細的錯誤日誌和報告

## 🔒 安全性

- **數據加密**：敏感數據加密存儲
- **API 安全**：Token 驗證和速率限制
- **隱私保護**：最小化數據收集原則
- **GDPR 合規**：支援數據導出和刪除

## 🌍 國際化

支援的語言：
- 🇹🇼 繁體中文 (zh-TW)
- 🇨🇳 簡體中文 (zh-CN)
- 🇺🇸 English (en-US)
- 🇰🇷 한국어 (ko-KR)
- 🇫🇷 Français (fr-FR)
- 🇩🇪 Deutsch (de-DE)
- 🇪🇸 Español (es-ES)
- 🇷🇺 Русский (ru-RU)

## 📈 版本歷史

### v1.0.0 (2025-01-26)
- ✅ 初始版本發布
- ✅ 三級驗證系統
- ✅ 多語言支援
- ✅ SBT 鑄造功能
- ✅ Telegram Bot 完整功能

## 🚀 部署

### Google Cloud Run 部署
```bash
# 構建 Docker 映像
docker build -t twin-gate .

# 推送到 Google Container Registry
docker tag twin-gate gcr.io/PROJECT_ID/twin-gate
docker push gcr.io/PROJECT_ID/twin-gate

# 部署到 Cloud Run
gcloud run deploy twin-gate \
  --image gcr.io/PROJECT_ID/twin-gate \
  --platform managed \
  --region asia-east1
```

### 環境變量設定
```bash
# 設定 Cloud Run 環境變量
gcloud run services update twin-gate \
  --set-env-vars BOT_TOKEN=your-token,TWIN3_API_KEY=your-key
```

## 🤝 貢獻指南

1. Fork 本項目
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 許可證

本項目採用 MIT 許可證 - 詳見 [LICENSE](LICENSE) 文件

## 📞 聯繫方式

- **項目維護者**：[@cis2042](https://github.com/cis2042)
- **Telegram Bot**：[@twin3bot](https://t.me/twin3bot) (請聯繫管理員獲取最新 Bot 連結)
- **問題報告**：[GitHub Issues](https://github.com/cis2042/gate/issues)

## 🗺️ 發展路線圖

### Phase 1 (已完成) ✅
- ✅ Telegram Bot 基礎功能
- ✅ 三級驗證系統 (Twin3.ai)
- ✅ 多語言支援 (8 種語言)
- ✅ SBT 鑄造功能

### Phase 2 (進行中) 🚧
- [ ] Web 管理後台
- [ ] 高級分析儀表板
- [ ] API 文檔和 SDK
- [ ] 自動化測試覆蓋

### Phase 3 (計劃中) 📋
- [ ] 跨鏈 SBT 支援
- [ ] 企業級功能
- [ ] 第三方整合
- [ ] 移動應用支援

## 🙏 致謝

- [Twin3.ai](https://twin3.ai) - 提供人類身份驗證 API
- [Telegraf.js](https://telegraf.js.org/) - Telegram Bot 框架
- 所有貢獻者和用戶的支持

---

**Twin Gate - 讓身份驗證變得簡單可信** 🚀
