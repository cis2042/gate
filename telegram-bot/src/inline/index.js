const { Markup } = require('telegraf');
const logger = require('../utils/logger');
const apiClient = require('../services/apiClient');
const { getUserSession } = require('../utils/session');

function setupInlineMode(bot) {
  // Handle inline queries
  bot.on('inline_query', async (ctx) => {
    try {
      const query = ctx.inlineQuery.query.toLowerCase().trim();
      const userId = ctx.from.id;
      
      logger.userAction(userId, 'inline_query', { query });

      const results = [];

      // Get user session to check authentication
      const session = await getUserSession(userId);
      const isAuthenticated = !!session?.token;

      if (!isAuthenticated) {
        // Show registration option for unauthenticated users
        results.push({
          type: 'article',
          id: 'register',
          title: '🚪 Join Twin Gate',
          description: 'Register for Twin Gate verification platform',
          input_message_content: {
            message_text: '🚪 *Welcome to Twin Gate!*\n\nClick the button below to start your verification journey.',
            parse_mode: 'Markdown'
          },
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.url('🚀 Start Verification', `https://t.me/${process.env.BOT_USERNAME}?start=register`)]
          ])
        });
      } else {
        // Show different options based on query
        if (query === '' || query.includes('status')) {
          // Show verification status
          try {
            const statusResponse = await apiClient.getVerificationStatus(session.token);
            if (statusResponse.success) {
              const { totalScore, completedVerifications, totalVerifications } = statusResponse.data;
              
              results.push({
                type: 'article',
                id: 'status',
                title: '📊 My Verification Status',
                description: `Score: ${totalScore}/100 | Completed: ${completedVerifications}/${totalVerifications}`,
                input_message_content: {
                  message_text: `📊 *My Verification Status*\n\n⭐ Score: ${totalScore}/100\n✅ Completed: ${completedVerifications}/${totalVerifications}\n\nUse @${process.env.BOT_USERNAME} to continue verification!`,
                  parse_mode: 'Markdown'
                },
                reply_markup: Markup.inlineKeyboard([
                  [Markup.button.url('✅ Continue Verification', `https://t.me/${process.env.BOT_USERNAME}?start=verify`)]
                ])
              });
            }
          } catch (error) {
            logger.error('Error getting status for inline query:', error);
          }
        }

        if (query === '' || query.includes('sbt')) {
          // Show SBT information
          try {
            const sbtResponse = await apiClient.getSBTInfo(session.token);
            if (sbtResponse.success) {
              const { hasSBT, eligibleForMint, verificationScore } = sbtResponse.data;
              
              if (hasSBT) {
                results.push({
                  type: 'article',
                  id: 'sbt',
                  title: '🏆 My Twin Gate SBT',
                  description: 'Soul Bound Token - Verified Human Identity',
                  input_message_content: {
                    message_text: `🏆 *My Twin Gate SBT*\n\n✅ I have a verified Soul Bound Token representing my human identity on the Twin Gate platform.\n\n🔗 Verified on blockchain\n🌟 Proof of human verification`,
                    parse_mode: 'Markdown'
                  },
                  reply_markup: Markup.inlineKeyboard([
                    [Markup.button.url('🔍 View Details', `https://t.me/${process.env.BOT_USERNAME}?start=sbt`)]
                  ])
                });
              } else if (eligibleForMint) {
                results.push({
                  type: 'article',
                  id: 'mint_sbt',
                  title: '🏆 Mint Your SBT',
                  description: 'You\'re eligible to mint your Soul Bound Token!',
                  input_message_content: {
                    message_text: `🏆 *Ready to Mint SBT!*\n\n✅ Verification Score: ${verificationScore}/100\n🎯 You're eligible to mint your Soul Bound Token!\n\nClick below to mint your SBT now.`,
                    parse_mode: 'Markdown'
                  },
                  reply_markup: Markup.inlineKeyboard([
                    [Markup.button.url('🏆 Mint SBT', `https://t.me/${process.env.BOT_USERNAME}?start=mint`)]
                  ])
                });
              }
            }
          } catch (error) {
            logger.error('Error getting SBT info for inline query:', error);
          }
        }

        if (query === '' || query.includes('verify') || query.includes('channel')) {
          // Show verification channels
          results.push({
            type: 'article',
            id: 'channels',
            title: '📋 Verification Channels',
            description: 'Available verification methods',
            input_message_content: {
              message_text: `📋 *Verification Channels*\n\n🐦 Twitter - 20 pts\n💬 Discord - 15 pts\n📱 Telegram - 15 pts\n🐙 GitHub - 25 pts\n📧 Email - 10 pts\n📞 Phone - 15 pts\n🆔 KYC - 30 pts\n\nStart verifying now!`,
              parse_mode: 'Markdown'
            },
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('✅ Start Verification', `https://t.me/${process.env.BOT_USERNAME}?start=verify`)]
            ])
          });
        }

        if (query.includes('share') || query.includes('invite')) {
          // Show sharing option
          results.push({
            type: 'article',
            id: 'share',
            title: '🚀 Share Twin Gate',
            description: 'Invite others to join Twin Gate',
            input_message_content: {
              message_text: `🚪 *Join Twin Gate!*\n\nI'm using Twin Gate for human identity verification. It's the future of digital identity!\n\n✅ Multi-channel verification\n🏆 Soul Bound Tokens (SBT)\n🔐 Secure & decentralized\n\nJoin me on this journey!`,
              parse_mode: 'Markdown'
            },
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.url('🚀 Join Twin Gate', `https://t.me/${process.env.BOT_USERNAME}?start=invite`)]
            ])
          });
        }
      }

      // Add help option
      if (query === '' || query.includes('help')) {
        results.push({
          type: 'article',
          id: 'help',
          title: '❓ Twin Gate Help',
          description: 'Get help with Twin Gate verification',
          input_message_content: {
            message_text: `❓ *Twin Gate Help*\n\nTwin Gate is a multi-channel human verification platform that issues Soul Bound Tokens (SBT) as proof of verified human identity.\n\n🔗 Learn more about the platform and get support.`,
            parse_mode: 'Markdown'
          },
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.url('❓ Get Help', `https://t.me/${process.env.BOT_USERNAME}?start=help`)],
            [Markup.button.url('📚 Documentation', 'https://docs.twingate.com')]
          ])
        });
      }

      // Add search-specific results
      if (query.includes('twitter')) {
        results.push({
          type: 'article',
          id: 'twitter_verify',
          title: '🐦 Twitter Verification',
          description: 'Verify your Twitter account - 20 points',
          input_message_content: {
            message_text: `🐦 *Twitter Verification*\n\n📝 Post a verification tweet\n⭐ Earn 20 points\n⏱️ Takes ~5 minutes\n\nStart your Twitter verification now!`,
            parse_mode: 'Markdown'
          },
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.url('🐦 Verify Twitter', `https://t.me/${process.env.BOT_USERNAME}?start=verify_twitter`)]
          ])
        });
      }

      if (query.includes('discord')) {
        results.push({
          type: 'article',
          id: 'discord_verify',
          title: '💬 Discord Verification',
          description: 'Join our Discord server - 15 points',
          input_message_content: {
            message_text: `💬 *Discord Verification*\n\n🎮 Join our Discord server\n⭐ Earn 15 points\n⏱️ Takes ~3 minutes\n\nJoin the Twin Gate community!`,
            parse_mode: 'Markdown'
          },
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.url('💬 Verify Discord', `https://t.me/${process.env.BOT_USERNAME}?start=verify_discord`)]
          ])
        });
      }

      // Limit results to 50 (Telegram limit)
      const limitedResults = results.slice(0, 50);

      await ctx.answerInlineQuery(limitedResults, {
        cache_time: 30, // Cache for 30 seconds
        is_personal: true, // Results are personalized
        switch_pm_text: isAuthenticated ? '🏠 Open Twin Gate' : '🚀 Start Verification',
        switch_pm_parameter: isAuthenticated ? 'menu' : 'start'
      });

    } catch (error) {
      logger.error('Error in inline query:', error);
      
      // Send empty results on error
      await ctx.answerInlineQuery([], {
        cache_time: 1,
        is_personal: true,
        switch_pm_text: '❌ Error - Open Bot',
        switch_pm_parameter: 'error'
      });
    }
  });

  // Handle chosen inline results
  bot.on('chosen_inline_result', async (ctx) => {
    try {
      const resultId = ctx.chosenInlineResult.result_id;
      const userId = ctx.from.id;
      const query = ctx.chosenInlineResult.query;

      logger.userAction(userId, 'inline_result_chosen', {
        resultId,
        query
      });

      // Track usage analytics
      if (process.env.ANALYTICS_ENABLED === 'true') {
        logger.botEvent('inline_result_used', {
          userId,
          resultId,
          query
        });
      }

    } catch (error) {
      logger.error('Error in chosen inline result:', error);
    }
  });

  logger.info('Inline mode setup completed');
}

module.exports = { setupInlineMode };
