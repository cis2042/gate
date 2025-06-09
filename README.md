# Twin Gate Telegram Bot

� **Telegram Bot for Human Identity Verification**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)
[![GCP](https://img.shields.io/badge/GCP-Deployed-green.svg)](https://cloud.google.com/)
[[![Telegram](https://img.shields.io/badge/Telegram-@twin3bot-blue.svg)](https://t.me/twin3bot)

## 🚀 **GCP 部署狀慁**

- **🌐 VM IP**: 35.185.141.238
- **🗄️ 資料庫 IP**: 35.194.208.240
- **🤖 Bot**: [@twin3bot](https://t.me/twin3bot) - 正常運行
- **💰 ��4估費品**: 約 $35/月

## 𓘱 **Telegram Bot 設定**

### Bot 基本慇息
- **Bot 用戶名**: @twin3bot
- **Bot Token**: `7151382731:AAGb1r6ACJE-xkMxFiW4Ml3wD1X5rKOPTkc`
- **管理員、Chat ID**: `589541800`

### 支捴的命令
```
/start  - 唕動 Bot 並显示歡迎盍面
/verify - 進入三階段��證系統
/help   - 显示幫助信息
```

### 多効言支捴
- 🇫🇿 繁體中文�- 🇪🇸 English

## ★️ **GCP 基擎設施配置**

### 專案设宐
```bash
PROJECT_ID="twin-gate"
REGION="asia-east1"
ZONE="asia-east1-a"
```

### Compute Engine VM
```bash
INSTANCE_NAME="twin-gate-server"
MACHINE_TYPE="e2-medium"
OS="Ubuntu 20.04 LTS"
DISK_SIZE="20GB"
EXTERNAL_IP="35.185.141.238"
```

### Cloud SQL PostgreSQL
```bash
DB_INSTANCE_NAME="twin-gate-db"
DB_VERSION="POSTGRES_14"
DB_TIER="db-f1-micro"
DB_NAME="twin_gate"
DB_USER="twin_gate_user"
DB_PASSWORD="TwinGate2025!"
DB_IP="35.194.208.240"
```

### 防火牆规則
```bash
FIREWALL_NAME="allow-twin-gate"
ALLOWED_PORTS="tcp:80,tcp:443,tcp:3000,tcp:8080"
TARGET_TAGS="twin-gate"
```

## 🚀 **快速部署**

### 方法 1: 自動化。部署 (推�f�)
```bash
# 在 Google Cloud Shell 中装行
git clone https://github.com/cis2042/gate.git
cd gate
chmod +x CLOUD_SHELL_DEPLOY.sh
./CLOUD_SHELL_DEPLOY.sh
```

### 方法 2: 本地挢试
```bash
# 在 Google Cloud Shell 中憓行
git clone https://github.com/cis2042/gate.git
cd gate
pip3 install -r requirements.txt
python3 local_twin_gate_bot.py
```

## ⚙』 **现境變量設定**

### 生産環境 (.env)
```bash
BOT_TOKEN=7151382731:AAGb1r6ACJG-xkMxFiW4Ml3wD1X5rKOPTkc
ADMIN_CHAT_ID=589541800
DB_HOST=35.194.208.240
DB_PORT=5432
DB_NAME=twin_gate
DB_USER=twin_gate_user
DB_PASSWORD=TwinGate2025!
```

### 開癰環境
```bash
BOT_TOKEN=your_bot_token
ADMIN_CHAT_ID=your_chat_id
DB_HOST=localhost
DB_PORT=5432
DB_NAME=twin_gate
DB_USER=postgres
DB_PASSWORD=your_password
```

## 📁 **师案檔案結槄**

```
gate/
├── local_twin_gate_bot.py      # 本地運行版本
├── CLOUD_SHELL_DEPLOY.sh       # GCP 自倕化部署脚本
├── requirements.txt            # Python 依贴
├── config.env                  # 现境變量模板
└── README.md                   # 專案說明
```

## 🔇 **技行规格**

### Python 依賴
```
requests>=2.31.0
psycopg2-binary>=2.9.0
python-dotenv>=1.0.0
```

### GCP 服務
- **Compute Engine**: VM 實例運行
- **Cloud SQL**: PostgreSQL 資料庫
- **VPC Firewall**: 網络安全規則

## 𑒰 **成本估算**

| 服動 | 規格 | 月費品 |
|------|------|--------|
| Compute Engine | e2-medium | ~$25 |
| Cloud SQL | db-f1-micro | ~$8 |
| 網络流量 | 標準 | ~$2 |
| **总訊** | | **~$35** |

## 🔇 **網護、監控**

### 樢查 Bot 狀慁
```bash
# SSH 到 VM
gcloud compute ssh ubuntu@twin-gate-server --zone=asia-east1-a

# 樢查 Bot 進稉
ps aux | grep python3

# 查看 Bot 日訆
tail -f bot.log
```

### 重啟 Bot 服動
```bash
# 停止 Bot
pkill python3

# 重新啟動 Bot
nohup python3 twin_gate_bot.py > bot.log 2>&1 &
```

### 樢查資料庫連接
```bash
# 連接到 Cloud SQL
gcloud sql connect twin-gate-db --user=twin_gate_user
```

## 𓒞 **聯糣信息**

- **Telegram Bot**: [@twin3bot](https://t.me/twin3bot)
- **GitHub**: [https://github.com/cis2042/gate](https://github.com/cis2042/gate)

---

**Twin Gate Telegram Bot - GCP 部署版本** 🤖☁️
