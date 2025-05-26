#!/bin/bash

# Twin Gate - 自動化部署腳本
# 版本: v1.0.0
# 作者: @cis2042

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置變量
PROJECT_ID=${PROJECT_ID:-"twin-gate-prod"}
SERVICE_NAME=${SERVICE_NAME:-"twin-gate"}
REGION=${REGION:-"asia-east1"}
REGISTRY=${REGISTRY:-"gcr.io"}
IMAGE_TAG="${REGISTRY}/${PROJECT_ID}/${SERVICE_NAME}"

# 日誌函數
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

# 檢查必要工具
check_dependencies() {
    log_info "檢查部署依賴..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "Google Cloud SDK 未安裝"
        log_info "請訪問: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安裝"
        log_info "請訪問: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "Git 未安裝"
        exit 1
    fi
    
    log_success "依賴檢查完成"
}

# 驗證 Google Cloud 認證
verify_gcloud_auth() {
    log_info "驗證 Google Cloud 認證..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "未登錄 Google Cloud"
        log_info "請運行: gcloud auth login"
        exit 1
    fi
    
    # 設置項目
    gcloud config set project $PROJECT_ID
    
    # 驗證項目存在
    if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
        log_error "項目 $PROJECT_ID 不存在或無權限訪問"
        exit 1
    fi
    
    log_success "Google Cloud 認證驗證完成"
}

# 啟用必要的 API
enable_apis() {
    log_info "啟用必要的 Google Cloud API..."
    
    APIS=(
        "run.googleapis.com"
        "sql-component.googleapis.com"
        "sqladmin.googleapis.com"
        "containerregistry.googleapis.com"
        "cloudbuild.googleapis.com"
    )
    
    for api in "${APIS[@]}"; do
        if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q $api; then
            log_info "API $api 已啟用"
        else
            log_info "啟用 API: $api"
            gcloud services enable $api
        fi
    done
    
    log_success "API 啟用完成"
}

# 構建 Docker 映像
build_image() {
    log_info "構建 Docker 映像..."
    
    # 獲取 Git 提交哈希
    GIT_COMMIT=$(git rev-parse --short HEAD)
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    
    # 構建映像標籤
    IMAGE_TAG_COMMIT="${IMAGE_TAG}:${GIT_COMMIT}"
    IMAGE_TAG_LATEST="${IMAGE_TAG}:latest"
    IMAGE_TAG_TIMESTAMP="${IMAGE_TAG}:${TIMESTAMP}"
    
    log_info "構建映像標籤: $IMAGE_TAG_COMMIT"
    
    # 進入 telegram-bot 目錄
    cd telegram-bot
    
    # 構建映像
    docker build \
        --tag $IMAGE_TAG_COMMIT \
        --tag $IMAGE_TAG_LATEST \
        --tag $IMAGE_TAG_TIMESTAMP \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$GIT_COMMIT \
        .
    
    cd ..
    
    log_success "Docker 映像構建完成"
}

# 推送映像到 Container Registry
push_image() {
    log_info "推送映像到 Container Registry..."
    
    # 配置 Docker 認證
    gcloud auth configure-docker --quiet
    
    # 推送映像
    docker push $IMAGE_TAG_COMMIT
    docker push $IMAGE_TAG_LATEST
    docker push $IMAGE_TAG_TIMESTAMP
    
    log_success "映像推送完成"
}

# 檢查 Cloud SQL 實例
check_database() {
    log_info "檢查 Cloud SQL 實例..."
    
    DB_INSTANCE="${PROJECT_ID}:${REGION}:twin-gate-db"
    
    if gcloud sql instances describe twin-gate-db --format="value(name)" &> /dev/null; then
        log_success "Cloud SQL 實例存在"
    else
        log_warning "Cloud SQL 實例不存在，將創建新實例"
        create_database
    fi
}

# 創建 Cloud SQL 實例
create_database() {
    log_info "創建 Cloud SQL 實例..."
    
    gcloud sql instances create twin-gate-db \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=03:00 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04
    
    # 設置 root 密碼
    log_info "設置數據庫密碼..."
    gcloud sql users set-password postgres \
        --instance=twin-gate-db \
        --password=$(openssl rand -base64 32)
    
    # 創建應用數據庫
    gcloud sql databases create twingate \
        --instance=twin-gate-db
    
    log_success "Cloud SQL 實例創建完成"
}

# 部署到 Cloud Run
deploy_service() {
    log_info "部署到 Cloud Run..."
    
    # 檢查環境變量
    if [ -z "$BOT_TOKEN" ]; then
        log_error "BOT_TOKEN 環境變量未設置"
        exit 1
    fi
    
    if [ -z "$TWIN3_API_KEY" ]; then
        log_error "TWIN3_API_KEY 環境變量未設置"
        exit 1
    fi
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL 環境變量未設置"
        exit 1
    fi
    
    # 部署服務
    gcloud run deploy $SERVICE_NAME \
        --image $IMAGE_TAG_COMMIT \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --concurrency 1000 \
        --timeout 300 \
        --max-instances 10 \
        --min-instances 0 \
        --set-env-vars "NODE_ENV=production" \
        --set-env-vars "BOT_TOKEN=$BOT_TOKEN" \
        --set-env-vars "TWIN3_API_KEY=$TWIN3_API_KEY" \
        --set-env-vars "DATABASE_URL=$DATABASE_URL" \
        --set-env-vars "LOG_LEVEL=info" \
        --add-cloudsql-instances $PROJECT_ID:$REGION:twin-gate-db \
        --labels "app=twin-gate,version=$GIT_COMMIT,environment=production"
    
    log_success "Cloud Run 部署完成"
}

