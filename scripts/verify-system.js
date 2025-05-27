#!/usr/bin/env node

// Twin Gate 系統驗證腳本
const fs = require('fs');
const path = require('path');

// 顏色定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 檢查項目結構
function checkProjectStructure() {
  logInfo('檢查項目結構...');
  
  const requiredFiles = [
    'package.json',
    'src/bot.js',
    'src/locales/index.js',
    'src/locales/zh-TW.json',
    'src/locales/en-US.json',
    'src/utils/logger.js',
    'src/utils/keyboards.js',
    'src/callbacks/index.js',
    'src/commands/index.js'
  ];
  
  const requiredDirs = [
    'src',
    'src/locales',
    'src/utils',
    'src/callbacks',
    'src/commands',
    'src/services'
  ];
  
  let allFilesExist = true;
  let allDirsExist = true;
  
  // 檢查目錄
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      logSuccess(`目錄存在: ${dir}`);
    } else {
      logError(`目錄缺失: ${dir}`);
      allDirsExist = false;
    }
  });
  
  // 檢查文件
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`文件存在: ${file}`);
    } else {
      logError(`文件缺失: ${file}`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist && allDirsExist;
}

// 檢查 package.json
function checkPackageJson() {
  logInfo('檢查 package.json...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // 檢查必要字段
    const requiredFields = ['name', 'version', 'main', 'scripts', 'dependencies'];
    let allFieldsExist = true;
    
    requiredFields.forEach(field => {
      if (packageJson[field]) {
        logSuccess(`package.json 包含: ${field}`);
      } else {
        logError(`package.json 缺失: ${field}`);
        allFieldsExist = false;
      }
    });
    
    // 檢查必要依賴
    const requiredDeps = ['telegraf', 'axios', 'dotenv', 'winston'];
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`依賴存在: ${dep}`);
      } else {
        logError(`依賴缺失: ${dep}`);
        allFieldsExist = false;
      }
    });
    
    // 檢查腳本
    const requiredScripts = ['start'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`腳本存在: ${script}`);
      } else {
        logError(`腳本缺失: ${script}`);
        allFieldsExist = false;
      }
    });
    
    return allFieldsExist;
  } catch (error) {
    logError(`無法讀取 package.json: ${error.message}`);
    return false;
  }
}

// 檢查環境變量配置
function checkEnvConfig() {
  logInfo('檢查環境變量配置...');
  
  if (fs.existsSync('.env.example')) {
    logSuccess('環境變量範例文件存在: .env.example');
    
    try {
      const envExample = fs.readFileSync('.env.example', 'utf8');
      const requiredEnvVars = ['BOT_TOKEN', 'TWIN3_API_KEY', 'NODE_ENV'];
      
      let allVarsExist = true;
      requiredEnvVars.forEach(envVar => {
        if (envExample.includes(envVar)) {
          logSuccess(`環境變量範例包含: ${envVar}`);
        } else {
          logError(`環境變量範例缺失: ${envVar}`);
          allVarsExist = false;
        }
      });
      
      return allVarsExist;
    } catch (error) {
      logError(`無法讀取 .env.example: ${error.message}`);
      return false;
    }
  } else {
    logError('環境變量範例文件不存在: .env.example');
    return false;
  }
}

// 檢查多語言文件
function checkLocales() {
  logInfo('檢查多語言文件...');
  
  const localeFiles = [
    'src/locales/zh-TW.json',
    'src/locales/en-US.json',
    'src/locales/ko-KR.json',
    'src/locales/ja-JP.json'
  ];
  
  let allLocalesValid = true;
  
  localeFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const localeData = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        // 檢查必要的翻譯鍵
        const requiredKeys = ['welcome', 'buttons', 'menu'];
        let hasRequiredKeys = true;
        
        requiredKeys.forEach(key => {
          if (localeData[key]) {
            logSuccess(`${file} 包含翻譯鍵: ${key}`);
          } else {
            logError(`${file} 缺失翻譯鍵: ${key}`);
            hasRequiredKeys = false;
          }
        });
        
        if (hasRequiredKeys) {
          logSuccess(`多語言文件有效: ${file}`);
        } else {
          allLocalesValid = false;
        }
      } catch (error) {
        logError(`無法解析多語言文件 ${file}: ${error.message}`);
        allLocalesValid = false;
      }
    } else {
      logError(`多語言文件不存在: ${file}`);
      allLocalesValid = false;
    }
  });
  
  return allLocalesValid;
}

