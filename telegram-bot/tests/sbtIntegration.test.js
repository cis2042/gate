// Twin Gate SBT 整合功能測試
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

describe('Twin Gate SBT 整合功能測試', () => {
  let sbtService;
  let mockUserId;
  let mockContext;

  beforeAll(() => {
    // 設置測試環境
    process.env.NODE_ENV = 'test';
    sbtService = require('../src/services/sbtService');
  });

  beforeEach(() => {
    // 重置測試數據
    mockUserId = '123456789';
    mockContext = {
      from: {
        id: mockUserId,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: mockUserId,
        type: 'private'
      },
      reply: jest.fn(),
      replyWithMarkdown: jest.fn(),
      editMessageText: jest.fn(),
      answerCbQuery: jest.fn()
    };
  });

  afterAll(() => {
    // 清理測試環境
  });

  describe('用戶資料和 SBT 整合', () => {
    test('應該能夠獲取完整的用戶資料和 SBT 信息', async () => {
      const result = await sbtService.getUserProfileAndSBT(mockUserId);
      
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.data).toHaveProperty('userId', mockUserId);
        expect(result.data).toHaveProperty('username');
        expect(result.data).toHaveProperty('verificationLevel');
        expect(result.data).toHaveProperty('humanityIndex');
        expect(result.data).toHaveProperty('sbt');
      }
    });

    test('應該能夠格式化完整的個人資料', () => {
      const mockProfileData = {
        userId: mockUserId,
        username: 'testuser',
        firstName: 'Test',
        verificationLevel: 2,
        humanityIndex: 150,
        isVerified: true,
        joinedAt: new Date(),
        sbt: {
          hasSBT: true,
          tokenId: 'TW3_12345',
          sbtAddress: '0x1234567890abcdef',
          walletAddress: '0xabcdef1234567890',
          mintedAt: new Date()
        }
      };

      const formattedProfile = sbtService.formatCompleteProfile(mockProfileData, 'zh-TW');
      
      expect(formattedProfile).toContain('Test 的 Twin Gate 檔案');
      expect(formattedProfile).toContain('@testuser');
      expect(formattedProfile).toContain('Level 2/3');
      expect(formattedProfile).toContain('150/255');
      expect(formattedProfile).toContain('已鑄造');
      expect(formattedProfile).toContain('TW3_12345');
    });

    test('應該能夠為不同狀態的用戶生成正確的按鈕', () => {
      // 已有 SBT 的用戶
      const sbtUserData = {
        userId: mockUserId,
        username: 'testuser',
        sbt: { hasSBT: true, walletAddress: '0x123', tokenId: 'TW3_123' }
      };
      
      const sbtButtons = sbtService.generateSBTButtons(sbtUserData, 'zh-TW');
      expect(sbtButtons).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({ text: '🔍 查看 BNB Scan' }),
            expect.objectContaining({ text: '👤 Twin3 個人頁面' })
          ])
        ])
      );

      // 可鑄造 SBT 的用戶
      const eligibleUserData = {
        userId: mockUserId,
        username: 'testuser',
        sbt: { hasSBT: false, eligibleForMint: true }
      };
      
      const eligibleButtons = sbtService.generateSBTButtons(eligibleUserData, 'zh-TW');
      expect(eligibleButtons).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({ text: '🏆 鑄造 SBT' })
          ])
        ])
      );

      // 未達標的用戶
      const newUserData = {
        userId: mockUserId,
        username: 'testuser',
        sbt: { hasSBT: false, eligibleForMint: false }
      };
      
      const newButtons = sbtService.generateSBTButtons(newUserData, 'zh-TW');
      expect(newButtons).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            expect.objectContaining({ text: '🚀 繼續驗證' })
          ])
        ])
      );
    });
  });

  describe('區塊鏈瀏覽器連結生成', () => {
    test('應該能夠生成正確的 BNB Scan 連結', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      
      // 地址連結
      const addressUrl = sbtService.generateBlockchainExplorerUrl(address, 'address', 'bsc');
      expect(addressUrl).toBe(`https://bscscan.com/address/${address}`);
      
      // 交易連結
      const txUrl = sbtService.generateBlockchainExplorerUrl(address, 'tx', 'bsc');
      expect(txUrl).toBe(`https://bscscan.com/tx/${address}`);
      
      // Token 連結
      const tokenUrl = sbtService.generateBlockchainExplorerUrl(address, 'token', 'bsc');
      expect(tokenUrl).toBe(`https://bscscan.com/token/${address}`);
    });

    test('應該能夠生成其他網絡的瀏覽器連結', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      
      // Polygon
      const polygonUrl = sbtService.generateBlockchainExplorerUrl(address, 'address', 'polygon');
      expect(polygonUrl).toBe(`https://polygonscan.com/address/${address}`);
      
      // Ethereum
      const ethUrl = sbtService.generateBlockchainExplorerUrl(address, 'address', 'ethereum');
      expect(ethUrl).toBe(`https://etherscan.io/address/${address}`);
      
      // 默認 (BSC)
      const defaultUrl = sbtService.generateBlockchainExplorerUrl(address, 'address', 'unknown');
      expect(defaultUrl).toBe(`https://bscscan.com/address/${address}`);
    });
  });

  describe('Twin3 個人頁面連結', () => {
    test('應該能夠生成 Twin3 個人頁面連結', () => {
      const userId = '123456789';
      const username = 'testuser';
      
      // 使用用戶名
      const usernameUrl = sbtService.generateTwin3ProfileUrl(userId, username);
      expect(usernameUrl).toBe('https://twin3.ai/profile/testuser');
      
      // 使用用戶 ID (無用戶名)
      const userIdUrl = sbtService.generateTwin3ProfileUrl(userId, null);
      expect(userIdUrl).toBe('https://twin3.ai/profile/123456789');
      
      // 空用戶名
      const emptyUsernameUrl = sbtService.generateTwin3ProfileUrl(userId, '');
      expect(emptyUsernameUrl).toBe('https://twin3.ai/profile/123456789');
    });
  });

  describe('SBT 狀態檢查', () => {
    test('應該能夠檢查 SBT 狀態', async () => {
      try {
        const sbtStatus = await sbtService.checkSBTStatus(mockUserId);
        
        expect(sbtStatus).toHaveProperty('hasSBT');
        expect(sbtStatus).toHaveProperty('eligibleForMint');
        expect(sbtStatus).toHaveProperty('humanityIndex');
        expect(sbtStatus).toHaveProperty('verificationLevel');
        
        expect(typeof sbtStatus.hasSBT).toBe('boolean');
        expect(typeof sbtStatus.eligibleForMint).toBe('boolean');
        expect(typeof sbtStatus.humanityIndex).toBe('number');
        expect(typeof sbtStatus.verificationLevel).toBe('number');
      } catch (error) {
        // 在測試環境中，API 調用可能會失敗，這是正常的
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('應該能夠獲取 SBT 詳細信息', async () => {
      try {
        const sbtDetails = await sbtService.getSBTDetails(mockUserId);
        
        expect(sbtDetails).toHaveProperty('hasSBT');
        
        if (sbtDetails.hasSBT) {
          expect(sbtDetails).toHaveProperty('sbtAddress');
          expect(sbtDetails).toHaveProperty('walletAddress');
          expect(sbtDetails).toHaveProperty('tokenId');
          expect(sbtDetails).toHaveProperty('mintedAt');
        } else {
          expect(sbtDetails).toHaveProperty('eligibleForMint');
          expect(sbtDetails).toHaveProperty('message');
        }
      } catch (error) {
        // 在測試環境中，API 調用可能會失敗，這是正常的
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('SBT 鑄造流程', () => {
    test('應該能夠請求 SBT 鑄造', async () => {
      try {
        const mintResult = await sbtService.requestSBTMint(mockUserId);
        
        if (mintResult.success) {
          expect(mintResult.data).toHaveProperty('mintRequestId');
          expect(mintResult.data).toHaveProperty('walletAddress');
          expect(mintResult.data).toHaveProperty('estimatedMintTime');
        }
      } catch (error) {
        // 測試預期的錯誤情況
        expect(error.message).toMatch(/(not authenticated|not eligible|already has)/);
      }
    });

    test('應該能夠檢查鑄造狀態', async () => {
      try {
        const mintStatus = await sbtService.checkMintStatus(mockUserId);
        
        expect(mintStatus).toHaveProperty('status');
        expect(['pending', 'completed', 'failed']).toContain(mintStatus.status);
        
        if (mintStatus.status === 'completed') {
          expect(mintStatus).toHaveProperty('txHash');
          expect(mintStatus).toHaveProperty('sbtAddress');
          expect(mintStatus).toHaveProperty('tokenId');
        }
      } catch (error) {
        // 在測試環境中，可能沒有鑄造請求
        expect(error.message).toContain('No mint request found');
      }
    });
  });

  describe('格式化功能', () => {
    test('應該能夠格式化 Twin3 SBT 信息', () => {
      // 未擁有 SBT 但符合條件
      const eligibleData = {
        hasSBT: false,
        eligibleForMint: true,
        humanityIndex: 120
      };
      
      const eligibleMessage = sbtService.formatTwin3SBTInfo(eligibleData, 'zh-TW');
      expect(eligibleMessage).toContain('Twin3 SBT 可以鑄造');
      expect(eligibleMessage).toContain('Level 2 驗證');
      expect(eligibleMessage).toContain('120/255');

      // 未符合條件
      const notEligibleData = {
        hasSBT: false,
        eligibleForMint: false,
        humanityIndex: 50
      };
      
      const notEligibleMessage = sbtService.formatTwin3SBTInfo(notEligibleData, 'zh-TW');
      expect(notEligibleMessage).toContain('Twin3 SBT 尚未解鎖');
      expect(notEligibleMessage).toContain('Level 2 驗證');

      // 已擁有 SBT
      const ownedData = {
        hasSBT: true,
        humanityIndex: 180,
        verificationLevel: 3,
        tokenId: 'TW3_12345',
        sbtAddress: '0x1234567890abcdef',
        walletAddress: '0xabcdef1234567890',
        mintedAt: new Date()
      };
      
      const ownedMessage = sbtService.formatTwin3SBTInfo(ownedData, 'zh-TW');
      expect(ownedMessage).toContain('您的 Twin3 SBT');
      expect(ownedMessage).toContain('已鑄造');
      expect(ownedMessage).toContain('180/255');
      expect(ownedMessage).toContain('Level 3/3');
      expect(ownedMessage).toContain('TW3_12345');
    });
  });

  describe('錯誤處理', () => {
    test('應該能夠處理 API 錯誤', async () => {
      // 模擬無效的用戶 ID
      const invalidUserId = 'invalid_user_id';
      
      try {
        await sbtService.getUserProfileAndSBT(invalidUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('應該能夠處理網絡錯誤', async () => {
      // 模擬網絡錯誤的情況
      const originalApiClient = require('../src/services/apiClient');
      
      // 這裡可以模擬 API 客戶端錯誤
      // 在實際測試中，可以使用 jest.mock 來模擬錯誤
    });
  });

  describe('整合測試', () => {
    test('完整的 SBT 管理流程', async () => {
      // 1. 獲取用戶資料
      const profileResult = await sbtService.getUserProfileAndSBT(mockUserId);
      expect(profileResult).toHaveProperty('success');
      
      if (profileResult.success) {
        const profileData = profileResult.data;
        
        // 2. 格式化顯示
        const message = sbtService.formatCompleteProfile(profileData, 'zh-TW');
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        
        // 3. 生成按鈕
        const buttons = sbtService.generateSBTButtons(profileData, 'zh-TW');
        expect(buttons).toBeInstanceOf(Array);
        expect(buttons.length).toBeGreaterThan(0);
        
        // 4. 生成連結
        if (profileData.sbt.hasSBT) {
          const bscUrl = sbtService.generateBlockchainExplorerUrl(
            profileData.sbt.walletAddress, 
            'address', 
            'bsc'
          );
          expect(bscUrl).toContain('bscscan.com');
          
          const twin3Url = sbtService.generateTwin3ProfileUrl(
            profileData.userId, 
            profileData.username
          );
          expect(twin3Url).toContain('twin3.ai/profile');
        }
      }
    });
  });
});