# 獲取服務 URL
get_service_url() {
    log_info "獲取服務 URL..."
    
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --platform managed \
        --region $REGION \
        --format 'value(status.url)')
    
    log_success "服務 URL: $SERVICE_URL"
    echo "SERVICE_URL=$SERVICE_URL" >> $GITHUB_ENV 2>/dev/null || true
}

# 健康檢查
health_check() {
    log_info "執行健康檢查..."
    
    if [ -n "$SERVICE_URL" ]; then
        # 等待服務啟動
        sleep 30
        
        # 檢查健康端點
        if curl -f "$SERVICE_URL/health" &> /dev/null; then
            log_success "健康檢查通過"
        else
            log_warning "健康檢查失敗，請檢查服務狀態"
        fi
    else
        log_warning "無法獲取服務 URL，跳過健康檢查"
    fi
}

# 設置監控告警
setup_monitoring() {
    log_info "設置監控告警..."
    
    # 創建通知渠道（如果不存在）
    if ! gcloud alpha monitoring channels list --filter="displayName:email-alerts" --format="value(name)" | grep -q .; then
        log_info "創建通知渠道..."
        gcloud alpha monitoring channels create \
            --channel-content-from-file=monitoring/notification-channel.yaml
    fi
    
    # 創建告警策略
    POLICIES=(
        "monitoring/cpu-alert.yaml"
        "monitoring/memory-alert.yaml"
        "monitoring/error-rate-alert.yaml"
    )
    
    for policy in "${POLICIES[@]}"; do
        if [ -f "$policy" ]; then
            log_info "創建告警策略: $policy"
            gcloud alpha monitoring policies create \
                --policy-from-file=$policy
        fi
    done
    
    log_success "監控告警設置完成"
}

# 清理舊版本
cleanup_old_versions() {
    log_info "清理舊版本..."
    
    # 保留最近 5 個版本
    gcloud run revisions list \
        --service=$SERVICE_NAME \
        --region=$REGION \
        --format="value(metadata.name)" \
        --sort-by="~metadata.creationTimestamp" \
        --limit=100 | tail -n +6 | while read revision; do
        if [ -n "$revision" ]; then
            log_info "刪除舊版本: $revision"
            gcloud run revisions delete $revision \
                --region=$REGION \
                --quiet
        fi
    done
    
    log_success "舊版本清理完成"
}

# 發送部署通知
send_notification() {
    log_info "發送部署通知..."
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        MESSAGE="✅ Twin Gate 部署成功！

📦 版本: $GIT_COMMIT
🌐 環境: Production
👤 部署者: ${GITHUB_ACTOR:-$(whoami)}
🔗 服務 URL: $SERVICE_URL
⏰ 部署時間: $(date)"
        
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="$MESSAGE" \
            -d parse_mode="Markdown" > /dev/null
        
        log_success "部署通知已發送"
    else
        log_warning "未配置通知，跳過"
    fi
}

# 回滾函數
rollback() {
    log_warning "執行回滾..."
    
    # 獲取前一個版本
    PREVIOUS_REVISION=$(gcloud run revisions list \
        --service=$SERVICE_NAME \
        --region=$REGION \
        --format="value(metadata.name)" \
        --sort-by="~metadata.creationTimestamp" \
        --limit=2 | tail -n 1)
    
    if [ -n "$PREVIOUS_REVISION" ]; then
        log_info "回滾到版本: $PREVIOUS_REVISION"
        gcloud run services update-traffic $SERVICE_NAME \
            --to-revisions=$PREVIOUS_REVISION=100 \
            --region=$REGION
        
        log_success "回滾完成"
    else
        log_error "無法找到前一個版本"
        exit 1
    fi
}

# 主函數
main() {
    log_info "開始 Twin Gate 自動化部署..."
    
    # 記錄開始時間
    START_TIME=$(date +%s)
    
    # 執行部署步驟
    check_dependencies
    verify_gcloud_auth
    enable_apis
    build_image
    push_image
    check_database
    deploy_service
    get_service_url
    health_check
    setup_monitoring
    cleanup_old_versions
    send_notification
    
    # 計算部署時間
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log_success "部署完成！耗時: ${DURATION}s"
    log_info "服務 URL: $SERVICE_URL"
}

# 解析命令行參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --rollback)
            rollback
            exit 0
            ;;
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Twin Gate 部署腳本"
            echo ""
            echo "用法: $0 [選項]"
            echo ""
            echo "選項:"
            echo "  --rollback       回滾到前一個版本"
            echo "  --project ID     指定 Google Cloud 項目 ID"
            echo "  --region REGION  指定部署區域"
            echo "  --service NAME   指定服務名稱"
            echo "  --help           顯示此幫助信息"
            echo ""
            echo "環境變量:"
            echo "  BOT_TOKEN        Telegram Bot Token"
            echo "  TWIN3_API_KEY    Twin3.ai API Key"
            echo "  DATABASE_URL     數據庫連接字符串"
            exit 0
            ;;
        *)
            log_error "未知選項: $1"
            exit 1
            ;;
    esac
done

# 運行主函數
main
