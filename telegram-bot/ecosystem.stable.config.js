// PM2 生產環境配置 - 穩定版本
module.exports = {
  apps: [{
    name: 'twin-gate-bot-stable',
    script: 'src/bot-stable.js',
    instances: 1,
    exec_mode: 'fork',
    
    // 環境變量
    env: {
      NODE_ENV: 'development',
      BOT_TOKEN: process.env.BOT_TOKEN,
      PORT: 3000
    },
    
    env_production: {
      NODE_ENV: 'production',
      BOT_TOKEN: process.env.BOT_TOKEN,
      PORT: 3000
    },
    
    // 日誌配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 重啟配置
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // 監控配置
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // 其他配置
    autorestart: true,
    merge_logs: true,
    time: true
  }]
};
