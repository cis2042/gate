# 🔐 Twin Gate 安全配置指南

## ⚠️ 重要安全提醒

**請立即檢查並確保以下安全措施已正確實施：**

## 🚨 緊急安全檢查清單

### 1. Telegram Bot Token 安全
- [ ] **立即撤銷舊的 Bot Token**
- [ ] **生成新的 Bot Token**
- [ ] **確保 Token 只存在於環境變量中**
- [ ] **檢查 GitHub 歷史記錄中是否有 Token 洩露**

### 2. 環境變量保護
```bash
# ✅ 正確：使用環境變量
BOT_TOKEN=your_new_bot_token_here
API_BASE_URL=https://your-api-url.com

# ❌ 錯誤：硬編碼在代碼中
const token = "7151382731:AAEri1r5pPsVWItZryHClRFjWWp0N46W8XI";
```

### 3. Git 安全配置
確保 `.gitignore` 包含：
```
# Environment variables
.env
.env.*
!.env.example

# Sensitive files
*token*
*secret*
*key*
!*example*
!*template*
```

## 🔧 立即修復步驟

### 步驟 1: 撤銷舊 Token
1. 前往 [@BotFather](https://t.me/BotFather)
2. 發送 `/mybots`
3. 選擇 `@twin3bot`
4. 選擇 `API Token`
5. 選擇 `Revoke current token`

### 步驟 2: 生成新 Token
1. 在 BotFather 中選擇 `Generate new token`
2. 複製新的 Token
3. **不要**將 Token 貼到任何代碼文件中

### 步驟 3: 更新環境變量
```bash
# 在 Google Cloud Run 中更新環境變量
gcloud run services update twin-gate-bot \
  --set-env-vars BOT_TOKEN=YOUR_NEW_TOKEN_HERE \
  --region asia-east1
```

### 步驟 4: 清理 Git 歷史（如果需要）
```bash
# 如果 Git 歷史中有敏感信息，使用 git filter-branch 清理
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch path/to/sensitive/file' \
  --prune-empty --tag-name-filter cat -- --all
```

## 🛡️ 安全最佳實踐

### 1. 環境變量管理
- 使用 `.env` 文件進行本地開發
- 使用雲平台的環境變量功能進行生產部署
- 定期輪換 API 密鑰和 Token

### 2. 代碼審查
- 提交前檢查是否包含敏感信息
- 使用 `git diff` 檢查變更
- 設置 pre-commit hooks 檢測敏感信息

### 3. 部署安全
- 使用 HTTPS 進行所有通信
- 設置 Webhook 密鑰驗證
- 限制 API 訪問權限

### 4. 監控和日誌
- 監控異常 API 調用
- 記錄安全事件
- 設置告警機制

## 📋 安全檢查清單

### 開發環境
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 沒有硬編碼的密鑰或 Token
- [ ] 使用 `.env.example` 作為模板

### 生產環境
- [ ] 環境變量正確設置
- [ ] HTTPS 已啟用
- [ ] Webhook 密鑰已設置
- [ ] 日誌記錄已配置

### Git 倉庫
- [ ] `.gitignore` 正確配置
- [ ] 沒有敏感文件被提交
- [ ] Git 歷史記錄乾淨

## 🚨 如果發生安全事件

1. **立即撤銷**所有可能洩露的密鑰
2. **生成新的**密鑰和 Token
3. **更新所有**相關服務的配置
4. **檢查日誌**是否有異常活動
5. **通知相關**團隊成員

## 📞 安全聯繫方式

如果發現安全問題，請立即聯繫：
- 項目維護者：[@cis2042](https://github.com/cis2042)
- 安全郵箱：security@twin3.ai（如果有的話）

## 🔄 定期安全維護

- **每月**檢查和輪換 API 密鑰
- **每季度**審查訪問權限
- **每年**進行安全審計

---

**記住：安全是一個持續的過程，不是一次性的任務！**
