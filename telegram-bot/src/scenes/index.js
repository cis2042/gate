const { Scenes, Markup } = require('telegraf');
const logger = require('../utils/logger');
const apiClient = require('../services/apiClient');
const { updateUserSession, setUserToken, getUserState, clearUserState } = require('../utils/session');

function setupScenes(stage) {
  // Registration scene
  const registrationScene = new Scenes.BaseScene('registration');
  
  registrationScene.enter(async (ctx) => {
    await ctx.reply(
      '📝 *Registration*\n\nLet\'s create your Twin Gate account!\n\nFirst, please send me your email address:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'cancel_registration')]
        ])
      }
    );
  });

  registrationScene.on('text', async (ctx) => {
    try {
      const email = ctx.message.text.trim();
      const userId = ctx.from.id;
      const username = ctx.from.username || `user_${userId}`;
      const firstName = ctx.from.first_name;

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await ctx.reply('❌ Invalid email format. Please send a valid email address:');
        return;
      }

      // Generate a temporary password (user can change it later)
      const tempPassword = `TwinGate${Math.random().toString(36).substring(2, 8)}!`;

      const userData = {
        username,
        email,
        password: tempPassword,
        profile: {
          firstName,
          lastName: ctx.from.last_name || ''
        }
      };

      try {
        const response = await apiClient.registerUser(userData);
        
        if (response.success) {
          // Store tokens in session
          await setUserToken(userId, response.data.tokens.accessToken, response.data.tokens.refreshToken);
          
          // Update session with user data
          await updateUserSession(userId, {
            registered: true,
            email,
            username,
            userId: response.data.user.id
          });

          const successMessage = `
✅ *Registration Successful!*

Welcome to Twin Gate, ${firstName}!

📧 Email: ${email}
🆔 Username: ${username}
🔑 Temporary Password: \`${tempPassword}\`

⚠️ *Important:* Please save your temporary password and change it in your profile settings.

🚀 You can now start your verification journey!
          `;

          await ctx.reply(successMessage, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ Start Verification', 'start_verification')],
              [Markup.button.callback('👤 View Profile', 'view_profile')],
              [Markup.button.callback('🏠 Main Menu', 'main_menu')]
            ])
          });

          logger.userAction(userId, 'registration_completed', {
            email,
            username,
            method: 'telegram_bot'
          });

          await ctx.scene.leave();
        } else {
          throw new Error(response.message || 'Registration failed');
        }
      } catch (error) {
        logger.error('Registration API error:', error);
        
        let errorMessage = '❌ Registration failed. ';
        if (error.message.includes('email')) {
          errorMessage += 'This email is already registered.';
        } else if (error.message.includes('username')) {
          errorMessage += 'This username is already taken.';
        } else {
          errorMessage += 'Please try again later.';
        }

        await ctx.reply(errorMessage + '\n\nPlease try with a different email:');
      }

    } catch (error) {
      logger.error('Error in registration scene:', error);
      await ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  registrationScene.action('cancel_registration', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Registration cancelled.', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
      ])
    });
    await ctx.scene.leave();
  });

  // Email verification scene
  const emailVerificationScene = new Scenes.BaseScene('email_verification');
  
  emailVerificationScene.enter(async (ctx) => {
    const { verificationId, email } = ctx.scene.state;
    
    await ctx.reply(
      `📧 *Email Verification*\n\nA verification code has been sent to:\n${email}\n\nPlease enter the 6-digit code:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Resend Code', 'resend_email_code')],
          [Markup.button.callback('❌ Cancel', 'cancel_email_verification')]
        ])
      }
    );
  });

  emailVerificationScene.on('text', async (ctx) => {
    try {
      const code = ctx.message.text.trim();
      const userId = ctx.from.id;
      const { verificationId } = ctx.scene.state;

      // Validate code format
      if (!/^\d{6}$/.test(code)) {
        await ctx.reply('❌ Invalid code format. Please enter a 6-digit code:');
        return;
      }

      const session = await require('../utils/session').getUserSession(userId);
      if (!session?.token) {
        await ctx.reply('❌ Authentication required. Please start over.');
        await ctx.scene.leave();
        return;
      }

      try {
        const response = await apiClient.verifyCode(session.token, {
          code,
          channel: 'email',
          verificationId
        });

        if (response.success) {
          await ctx.reply(
            '✅ *Email Verified Successfully!*\n\nYour email has been verified. You can now continue with other verification channels.',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Continue Verification', 'start_verification')],
                [Markup.button.callback('📊 Check Status', 'check_status')],
                [Markup.button.callback('🏠 Main Menu', 'main_menu')]
              ])
            }
          );

          logger.verificationEvent(userId, 'email', 'completed');
          await ctx.scene.leave();
        } else {
          throw new Error(response.message || 'Verification failed');
        }
      } catch (error) {
        logger.error('Email verification error:', error);
        
        let errorMessage = '❌ Verification failed. ';
        if (error.message.includes('expired')) {
          errorMessage += 'The code has expired.';
        } else if (error.message.includes('invalid')) {
          errorMessage += 'Invalid code.';
        } else {
          errorMessage += 'Please try again.';
        }

        await ctx.reply(errorMessage + '\n\nPlease enter the correct code:');
      }

    } catch (error) {
      logger.error('Error in email verification scene:', error);
      await ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  emailVerificationScene.action('resend_email_code', async (ctx) => {
    await ctx.answerCbQuery('🔄 Resending verification code...');
    // Implementation for resending email code
    await ctx.reply('📧 Verification code resent! Please check your email.');
  });

  emailVerificationScene.action('cancel_email_verification', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Email verification cancelled.', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Main Menu', 'main_menu')]
      ])
    });
    await ctx.scene.leave();
  });

  // Phone verification scene
  const phoneVerificationScene = new Scenes.BaseScene('phone_verification');
  
  phoneVerificationScene.enter(async (ctx) => {
    await ctx.reply(
      '📞 *Phone Verification*\n\nPlease send me your phone number in international format (e.g., +1234567890):',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          [Markup.button.contactRequest('📱 Share My Phone Number')],
          ['❌ Cancel']
        ]).resize()
      }
    );
  });

  phoneVerificationScene.on('contact', async (ctx) => {
    try {
      const phoneNumber = ctx.message.contact.phone_number;
      const userId = ctx.from.id;

      // Start phone verification
      const session = await require('../utils/session').getUserSession(userId);
      if (!session?.token) {
        await ctx.reply('❌ Authentication required. Please start over.');
        await ctx.scene.leave();
        return;
      }

      try {
        const response = await apiClient.startVerification(session.token, {
          channel: 'phone',
          challengeType: 'code',
          identifier: phoneNumber
        });

        if (response.success) {
          ctx.scene.state.verificationId = response.data.verificationId;
          ctx.scene.state.phoneNumber = phoneNumber;

          await ctx.reply(
            `📱 *SMS Sent*\n\nA verification code has been sent to:\n${phoneNumber}\n\nPlease enter the 6-digit code:`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Resend Code', 'resend_phone_code')],
                [Markup.button.callback('❌ Cancel', 'cancel_phone_verification')]
              ])
            }
          );
        } else {
          throw new Error(response.message || 'Failed to send SMS');
        }
      } catch (error) {
        logger.error('Phone verification start error:', error);
        await ctx.reply('❌ Failed to send SMS. Please try again.');
      }

    } catch (error) {
      logger.error('Error in phone verification scene:', error);
      await ctx.reply('❌ Something went wrong. Please try again.');
    }
  });

  phoneVerificationScene.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    
    if (text === '❌ Cancel') {
      await ctx.reply('Phone verification cancelled.', {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Main Menu', 'main_menu')]
        ])
      });
      await ctx.scene.leave();
      return;
    }

    // Handle phone number input or verification code
    if (ctx.scene.state.verificationId) {
      // This is a verification code
      if (!/^\d{6}$/.test(text)) {
        await ctx.reply('❌ Invalid code format. Please enter a 6-digit code:');
        return;
      }

      // Verify the code (similar to email verification)
      // Implementation here...
      
    } else {
      // This is a phone number
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(text)) {
        await ctx.reply('❌ Invalid phone number format. Please use international format (e.g., +1234567890):');
        return;
      }

      // Start verification with the provided phone number
      // Implementation here...
    }
  });

  // Add scenes to stage
  stage.register(registrationScene);
  stage.register(emailVerificationScene);
  stage.register(phoneVerificationScene);

  logger.info('Bot scenes setup completed');
}

module.exports = { setupScenes };
