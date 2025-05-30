#!/bin/bash

# Twin Gate Telegram Bot - Ubuntu 24.04 LTS 服務器設置腳本
# 用於在 Google Compute Engine 上設置完整的運行環境

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查是否為 root 用戶
if [ "$EUID" -eq 0 ]; then
    log_error "請不要以 root 用戶運行此腳本"
    exit 1
fi

log_info "開始設置 Twin Gate Telegram Bot 服務器環境"
log_info "目標系統: Ubuntu 24.04 LTS"
log_info "部署模式: PM2 + Node.js (無 Docker)"

# 1. 系統更新
log_info "更新系統套件..."
sudo apt update && sudo apt upgrade -y

# 2. 安裝必要套件
log_info "安裝基礎套件..."
sudo apt install -y curl wget git build-essential software-properties-common

# 3. 安裝 Node.js 18.x (LTS)
log_info "安裝 Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 驗證安裝
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "Node.js 版本: $NODE_VERSION"
log_success "npm 版本: $NPM_VERSION"

# 4. 安裝 PM2 全局
log_info "安裝 PM2 進程管理器..."
sudo npm install -g pm2

# 設置 PM2 開機自啟
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu
log_success "PM2 已安裝並配置為開機自啟"

# 5. 創建應用目錄
log_info "創建應用目錄結構..."
mkdir -p /home/ubuntu/twin-gate-bot
mkdir -p /home/ubuntu/twin-gate-bot/logs
mkdir -p /home/ubuntu/twin-gate-bot/backup

# 6. 設置防火牆
log_info "配置防火牆規則..."
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 7. 創建環境變量文件
log_info "創建環境變量模板..."
cat > /home/ubuntu/twin-gate-bot/.env << 'EOF'
# Twin Gate Telegram Bot 環境變量
# 請填入實際的值

# Telegram Bot 配置
BOT_TOKEN=your-bot-token-here
BOT_USERNAME=twin3bot

# API 配置
API_BASE_URL=https://api.twin3.ai

# 服務器配置
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# 安全配置
WEBHOOK_SECRET=your-webhook-secret
ALLOWED_UPDATES=["message", "callback_query"]

# 功能配置
ENABLE_INLINE_MODE=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=20

# Google Cloud 配置
GOOGLE_CLOUD_PROJECT=twin-gate
EOF

# 8. 設置日誌輪轉
log_info "配置日誌輪轉..."
sudo tee /etc/logrotate.d/twin-gate-bot > /dev/null << 'EOF'
/home/ubuntu/twin-gate-bot/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# 9. 創建系統服務監控腳本
log_info "創建監控腳本..."
cat > /home/ubuntu/twin-gate-bot/monitor.sh << 'EOF'
#!/bin/bash
# Twin Gate Bot 監控腳本

# 檢查 PM2 進程狀態
if ! pm2 list | grep -q "twin-gate-bot"; then
    echo "$(date): Bot 進程未運行，正在重啟..." >> /home/ubuntu/twin-gate-bot/logs/monitor.log
    cd /home/ubuntu/twin-gate-bot && pm2 start ecosystem.config.js --env production
fi

# 檢查內存使用
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "$(date): 內存使用率過高: ${MEMORY_USAGE}%" >> /home/ubuntu/twin-gate-bot/logs/monitor.log
fi

# 檢查磁盤空間
DISK_USAGE=$(df /home | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): 磁盤使用率過高: ${DISK_USAGE}%" >> /home/ubuntu/twin-gate-bot/logs/monitor.log
fi
EOF

chmod +x /home/ubuntu/twin-gate-bot/monitor.sh

# 10. 設置 crontab 監控
log_info "設置定時監控..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/twin-gate-bot/monitor.sh") | crontab -

# 11. 安裝額外工具
log_info "安裝額外工具..."
sudo apt install -y htop tree jq bc nginx

# 12. 配置 Nginx 反向代理
log_info "配置 Nginx 反向代理..."
sudo tee /etc/nginx/sites-available/twin-gate-bot > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/twin-gate-bot /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# 13. 創建部署腳本
log_info "創建部署腳本..."
cat > /home/ubuntu/twin-gate-bot/deploy.sh << 'EOF'
#!/bin/bash
# Twin Gate Bot 部署腳本

set -e

cd /home/ubuntu/twin-gate-bot

# 備份當前版本
if [ -d "telegram-bot" ]; then
    cp -r telegram-bot backup/telegram-bot-$(date +%Y%m%d-%H%M%S)
fi

# 拉取最新代碼
git pull origin main

# 進入項目目錄
cd telegram-bot

# 安裝依賴
npm ci --only=production

# 重啟服務
pm2 reload ecosystem.config.js --env production

echo "部署完成！"
EOF

chmod +x /home/ubuntu/twin-gate-bot/deploy.sh

log_success "服務器環境設置完成！"
log_info "下一步："
log_info "1. 編輯 /home/ubuntu/twin-gate-bot/.env 文件，填入正確的 BOT_TOKEN"
log_info "2. 克隆項目代碼到 /home/ubuntu/twin-gate-bot"
log_info "3. 運行 pm2 start ecosystem.config.js --env production"
log_info ""
log_info "服務器信息："
log_info "- Node.js: $NODE_VERSION"
log_info "- PM2: $(pm2 --version)"
log_info "- Nginx: 已配置反向代理"
log_info "- 防火牆: 已開放必要端口"
log_info "- 監控: 每5分鐘自動檢查"
