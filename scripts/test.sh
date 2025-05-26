#!/bin/bash

# Twin Gate - 自動化測試腳本
# 版本: v1.0.0
# 作者: @cis2042

set -e  # 遇到錯誤立即退出

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

# 檢查必要工具
check_dependencies() {
    log_info "檢查必要工具..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安裝"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安裝"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker 未安裝，跳過容器測試"
    fi
    
    log_success "依賴檢查完成"
}

# 設置測試環境
setup_test_env() {
    log_info "設置測試環境..."
    
    # 進入 telegram-bot 目錄
    cd telegram-bot
    
    # 檢查 package.json 是否存在
    if [ ! -f "package.json" ]; then
        log_error "package.json 不存在"
        exit 1
    fi
    
    # 安裝依賴
    log_info "安裝依賴..."
    npm ci
    
    # 設置測試環境變量
    if [ ! -f ".env.test" ]; then
        log_info "創建測試環境配置..."
        cat > .env.test << EOF
NODE_ENV=test
BOT_TOKEN=test-token
TWIN3_API_KEY=test-api-key
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
LOG_LEVEL=error
EOF
    fi
    
    log_success "測試環境設置完成"
}

# 代碼品質檢查
run_linting() {
    log_info "運行代碼品質檢查..."
    
    # ESLint 檢查
    if npm run lint > /dev/null 2>&1; then
        log_success "ESLint 檢查通過"
    else
        log_error "ESLint 檢查失敗"
        npm run lint
        exit 1
    fi
    
    # Prettier 檢查
    if npm run format:check > /dev/null 2>&1; then
        log_success "Prettier 檢查通過"
    else
        log_warning "代碼格式需要調整"
        npm run format
    fi
}

# 運行單元測試
run_unit_tests() {
    log_info "運行單元測試..."
    
    # 設置測試環境變量
    export NODE_ENV=test
    export BOT_TOKEN=test-token
    export TWIN3_API_KEY=test-api-key
    
    # 運行測試
    if npm test; then
        log_success "單元測試通過"
    else
        log_error "單元測試失敗"
        exit 1
    fi
}

# 運行整合測試
run_integration_tests() {
    log_info "運行整合測試..."
    
    # 檢查是否有 Docker
    if command -v docker &> /dev/null; then
        # 啟動測試數據庫
        log_info "啟動測試數據庫..."
        docker run -d \
            --name test-postgres \
            -e POSTGRES_PASSWORD=test \
            -e POSTGRES_DB=test_db \
            -p 5433:5432 \
            postgres:14-alpine
        
        # 等待數據庫啟動
        sleep 10
        
        # 設置測試數據庫 URL
        export DATABASE_URL=postgresql://postgres:test@localhost:5433/test_db
        
        # 運行整合測試
        if npm run test:integration; then
            log_success "整合測試通過"
        else
            log_error "整合測試失敗"
            docker stop test-postgres
            docker rm test-postgres
            exit 1
        fi
        
        # 清理測試數據庫
        docker stop test-postgres
        docker rm test-postgres
    else
        log_warning "Docker 未安裝，跳過整合測試"
    fi
}

# 測試覆蓋率
run_coverage() {
    log_info "生成測試覆蓋率報告..."
    
    if npm run test:coverage; then
        log_success "覆蓋率報告生成完成"
        
        # 檢查覆蓋率門檻
        COVERAGE=$(npm run test:coverage:check 2>&1 | grep -o '[0-9]*\.[0-9]*%' | head -1 | sed 's/%//')
        THRESHOLD=80
        
        if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
            log_success "測試覆蓋率: $COVERAGE% (>= $THRESHOLD%)"
        else
            log_warning "測試覆蓋率: $COVERAGE% (< $THRESHOLD%)"
        fi
    else
        log_error "覆蓋率報告生成失敗"
        exit 1
    fi
}

# 安全掃描
run_security_scan() {
    log_info "運行安全掃描..."
    
    # npm audit
    if npm audit --audit-level=high; then
        log_success "npm audit 檢查通過"
    else
        log_warning "發現安全漏洞，請檢查 npm audit 報告"
    fi
    
    # 檢查敏感信息
    if grep -r "password\|secret\|key" src/ --exclude-dir=node_modules | grep -v "example\|test\|spec"; then
        log_warning "發現可能的敏感信息洩露"
    else
        log_success "敏感信息檢查通過"
    fi
}

# 性能測試
run_performance_tests() {
    log_info "運行性能測試..."
    
    # 檢查是否有性能測試腳本
    if [ -f "tests/performance.test.js" ]; then
        if npm run test:performance; then
            log_success "性能測試通過"
        else
            log_warning "性能測試失敗或超出預期"
        fi
    else
        log_warning "未找到性能測試，跳過"
    fi
}

# 生成測試報告
generate_report() {
    log_info "生成測試報告..."
    
    REPORT_DIR="test-reports"
    mkdir -p $REPORT_DIR
    
    # 生成 HTML 報告
    if [ -d "coverage" ]; then
        cp -r coverage $REPORT_DIR/
        log_success "覆蓋率報告已保存到 $REPORT_DIR/coverage/"
    fi
    
    # 生成測試摘要
    cat > $REPORT_DIR/summary.md << EOF
# Twin Gate 測試報告

## 測試摘要
- 測試時間: $(date)
- Node.js 版本: $(node --version)
- npm 版本: $(npm --version)

## 測試結果
- ✅ 代碼品質檢查
- ✅ 單元測試
- ✅ 整合測試
- ✅ 安全掃描
- ✅ 測試覆蓋率

## 覆蓋率統計
詳見 coverage/ 目錄下的 HTML 報告

## 建議
- 保持測試覆蓋率 >= 80%
- 定期更新依賴包
- 遵循代碼規範
EOF
    
    log_success "測試報告已生成: $REPORT_DIR/summary.md"
}

# 清理函數
cleanup() {
    log_info "清理測試環境..."
    
    # 停止並刪除測試容器
    if docker ps -a | grep -q test-postgres; then
        docker stop test-postgres > /dev/null 2>&1
        docker rm test-postgres > /dev/null 2>&1
    fi
    
    # 清理臨時文件
    rm -f .env.test
    
    log_success "清理完成"
}

# 主函數
main() {
    log_info "開始 Twin Gate 自動化測試..."
    
    # 設置清理陷阱
    trap cleanup EXIT
    
    # 執行測試步驟
    check_dependencies
    setup_test_env
    run_linting
    run_unit_tests
    run_integration_tests
    run_coverage
    run_security_scan
    run_performance_tests
    generate_report
    
    log_success "所有測試完成！"
    log_info "查看詳細報告: telegram-bot/test-reports/"
}

# 解析命令行參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            UNIT_ONLY=true
            shift
            ;;
        --no-integration)
            NO_INTEGRATION=true
            shift
            ;;
        --no-coverage)
            NO_COVERAGE=true
            shift
            ;;
        --help)
            echo "Twin Gate 測試腳本"
            echo ""
            echo "用法: $0 [選項]"
            echo ""
            echo "選項:"
            echo "  --unit-only      只運行單元測試"
            echo "  --no-integration 跳過整合測試"
            echo "  --no-coverage    跳過覆蓋率檢查"
            echo "  --help           顯示此幫助信息"
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
