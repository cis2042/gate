#!/bin/bash

# Twin Gate Telegram Bot - App Engine 部署腳本
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

log_info "開始部署 Twin Gate Telegram Bot 到 App Engine"
log_info "環境: $ENVIRONMENT"
log_info "項目 ID: $PROJECT_ID"

# 檢查必要工具
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI 未安裝，請先安裝 Google Cloud SDK"
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
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    log_error "請先登錄 gcloud: gcloud auth login"
    exit 1
fi

# 設置項目
log_info "設置 Google Cloud 項目..."
gcloud config set project $PROJECT_ID

# 檢查 App Engine 是否已初始化
if ! gcloud app describe &> /dev/null; then
    log_warning "App Engine 應用尚未創建，正在創建..."
    gcloud app create --region=asia-east1
fi

# 檢查環境變量
log_info "檢查環境變量..."
if [ -z "$BOT_TOKEN" ]; then
    log_error "BOT_TOKEN 環境變量未設置"
    log_info "請設置: export BOT_TOKEN=your-bot-token"
    exit 1
fi

# 安裝依賴
log_info "安裝 Node.js 依賴..."
npm ci --only=production

# 運行測試 (如果存在)
if [ -f "package.json" ] && npm run | grep -q "test"; then
    log_info "運行測試..."
    npm test
fi

# 創建臨時 app.yaml (包含環境變量)
log_info "準備部署配置..."
cp app.yaml app.yaml.backup

# 根據環境設置不同的配置
case $ENVIRONMENT in
    "dev")
        SERVICE_NAME="twin-gate-bot-dev"
        ;;
    "staging")
        SERVICE_NAME="twin-gate-bot-staging"
        ;;
    "production")
        SERVICE_NAME="twin-gate-bot"
        ;;
    *)
        log_error "未知環境: $ENVIRONMENT"
        exit 1
        ;;
esac

# 部署到 App Engine
log_info "部署到 App Engine..."
gcloud app deploy app.yaml \
    --service=$SERVICE_NAME \
    --version=$(date +%Y%m%d-%H%M%S) \
    --promote \
    --stop-previous-version \
    --quiet

# 設置環境變量
log_info "設置環境變量..."
gcloud app versions describe $(gcloud app versions list --service=$SERVICE_NAME --limit=1 --format="value(id)") --service=$SERVICE_NAME > /dev/null

# 獲取部署的 URL
APP_URL=$(gcloud app browse --service=$SERVICE_NAME --no-launch-browser 2>&1 | grep -o 'https://[^[:space:]]*')

if [ -z "$APP_URL" ]; then
    APP_URL="https://$SERVICE_NAME-dot-$PROJECT_ID.appspot.com"
fi

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
