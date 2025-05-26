const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      // Create transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        logger.info('📧 Email service initialized successfully');
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      this.initialized = false;
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      const mailOptions = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}`, {
        messageId: result.messageId,
        subject
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendVerificationEmail(email, username, verificationCode) {
    const subject = 'Twin Gate - Email Verification';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #667eea; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚪 Twin Gate</h1>
            <h2>Email Verification</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>Thank you for registering with Twin Gate! To complete your email verification, please use the verification code below:</p>
            
            <div class="code">${verificationCode}</div>
            
            <p>This code will expire in 10 minutes for security reasons.</p>
            
            <p>If you didn't request this verification, please ignore this email.</p>
            
            <p>Best regards,<br>The Twin Gate Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2024 Twin Gate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }

  async sendWelcomeEmail(email, username) {
    const subject = 'Welcome to Twin Gate!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Twin Gate</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚪 Welcome to Twin Gate!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>Welcome to Twin Gate - the future of human verification! We're excited to have you join our community.</p>
            
            <h3>🎯 What you can do with Twin Gate:</h3>
            
            <div class="feature">
              <strong>🔐 Multi-Channel Verification</strong><br>
              Verify your identity through Twitter, Discord, GitHub, and more!
            </div>
            
            <div class="feature">
              <strong>🏆 Earn Your SBT</strong><br>
              Complete verifications to mint your Soul Bound Token (SBT)
            </div>
            
            <div class="feature">
              <strong>🌟 Build Your Reputation</strong><br>
              Increase your verification score and unlock exclusive benefits
            </div>
            
            <div class="feature">
              <strong>🚀 Future-Ready</strong><br>
              Be part of the next generation of digital identity
            </div>
            
            <p>Ready to get started? Begin your verification journey today!</p>
            
            <a href="${process.env.FRONTEND_URL || 'https://twingate.com'}/dashboard" class="button">Start Verifying →</a>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>The Twin Gate Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2024 Twin Gate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email, username, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'https://twingate.com'}/reset-password?token=${resetToken}`;
    const subject = 'Twin Gate - Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚪 Twin Gate</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>We received a request to reset your password for your Twin Gate account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              This link will expire in 1 hour for security reasons. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>Best regards,<br>The Twin Gate Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2024 Twin Gate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }

  async sendSBTMintedEmail(email, username, tokenId, metadata) {
    const subject = 'Congratulations! Your Twin Gate SBT has been minted! 🎉';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>SBT Minted Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .sbt-card { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .achievement { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <h2>Your SBT has been minted!</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>Fantastic news! Your Twin Gate Soul Bound Token (SBT) has been successfully minted on the blockchain.</p>
            
            <div class="sbt-card">
              <h3>🏆 ${metadata.name}</h3>
              <p><strong>Token ID:</strong> ${tokenId}</p>
              <p><strong>Verification Level:</strong> ${metadata.verificationData?.verificationLevel || 'Bronze'}</p>
              <p><strong>Verification Score:</strong> ${metadata.verificationData?.verificationScore || 0}/100</p>
            </div>
            
            <div class="achievement">
              <strong>🌟 Achievement Unlocked!</strong><br>
              You are now a verified human on the Twin Gate platform with a permanent, non-transferable proof of your identity.
            </div>
            
            <p><strong>What this means for you:</strong></p>
            <ul>
              <li>✅ Verified human status on Twin Gate</li>
              <li>🔐 Enhanced security and trust</li>
              <li>🎁 Access to exclusive features and benefits</li>
              <li>🚀 Ready for the future of digital identity</li>
            </ul>
            
            <a href="${process.env.FRONTEND_URL || 'https://twingate.com'}/profile" class="button">View Your SBT →</a>
            
            <p>Thank you for being part of the Twin Gate community!</p>
            
            <p>Best regards,<br>The Twin Gate Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2024 Twin Gate. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }

  // Utility method to strip HTML tags
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
