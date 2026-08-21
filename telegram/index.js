import 'dotenv/config';
import { Bot } from "node-telegram-bot-api";
import mongoose from 'mongoose';
import { User } from '@scholarship-pilot/shared';
import { extractAcademicDetails } from '../server/utils/gemini.utils.js';


// 1. Initialize Telegram Bot
const token = process.env.TELEGRAM_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.NEXTJS_BASE_URL;
const bot = new Bot(token);

bot.on('message', async (ctx) => {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text || ctx.text;

  if (!chatId || !text) return;

  try {
    // 1. Fetch or create the user record
    let user = await User.findOne({ chatId });

    if (!user) {
      user = await User.create({
        chatId,
        sessionState: 'NEW_USER',
        vault: {
          firstName: ctx.from?.first_name || '',
          lastName: ctx.from?.last_name || ''
        }
      });
    }

    // 2. Handle /start command from any state
    if (text === '/start') {
      user.sessionState = 'AWAITING_BIO';
      await user.save();

      return ctx.reply(
        "👋 Welcome to *Scholarship Pilot*!\n\n" +
        "Let's set up your Vault so I can apply for scholarships on your behalf.\n\n" +
        "Tell me about yourself in one message (e.g., your university, course of study, current GPA, and any key achievements):",
        { parse_mode: 'Markdown' }
      );
    }

    // 3. State Routing Switchboard
    switch (user.sessionState) {
      case 'AWAITING_BIO': {
        await ctx.reply("🤖 Analyzing your profile details...");

        const extracted = await extractAcademicDetails(text);

        if (extracted) {
          user.vault.university = extracted.university || user.vault.university;
          user.vault.major = extracted.major || user.vault.major;
          user.vault.gpa = extracted.gpa || user.vault.gpa;
          if (extracted.extracurriculars?.length) {
            user.vault.extracurriculars = extracted.extracurriculars;
          }

          user.sessionState = 'IDLE';
          await user.save();

          return ctx.reply(
            `✅ *Vault Initialized!*\n\n` +
            `• *University:* ${user.vault.university || 'Not detected'}\n` +
            `• *Major:* ${user.vault.major || 'Not detected'}\n` +
            `• *GPA:* ${user.vault.gpa || 'Not detected'}\n\n` +
            `You're all set. Whenever you find a scholarship, just drop the link here and I'll handle the rest! 🚀`,
            { parse_mode: 'Markdown' }
          );
        } else {
          return ctx.reply("I had trouble parsing those details. Could you try telling me again?");
        }
      }

      default: {
        const isUrl = /https?:\/\/[^\s]+/.test(text);

        if (isUrl) {
          const url = text.match(/https?:\/\/[^\s]+/)[0];

          user.sessionState = 'PROCESSING_LINK';
          await user.save();

          await ctx.reply("🔍 Link detected! Sending to the main server for AI inspection...");

          try {
            // 1. Tell the server to do the heavy scraping
            const serverResponse = await fetch(`${BACKEND_URL}/api/scrape`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user._id,
                chatId: user.chatId,
                url: url
              })
            });

            const data = await serverResponse.json();

            if (!serverResponse.ok) throw new Error(data.error);

            // 2. Server finished! Send the Next.js Mini App button
            const reviewUrl = `${FRONTEND_URL}/review/${data.applicationId}`;

            await ctx.reply(
              "✅ **Draft Complete!**\n\nI have prepared your application based on your Vault. Tap the button below to review and edit.",
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [[{ text: "📱 Open Live Preview", web_app: { url: reviewUrl } }]]
                }
              }
            );

          } catch (err) {
            console.error('Server connection error:', err);
            user.sessionState = 'IDLE';
            await user.save();
            await ctx.reply("⚠️ The server encountered an error processing that link.");
          }
          return;
        }

        return ctx.reply("Send me a valid scholarship link to start applying!");
      }

      // default:
      //   return ctx.reply("I received your message. Send a scholarship URL to get started.");
    }
  } catch (err) {
    console.error('Error handling message:', err);
    ctx.reply("⚠️ Something went wrong processing your request. Please try again.");
  }
});

bot.startPolling()
  .then(() => console.log('Scholarship Pilot Bot is polling...'))
  .catch(err => console.error('Bot polling error:', err));


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err)); 