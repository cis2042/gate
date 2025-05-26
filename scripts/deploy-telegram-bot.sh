#!/bin/bash

# Twin Gate Telegram Bot 部署腳本
# 此腳本用於快速部署和測試 Telegram Bot

set -e  # 遇到錯誤時退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 檢查必要的環境變數
check_env_vars() {
    log_info "檢查環境變數..."
    
    local required_vars=("BOT_TOKEN" "API_BASE_URL")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "缺少必要的環境變數: ${missing_vars[*]}"
        log_info "請在 telegram-bot/.env 文件中設定以下變數："
        for var in "${missing_vars[@]}"; do
            echo "  $var=your_value_here"
        done
        exit 1
    fi
    
    log_success "環境變數檢查完成"
}

# 檢查 Node.js 和 npm
check_dependencies() {
    log_info "檢查系統依賴..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安裝。請安裝 Node.js 18+ 版本"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安裝。請安裝 npm"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $node_version -lt 18 ]]; then
        log_warning "建議使用 Node.js 18+ 版本，目前版本: $(node --version)"
    fi
    
    log_success "系統依賴檢查完成"
}

# 安裝依賴
install_dependencies() {
    log_info "安裝 Bot 依賴..."
    
    cd telegram-bot
    
    if [[ ! -f package.json ]]; then
        log_error "找不到 package.json 文件"
        exit 1
    fi
    
    npm install
    
    log_success "依賴安裝完成"
}

# 檢查後端 API 連接
check_api_connection() {
    log_info "檢查後端 API 連接..."
    
    local api_url="${API_BASE_URL:-http://localhost:3001}"
    local health_endpoint="$api_url/health"
    
    if command -v curl &> /dev/null; then
        if curl -s -f "$health_endpoint" > /dev/null; then
            log_success "後端 API 連接正常"
        else
            log_warning "無法連接到後端 API: $health_endpoint"
            log_info "請確保後端服務正在運行"
        fi
    else
        log_warning "curl 未安裝，跳過 API 連接檢查"
    fi
}

# 驗證 Bot Token
validate_bot_token() {
    log_info "驗證 Bot Token..."
    
    if [[ -z "$BOT_TOKEN" ]]; then
        log_error "BOT_TOKEN 未設定"
        exit 1
    fi
    
    # 檢查 Token 格式
    if [[ ! "$BOT_TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
        log_warning "Bot Token 格式可能不正確"
    fi
    
    # 嘗試獲取 Bot 資訊
    if command -v curl &> /dev/null; then
        local bot_info=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getMe")
        if echo "$bot_info" | grep -q '"ok":true'; then
            local bot_username=$(echo "$bot_info" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
            log_success "Bot Token 有效，Bot 用戶名: @$bot_username"
        else
            log_error "Bot Token 無效或無法連接到 Telegram API"
            exit 1
        fi
    else
        log_warning "curl 未安裝，跳過 Bot Token 驗證"
    fi
}

# 啟動 Bot
start_bot() {
    log_info "啟動 Telegram Bot..."
    
    # 檢查是否已有 Bot 進程在運行
    if pgrep -f "node.*bot.js" > /dev/null; then
        log_warning "檢測到已有 Bot 進程在運行"
        read -p "是否要停止現有進程並重新啟動？(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pkill -f "node.*bot.js" || true
            sleep 2
        else
            log_info "保持現有進程運行"
            exit 0
        fi
    fi
    
    # 啟動 Bot
    log_info "正在啟動 Bot..."
    npm start
}

# 開發模式啟動
start_dev_mode() {
    log_info "啟動開發模式..."
    
    if [[ ! -f package.json ]]; then
        log_error "找不到 package.json 文件"
        exit 1
    fi
    
    # 檢查是否有 nodemon
    if npm list nodemon &> /dev/null; then
        npm run dev
    else
        log_warning "nodemon 未安裝，使用普通模式啟動"
        npm start
    fi
}

# 測試 Bot 功能
test_bot() {
    log_info "測試 Bot 功能..."
    
    # 這裡可以添加自動化測試
    log_info "請手動測試以下功能："
    echo "  1. 發送 /start 指令"
    echo "  2. 發送 /verify 指令"
    echo "  3. 發送 /status 指令"
    echo "  4. 測試驗證流程"
    
    log_success "請在 Telegram 中測試 Bot 功能"
}

# 顯示幫助信息
show_help() {
    echo "Twin Gate Telegram Bot 部署腳本"
    echo ""
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --help     顯示此幫助信息"
    echo "  -d, --dev      開發模式啟動"
    echo "  -t, --test     僅測試配置，不啟動 Bot"
    echo "  -c, --check    檢查環境和依賴"
    echo ""
    echo "環境變數:"
    echo "  BOT_TOKEN      Telegram Bot Token (必需)"
    echo "  API_BASE_URL   後端 API 基礎 URL (預設: http://localhost:3001)"
    echo "  ADMIN_CHAT_ID  管理員聊天 ID (可選)"
    echo ""
    echo "範例:"
    echo "  $0              # 正常啟動"
    echo "  $0 --dev        # 開發模式啟動"
    echo "  $0 --check      # 僅檢查環境"
}

# 主函數
main() {
    local dev_mode=false
    local test_only=false
    local check_only=false
    
    # 解析命令行參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--dev)
                dev_mode=true
                shift
                ;;
            -t|--test)
                test_only=true
                shift
                ;;
            -c|--check)
                check_only=true
                shift
                ;;
            *)
                log_error "未知選項: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 載入環境變數
    if [[ -f telegram-bot/.env ]]; then
        log_info "載入環境變數..."
        set -a
        source telegram-bot/.env
        set +a
    else
        log_warning "找不到 telegram-bot/.env 文件"
    fi
    
    # 執行檢查
    check_dependencies
    check_env_vars
    validate_bot_token
    install_dependencies
    check_api_connection
    
    if [[ "$check_only" == true ]]; then
        log_success "環境檢查完成，一切正常！"
        exit 0
    fi
    
    if [[ "$test_only" == true ]]; then
        test_bot
        exit 0
    fi
    
    # 啟動 Bot
    if [[ "$dev_mode" == true ]]; then
        start_dev_mode
    else
        start_bot
    fi
}

# 執行主函數
main "$@"
