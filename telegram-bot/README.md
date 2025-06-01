# Twin Gate Telegram Bot

Twin Gate 多渠道人類驗證平台的全面 Telegram 機器人。此機器人讓使用者能夠直接通過 Telegram 完成身份驗證、管理個人資料，並鑄造靈魂綁定代幣（SBT）。

## 🎉 穩定版本狀態

✅ **當前版本正常運行** - 語言一致性問題已完全解決

### 📋 版本信息
- **穩定版本**: 1.0.0-stable
- **部署狀態**: 生產環境運行中 ✅
- **Bot 用戶名**: [@twin3bot](https://t.me/twin3bot)
- **服務器**: Google Compute Engine (34.80.77.23)
- **健康檢查**: http://34.80.77.23/health

### 🚀 快速測試
1. 開啟 Telegram → 搜尋 [@twin3bot](https://t.me/twin3bot)
2. 發送 `/start` → 語言選擇界面
3. 選擇語言 → 歡迎界面 (語言一致)
4. 開始驗證 → 3級驗證流程

### 📁 穩定版本文件
- **主要文件**: `src/bot-stable.js` ⭐ (推薦使用)
- **配置文件**: `ecosystem.stable.config.js`
- **部署說明**: [STABLE-DEPLOYMENT.md](./STABLE-DEPLOYMENT.md)

## 🚀 功能特色

### 核心功能
- **使用者註冊與認證** - 無縫的帳戶創建和登入
- **多渠道驗證** - 支援 Twitter、Discord、GitHub、Email、Phone 和 KYC
- **即時狀態追蹤** - 監控驗證進度和分數
- **SBT 管理** - 查看和鑄造靈魂綁定代幣
- **個人資料管理** - 更新使用者資訊和偏好設定

### Bot Capabilities
- **Interactive Commands** - Full command-based interface
- **Inline Mode** - Share verification status and invite others
- **Callback Handlers** - Rich interactive button responses
- **Scene Management** - Multi-step verification flows
- **Session Management** - Persistent user state across interactions
- **Error Handling** - Comprehensive error recovery and user feedback

### Security & Performance
- **Rate Limiting** - Prevent spam and abuse
- **Input Validation** - Secure handling of user data
- **Logging & Analytics** - Comprehensive activity tracking
- **Error Recovery** - Graceful handling of API failures
- **Session Security** - Secure token management

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Twin Gate API server running
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Setup Steps

1. **Clone and Install**
   ```bash
   cd telegram-bot
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Configure Bot Token**
   - Create a bot with [@BotFather](https://t.me/botfather)
   - Get your bot token
   - Add token to `.env` file

4. **Start the Bot**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## ⚙️ Configuration

### Required Environment Variables

```env
# Bot Configuration
BOT_TOKEN=your-telegram-bot-token
BOT_USERNAME=YourBotUsername

# API Configuration
API_BASE_URL=http://localhost:3001/api/v1
API_TIMEOUT=30000

# Features
ENABLE_INLINE_MODE=true
ENABLE_WEBHOOK=false
```

### Optional Configuration

```env
# Database (for bot-specific data)
REDIS_URL=redis://localhost:6379

# Security
WEBHOOK_SECRET=your-webhook-secret
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=20

# Admin
ADMIN_USER_IDS=123456789,987654321
SUPPORT_CHAT_ID=-1001234567890

# Analytics
ANALYTICS_ENABLED=false
```

## 🤖 Bot Commands

### User Commands
- `/start` - Start verification journey
- `/verify` - Begin verification process
- `/status` - Check verification status
- `/profile` - View user profile
- `/sbt` - View SBT information
- `/channels` - Available verification channels
- `/help` - Get help and support
- `/settings` - Bot settings

### Admin Commands (for admin users)
- `/admin` - Admin dashboard
- `/stats` - Bot statistics
- `/broadcast` - Send broadcast message

## 📱 Usage Examples

### Starting Verification
```
User: /start
Bot: 🚪 Welcome to Twin Gate!
     Choose an option below...
     [Start Verification] [Check Status]
```

### Checking Status
```
User: /status
Bot: 📊 Your Verification Status
     ⭐ Score: 45/100
     ✅ Completed: 3/7 channels
     [Continue Verification] [View Details]
```

### Inline Mode
```
@YourBot status
→ Shows verification status inline

@YourBot share
→ Shows invitation message
```

## 🔧 Development

### Project Structure
```
src/
├── bot.js              # Main bot application
├── commands/           # Command handlers
├── callbacks/          # Callback query handlers
├── scenes/            # Multi-step conversation flows
├── middlewares/       # Bot middlewares
├── inline/            # Inline mode handlers
├── services/          # External API clients
└── utils/             # Utility functions
```

### Adding New Commands

1. **Create Command Handler**
   ```javascript
   // In src/commands/index.js
   bot.command('newcommand', async (ctx) => {
     await ctx.reply('New command response');
   });
   ```

2. **Add to Bot Commands List**
   ```javascript
   // In src/bot.js setBotCommands()
   { command: 'newcommand', description: 'Description' }
   ```

### Adding New Verification Channels

1. **Update Channel List**
   ```javascript
   // In src/callbacks/index.js
   const channels = ['twitter', 'discord', 'newchannel'];
   ```

2. **Add Channel Handler**
   ```javascript
   bot.action('verify_newchannel', async (ctx) => {
     // Handle new channel verification
   });
   ```

3. **Update Formatters**
   ```javascript
   // In src/utils/formatters.js
   function getChannelEmoji(channel) {
     const emojis = {
       // ...existing channels
       newchannel: '🆕'
     };
   }
   ```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Manual Testing
1. Start the bot in development mode
2. Send `/start` to your bot
3. Test each command and flow
4. Verify error handling

## 📊 Monitoring

### Logging
- All user interactions are logged
- API calls are tracked with timing
- Errors are logged with context
- Security events are monitored

### Analytics
- User activity tracking
- Command usage statistics
- Verification completion rates
- Error frequency monitoring

### Health Checks
```bash
# Check bot status
curl http://localhost:3000/health

# Get bot statistics
curl http://localhost:3000/stats
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   LOG_LEVEL=info
   ENABLE_WEBHOOK=true
   WEBHOOK_URL=https://yourdomain.com/webhook
   ```

2. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start src/bot.js --name twin-gate-bot
   pm2 save
   pm2 startup
   ```

3. **Webhook Setup**
   ```bash
   # Set webhook URL
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://yourdomain.com/webhook"}'
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t twin-gate-bot .
docker run -d --env-file .env -p 3000:3000 twin-gate-bot
```

## 🔐 Security

### Best Practices
- Store sensitive data in environment variables
- Validate all user inputs
- Implement rate limiting
- Monitor for suspicious activity
- Use HTTPS for webhooks
- Regularly rotate bot tokens

### Rate Limiting
- 20 requests per minute per user
- Automatic blocking of spam
- Graceful error messages

### Data Protection
- No sensitive data stored locally
- Secure API communication
- Session data encryption
- GDPR compliance features

## 🆘 Troubleshooting

### Common Issues

**Bot not responding**
- Check bot token validity
- Verify API server is running
- Check network connectivity

**Verification failing**
- Verify API endpoints are accessible
- Check authentication tokens
- Review error logs

**Webhook issues**
- Ensure HTTPS is properly configured
- Verify webhook URL is accessible
- Check webhook secret

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

### Support
- Check logs in `./logs/` directory
- Review error messages in console
- Contact support team for assistance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

---

**Twin Gate Telegram Bot** - Bringing human verification to Telegram 🤖✨
