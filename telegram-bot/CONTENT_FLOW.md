# Twin Gate Bot 用戶互動流程文案總結

## 🌍 語言設置
- **默認語言**: 英文 (en-US)
- **支援語言**: 8種語言
- **語言切換**: 隨時可用

## 📋 完整用戶流程文案

### 1. 初始歡迎 (新用戶)
```
🌍 **Welcome to Twin Gate!**

Hello {firstName}! Welcome to the Twin3.ai Human Identity Verification System.

🔐 **Twin Gate** helps you prove your humanity and earn a unique Humanity Index score
🎯 Complete verification to get your exclusive Twin3 SBT (Soul Bound Token)

**Choose an option to get started:**

[🚀 Start Verification] [🌍 Language Settings]
```

### 2. 語言設置界面
```
🌍 **Language Settings**

Please select your preferred language:
請選擇您的語言：

[🇺🇸 English] [🇹🇼 繁體中文]
[🇨🇳 简体中文] [🇯🇵 日本語]
[🇰🇷 한국어] [🇩🇪 Deutsch]
[🇫🇷 Français] [🇷🇺 Русский]

[🔙 Back]
```

### 3. 驗證任務主界面
```
**Task #001**

**Proof of Humanity**

You must prove that you are not a robot to become one of our members. Some robots have become so sophisticated that it's difficult to distinguish them from real humans. The higher the level of human verification tasks you pass, the more likely you are to be human.

Human verification tasks are currently open up to Level 3. You will prove that you are not a robot through verification methods familiar in daily life. This process is only used for identity or device identification and will not retain your personal information.

**Your Current Identity Level:**
⭕ Level 1 - Google reCAPTCHA
⭕ Level 2 - SMS Verification  
⭕ Level 3 - Biometric Authentication

Complete at least Level 2 to get free minting of your DNA NFT.

👇 **Choose verification level to proceed:**

[🟢 Start Level 1 Verification]
[🔒 Level 2 (Complete Level 1 first)]
[🔒 Level 3 (Complete Level 2 first)]
[🏠 Main Menu]
```

### 4. 驗證進行中界面
```
🔐 **Level 1 Verification - Google reCAPTCHA**

✅ Click the link below to start verification:

🔗 [Start Verification](verification_url)

⏰ Verification link expires in: 15 minutes
📱 Please complete verification in the new window and return here to check status

[🚀 Start Verification] [🔄 Check Status] [🔙 Back to Verification Menu]
```

### 5. 驗證成功界面
```
🎉 **Level 1 Verification Successful!**

🎯 Humanity Index: 75/255
📊 Current Level: 1/3

✨ You can now proceed to Level 2 verification!

[🚀 Continue to Level 2] [🏆 Mint SBT] [📊 View Dashboard] [🏠 Main Menu]
```

### 6. 驗證儀表板
```
📊 **Verification Dashboard**

🎯 **Current Status**:
• Verification Level: 1/3
• Humanity Index: 75/255
• SBT Status: ⭕ Not Minted

📈 **Verification Progress**:
✅ Level 1 - Google reCAPTCHA
⭕ Level 2 - SMS Verification
⭕ Level 3 - Biometric Authentication

💡 **Next Step**: Complete Level 2 verification to mint your exclusive SBT

[🎯 Start Level 2] [🏠 Main Menu]
```

### 7. SBT 管理界面
```
🏆 **SBT & Profile Management**

👤 **Profile Information**:
• User ID: 12345
• Verification Level: 2/3
• Humanity Index: 120/255
• Registration Date: 2025-05-28

💎 **SBT Status**: ✅ Minted
• Token ID: #001234
• Mint Date: 2025-05-28
• Blockchain: BNB Smart Chain

🔗 **Links**:
[🔍 View on BNB Scan] [👤 Twin3 Profile Page]
[🔙 Main Menu]
```

### 8. 幫助界面
```
❓ **Twin Gate Bot Help**

🤖 **About Twin3.ai Human Verification**
Twin3.ai is a leading decentralized human identity verification platform that uses multi-level verification technology to help users prove their human identity and obtain unique Humanity Index scores.

🔐 **Twin Gate** is a Telegram verification bot based on Twin3.ai technology, providing:
• Three-level progressive human identity verification
• 0-255 Humanity Index scoring system
• Exclusive SBT (Soul Bound Token) minting
• Complete privacy protection and data security

**Available Commands:**
/verify - 🚀 Start/Check verification status
/sbt - 🏆 View SBT and profile
/help - ❓ Show this help message

**Verification Levels:**
• Level 1 - Google reCAPTCHA
• Level 2 - SMS Verification
• Level 3 - Biometric Authentication

**Getting Started:**
1. Use 🚀 /verify to start verification
2. Complete verification levels in order
3. Mint SBT after completing Level 2
4. Complete Level 3 for maximum Humanity Index

**Support:**
If you need assistance, please contact our support team or check the official documentation.

**Privacy:**
Your data is encrypted and protected. We only store necessary verification information.

[🌐 Twin3.ai Official] [📚 Documentation] [💬 Support Group] [🚀 Start Verification]
```

### 9. 群組歡迎界面
```
👋 **Welcome {firstName}!**

🔐 **Twin Gate Human Identity Verification**

✨ Click the button below to start private verification process
🔒 Verification process is completely confidential and will not be displayed in the group

📊 **Group**: {groupTitle}
🎯 **Source Tracking**: Enabled

[🚀 Start Verification]
```

## 🔄 流程連續性確保

### 關鍵改進點：
1. **英文優先** - 所有界面默認英文，提供8種語言切換
2. **無縫流程** - 每個步驟都有明確的下一步引導
3. **智能按鈕** - 根據用戶狀態動態顯示可用選項
4. **狀態追蹤** - 清晰顯示當前進度和下一步建議
5. **多語言支援** - 完整的i18n系統支援

### 按鈕狀態邏輯：
- 🟢 可進行的等級
- ✅ 已完成的等級  
- 🔒 鎖定的等級（需完成前置條件）
- 🏆 SBT相關功能（Level 2+可用）

## 📊 文案更新狀態

✅ **已完成**:
- 英文語言文件更新
- 默認語言改為英文
- 流程服務文案國際化
- 群組歡迎文案英文化
- 按鈕文字統一

🟡 **進行中**:
- 其他語言文件更新
- 硬編碼文案清理

❌ **待完成**:
- 完整測試所有語言
- 文案一致性檢查
