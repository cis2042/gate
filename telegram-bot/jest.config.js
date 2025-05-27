module.exports = {
  // 測試環境
  testEnvironment: 'node',
  
  // 測試文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // 覆蓋率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // 覆蓋率報告
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 覆蓋率門檻
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // 設置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 模塊路徑映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 測試超時
  testTimeout: 10000,
  
  // 詳細輸出
  verbose: true,
  
  // 清除模擬
  clearMocks: true,
  
  // 強制退出
  forceExit: true,
  
  // 檢測打開的句柄
  detectOpenHandles: true
};
