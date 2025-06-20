# Twin Gate Telegram Bot

ï¤ **Telegram Bot for Human Identity Verification**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)
[![GCP](https://img.shields.io/badge/GCP-Deployed-green.svg)](https://cloud.google.com/)
[[![Telegram](https://img.shields.io/badge/Telegram-@twin3bot-blue.svg)](https://t.me/twin3bot)

## ð **GCP é¨ç½²çæ**

- **ð VM IP**: 35.185.141.238
- **ðï¸ è³æåº« IP**: 35.194.208.240
- **ð¤ Bot**: [@twin3bot](https://t.me/twin3bot) - æ­£å¸¸éè¡
- **ð° ¦¤4ä¼°è²»å**: ç´ $35/æ

## ð± **Telegram Bot è¨­å®**

### Bot åºæ¬ææ¯
- **Bot ç¨æ¶å**: @twin3bot
- **Bot Token**: `7151382731:AAGb1r6ACJE-xkMxFiW4Ml3wD1X5rKOPTkc`
- **ç®¡çå¡ãChat ID**: `589541800`

### æ¯æ´çå½ä»¤
```
/start  - åå Bot ä¸¦æ¾ç¤ºæ­¡è¿çé¢
/verify - é²å¥ä¸éæ®µ¦¨è­ç³»çµ±
/help   - æ¾ç¤ºå¹«å©ä¿¡æ¯
```

### å¤å¹è¨æ¯æ´
- ð«ð¿ ç¹é«ä¸­æÊ- ðªð¸ English

## âï¸ **GCP åºæè¨­æ½éç½®**

### å°æ¡è®¾å®
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

### é²ç«çè§å
```bash
FIREWALL_NAME="allow-twin-gate"
ALLOWED_PORTS="tcp:80,tcp:443,tcp:3000,tcp:8080"
TARGET_TAGS="twin-gate"
```

## ð **å¿«éé¨ç½²**

### æ¹æ³ 1: èªååãé¨ç½² (æ¨éf)
```bash
# å¨ Google Cloud Shell ä¸­è£è¡
git clone https://github.com/cis2042/gate.git
cd gate
chmod +x CLOUD_SHELL_DEPLOY.sh
./CLOUD_SHELL_DEPLOY.sh
```

### æ¹æ³ 2: æ¬å°æ¢è¯
```bash
# å¨ Google Cloud Shell ä¸­æè¡
git clone https://github.com/cis2042/gate.git
cd gate
pip3 install -r requirements.txt
python3 local_twin_gate_bot.py
```

## âã **ç°å¢è®éè¨­å®**

### çç£ç°å¢ (.env)
```bash
BOT_TOKEN=7151382731:AAGb1r6ACJG-xkMxFiW4Ml3wD1X5rKOPTkc
ADMIN_CHAT_ID=589541800
DB_HOST=35.194.208.240
DB_PORT=5432
DB_NAME=twin_gate
DB_USER=twin_gate_user
DB_PASSWORD=TwinGate2025!
```

### éç°ç°å¢
```bash
BOT_TOKEN=your_bot_token
ADMIN_CHAT_ID=your_chat_id
DB_HOST=localhost
DB_PORT=5432
DB_NAME=twin_gate
DB_USER=postgres
DB_PASSWORD=your_password
```

## ð **å¸æ¡æªæ¡çµæ§**

```
gate/
âââ local_twin_gate_bot.py      # æ¬å°éè¡çæ¬
âââ CLOUD_SHELL_DEPLOY.sh       # GCP èªååé¨ç½²èæ¬
âââ requirements.txt            # Python ä¾è´´
âââ config.env                  # ç°å¢è®éæ¨¡æ¿
âââ README.md                   # å°æ¡èªªæ
```

## ð **æè¡è§æ ¼**

### Python ä¾è³´
```
requests>=2.31.0
psycopg2-binary>=2.9.0
python-dotenv>=1.0.0
```

### GCP æå
- **Compute Engine**: VM å¯¦ä¾éè¡
- **Cloud SQL**: PostgreSQL è³æåº«
- **VPC Firewall**: ç¶²ç»å®å¨è¦å

## ð° **ææ¬ä¼°ç®**

| æå | è¦æ ¼ | æè²»å |
|------|------|--------|
| Compute Engine | e2-medium | ~$25 |
| Cloud SQL | db-f1-micro | ~$8 |
| ç¶²ç»æµé | æ¨æº | ~$2 |
| **æ»è¨** | | **~$35** |

## ð **ç¶²è­·ãç£æ§**

### æ¨¢æ¥ Bot çæ
```bash
# SSH å° VM
gcloud compute ssh ubuntu@twin-gate-server --zone=asia-east1-a

# æ¨¢æ¥ Bot é²ç¨
ps aux | grep python3

# æ¥ç Bot æ¥è¨
tail -f bot.log
```

### éå Bot æå
```bash
# åæ­¢ Bot
pkill python3

# éæ°åå Bot
nohup python3 twin_gate_bot.py > bot.log 2>&1 &
```

### æ¨¢æ¥è³æåº«é£æ¥
```bash
# é£æ¥å° Cloud SQL
gcloud sql connect twin-gate-db --user=twin_gate_user
```

## ð **è¯ç³£ä¿¡æ¯**

- **Telegram Bot**: [@twin3bot](https://t.me/twin3bot)
- **GitHub**: [https://github.com/cis2042/gate](https://github.com/cis2042/gate)

---

**Twin Gate Telegram Bot - GCP é¨ç½²çæ¬** ð¤âï¸