// 檢查 Node.js 模塊
function checkNodeModules() {
  logInfo('檢查 Node.js 模塊...');
  
  try {
    // 測試基本模塊載入
    require('fs');
    require('path');
    logSuccess('Node.js 核心模塊正常');
    
    // 測試已安裝的依賴
    if (fs.existsSync('node_modules')) {
      logSuccess('node_modules 目錄存在');
      
      const testModules = ['telegraf', 'axios', 'dotenv', 'winston'];
      let allModulesWork = true;
      
      testModules.forEach(module => {
        try {
          require(module);
          logSuccess(`模塊載入成功: ${module}`);
        } catch (error) {
          logError(`模塊載入失敗: ${module} - ${error.message}`);
          allModulesWork = false;
        }
      });
      
      return allModulesWork;
    } else {
      logError('node_modules 目錄不存在，請運行 npm install');
      return false;
    }
  } catch (error) {
    logError(`Node.js 模塊檢查失敗: ${error.message}`);
    return false;
  }
}

// 檢查 Bot 配置
function checkBotConfig() {
  logInfo('檢查 Bot 配置...');
  
  try {
    // 設置測試環境變量
    process.env.NODE_ENV = 'test';
    process.env.BOT_TOKEN = 'test-token';
    process.env.TWIN3_API_KEY = 'test-api-key';
    
    // 測試多語言系統
    if (fs.existsSync('src/locales/index.js')) {
      const { t } = require('./src/locales');
      
      // 測試翻譯功能
      const zhMessage = t('welcome.title', 'zh-TW');
      const enMessage = t('welcome.title', 'en-US');
      
      if (zhMessage && enMessage) {
        logSuccess('多語言翻譯系統正常');
        return true;
      } else {
        logError('多語言翻譯系統異常');
        return false;
      }
    } else {
      logError('多語言系統文件不存在');
      return false;
    }
  } catch (error) {
    logError(`Bot 配置檢查失敗: ${error.message}`);
    return false;
  }
}

// 生成系統報告
function generateReport(results) {
  logInfo('生成系統驗證報告...');
  
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total: Object.keys(results).length,
      passed: Object.values(results).filter(r => r).length,
      failed: Object.values(results).filter(r => !r).length
    }
  };
  
  const reportContent = `# Twin Gate 系統驗證報告

## 驗證時間
${report.timestamp}

## 驗證結果摘要
- 總檢查項目: ${report.summary.total}
- 通過項目: ${report.summary.passed}
- 失敗項目: ${report.summary.failed}
- 成功率: ${Math.round((report.summary.passed / report.summary.total) * 100)}%

## 詳細結果
${Object.entries(results).map(([test, result]) => 
  `- ${result ? '✅' : '❌'} ${test}`
).join('\n')}

## 建議
${report.summary.failed > 0 ? 
  '⚠️ 發現問題，請檢查失敗的項目並修復後重新驗證。' : 
  '🎉 所有檢查項目都通過了！系統準備就緒。'
}

---
Generated by Twin Gate System Verification Script
`;
  
  try {
    fs.writeFileSync('system-verification-report.md', reportContent);
    logSuccess('系統驗證報告已生成: system-verification-report.md');
  } catch (error) {
    logWarning(`無法生成報告文件: ${error.message}`);
  }
  
  return report;
}

// 主函數
function main() {
  log('🚀 Twin Gate 系統驗證開始...', 'blue');
  log('', 'reset');
  
  const results = {
    '項目結構': checkProjectStructure(),
    'Package.json': checkPackageJson(),
    '環境變量配置': checkEnvConfig(),
    '多語言文件': checkLocales(),
    'Node.js 模塊': checkNodeModules(),
    'Bot 配置': checkBotConfig()
  };
  
  log('', 'reset');
  log('📊 驗證結果摘要:', 'blue');
  
  Object.entries(results).forEach(([test, result]) => {
    if (result) {
      logSuccess(`${test}: 通過`);
    } else {
      logError(`${test}: 失敗`);
    }
  });
  
  const report = generateReport(results);
  
  log('', 'reset');
  if (report.summary.failed === 0) {
    log('🎉 所有檢查項目都通過了！Twin Gate 系統準備就緒。', 'green');
    process.exit(0);
  } else {
    log(`⚠️ 發現 ${report.summary.failed} 個問題，請檢查並修復。`, 'yellow');
    process.exit(1);
  }
}

// 運行主函數
if (require.main === module) {
  main();
}

module.exports = {
  checkProjectStructure,
  checkPackageJson,
  checkEnvConfig,
  checkLocales,
  checkNodeModules,
  checkBotConfig,
  generateReport
};
