#!/bin/bash

# Twin Gate Telegram Bot 快速啟動腳本
# 使用方法: ./start-telegram-bot.sh

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🤖 Twin Gate Telegram Bot 啟動器${NC}"
echo "=================================="

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安裝${NC}"
    exit 1
fi

# 檢查環境變數文件
if [[ ! -f telegram-bot/.env ]]; then
    echo -e "${YELLOW}⚠️ 環境變數文件不存在，正在創建...${NC}"
    cp telegram-bot/.env.example telegram-bot/.env
    echo -e "${YELLOW}請編輯 telegram-bot/.env 文件並設定您的 Bot Token${NC}"
    echo "然後重新運行此腳本"
    exit 1
fi

# 載入環境變數
source telegram-bot/.env

# 檢查 Bot Token
if [[ -z "$BOT_TOKEN" || "$BOT_TOKEN" == "your-telegram-bot-token-here" ]]; then
    echo -e "${RED}❌ 請在 telegram-bot/.env 中設定有效的 BOT_TOKEN${NC}"
    exit 1
fi

# 安裝依賴
echo -e "${GREEN}📦 安裝依賴...${NC}"
cd telegram-bot
npm install

# 運行測試
echo -e "${GREEN}🧪 運行測試...${NC}"
if node ../scripts/test-telegram-bot.js; then
    echo -e "${GREEN}✅ 測試通過${NC}"
else
    echo -e "${YELLOW}⚠️ 部分測試失敗，但仍可嘗試啟動 Bot${NC}"
fi

# 啟動 Bot
echo -e "${GREEN}🚀 啟動 Telegram Bot...${NC}"
echo "按 Ctrl+C 停止 Bot"
echo "=================================="

npm start
