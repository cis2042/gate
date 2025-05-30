#!/bin/bash

# Twin Gate Telegram Bot - Compute Engine 部署腳本
# 使用方法: ./deploy.sh [環境]
# 環境: dev, staging, production (默認: production)

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

# 檢查參數
ENVIRONMENT=${1:-production}
PROJECT_ID="twin-gate"
INSTANCE_NAME="twin-gate-bot"
ZONE="asia-east1-a"

log_info "開始部署 Twin Gate Telegram Bot 到 Compute Engine"
log_info "環境: $ENVIRONMENT"
log_info "項目 ID: $PROJECT_ID"
log_info "實例名稱: $INSTANCE_NAME"
log_info "區域: $ZONE"

# 檢查必要工具
GCLOUD_PATH="/Users/cis/google-cloud-sdk/bin/gcloud"
if ! command -v $GCLOUD_PATH &> /dev/null; then
    log_error "gcloud CLI 未找到: $GCLOUD_PATH"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js 未安裝"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm 未安裝"
    exit 1
fi

# 檢查是否已登錄 gcloud
if ! $GCLOUD_PATH auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    log_error "請先登錄 gcloud: $GCLOUD_PATH auth login"
    exit 1
fi

# 設置項目
log_info "設置 Google Cloud 項目..."
$GCLOUD_PATH config set project $PROJECT_ID

# 檢查 Compute Engine 實例是否存在
log_info "檢查 Compute Engine 實例..."
if ! $GCLOUD_PATH compute instances describe $INSTANCE_NAME --zone=$ZONE &> /dev/null; then
    log_error "Compute Engine 實例 $INSTANCE_NAME 不存在"
    log_info "請先創建實例或運行 setup-server.sh"
    exit 1
fi

# 檢查環境變量
log_info "檢查環境變量..."
if [ -z "$BOT_TOKEN" ]; then
    log_error "BOT_TOKEN 環境變量未設置"
    log_info "請設置: export BOT_TOKEN=your-bot-token"
    exit 1
fi

# 獲取實例外部 IP
EXTERNAL_IP=$($GCLOUD_PATH compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
log_info "實例外部 IP: $EXTERNAL_IP"

# 檢查實例是否運行
INSTANCE_STATUS=$($GCLOUD_PATH compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(status)")
if [ "$INSTANCE_STATUS" != "RUNNING" ]; then
    log_info "啟動 Compute Engine 實例..."
    $GCLOUD_PATH compute instances start $INSTANCE_NAME --zone=$ZONE
    log_info "等待實例啟動..."
    sleep 30
fi

# 準備部署文件
log_info "準備部署文件..."
tar -czf twin-gate-bot.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=*.log \
    --exclude=.env \
    src/ package.json package-lock.json ecosystem.config.js setup-server.sh

# 上傳文件到服務器
log_info "上傳文件到服務器..."
$GCLOUD_PATH compute scp twin-gate-bot.tar.gz ubuntu@$INSTANCE_NAME:/tmp/ --zone=$ZONE

# 在服務器上執行部署
log_info "在服務器上執行部署..."
$GCLOUD_PATH compute ssh ubuntu@$INSTANCE_NAME --zone=$ZONE --command="
    set -e

    # 創建應用目錄
    mkdir -p /home/ubuntu/twin-gate-bot
    cd /home/ubuntu/twin-gate-bot

    # 備份現有版本
    if [ -d 'telegram-bot' ]; then
        sudo mv telegram-bot backup/telegram-bot-\$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
    fi

    # 解壓新版本
    tar -xzf /tmp/twin-gate-bot.tar.gz -C .

    # 設置環境變量
    echo 'BOT_TOKEN=$BOT_TOKEN' > .env
    echo 'API_BASE_URL=https://api.twin3.ai' >> .env
    echo 'BOT_USERNAME=twin3bot' >> .env
    echo 'NODE_ENV=production' >> .env
    echo 'PORT=3000' >> .env

    # 安裝依賴
    npm ci --only=production

    # 停止現有進程
    pm2 delete twin-gate-bot 2>/dev/null || true

    # 啟動新進程
    pm2 start ecosystem.config.js --env production

    # 保存 PM2 配置
    pm2 save

    echo '部署完成！'
"

# 清理臨時文件
rm -f twin-gate-bot.tar.gz

APP_URL="http://$EXTERNAL_IP"

log_success "部署完成！"
log_info "應用 URL: $APP_URL"

# 設置 Telegram Webhook
log_info "設置 Telegram Webhook..."
WEBHOOK_URL="$APP_URL/webhook"

curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$WEBHOOK_URL\"}" | jq .

# 測試健康檢查
log_info "測試健康檢查..."
sleep 10
HEALTH_RESPONSE=$(curl -s "$APP_URL/health" || echo "failed")

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    log_success "健康檢查通過！"
else
    log_warning "健康檢查失敗，請檢查應用狀態"
fi

# 清理
if [ -f "app.yaml.backup" ]; then
    mv app.yaml.backup app.yaml
fi

log_success "部署流程完成！"
log_info "監控應用: gcloud app logs tail -s $SERVICE_NAME"
log_info "查看狀態: gcloud app versions list --service=$SERVICE_NAME"

echo ""
log_info "🤖 Twin Gate Telegram Bot 已成功部署到 Google App Engine！"
log_info "📱 Bot URL: https://t.me/twin3bot"
log_info "🌐 App URL: $APP_URL"
log_info "📊 監控: https://console.cloud.google.com/appengine/services?project=$PROJECT_ID"
