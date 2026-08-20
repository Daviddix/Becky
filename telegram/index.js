import 'dotenv/config';
import { Bot, InlineKeyboardBuilder } from "node-telegram-bot-api";
import mongoose from 'mongoose';
import { User } from '@scholarship-pilot/shared';
import { extractAcademicDetails, generateFormAnswers } from './utils/gemini.utils.js';
import { inspectScholarshipPage } from './services/scraper.service.js';

// 1. Initialize Telegram Bot
const token = process.env.TELEGRAM_TOKEN; 
const bot = new Bot(token);

bot.on('message', async (ctx) => {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text || ctx.text;

  if (!chatId || !text) return;

  try {
    // 1. Fetch or create the user record
    let user = await User.findOne({ chatId });

    if (!user) {
      user = await User.create({ chatId, sessionState: 'NEW_USER' });
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

      case 'IDLE': {
  const isUrl = /https?:\/\/[^\s]+/.test(text);

  if (isUrl) {
    const url = text.match(/https?:\/\/[^\s]+/)[0];

    user.sessionState = 'PROCESSING_LINK';
    await user.save();
    await ctx.reply("🔍 Link detected! Inspecting the application form...");

   try {
  // 1. Create the initial Application record in MongoDB
  const appRecord = await Application.create({
    userId: user._id,
    chatId: user.chatId,
    scholarshipUrl: url,
    status: 'SCRAPING'
  });

  // 2. Scrape the empty form
  const scrapedData = await inspectScholarshipPage(url);
  await ctx.reply(`📄 Found ${scrapedData.fields.length} fields. Drafting answers with Gemini...`);

  // 3. Synthesize answers
  const answers = await generateFormAnswers(user.vault, scrapedData.fields);
  
  // 4. Merge the Gemini answers back into the form fields array
  const filledFields = scrapedData.fields.map(field => ({
    ...field,
    value: answers[field.name] || '' // Attach the drafted text to the specific field
  }));

  // 5. Update the Database with the final drafts
  appRecord.formFields = filledFields;
  appRecord.status = 'NEEDS_REVIEW';
  await appRecord.save();
  
  user.sessionState = 'NEEDS_REVIEW';
  await user.save();

  const baseUrl = process.env.NEXTJS_BASE_URL || 'http://localhost:3000';
  const reviewUrl = `${baseUrl}/review/${appRecord._id}`;

  await ctx.reply(
    "✅ **Draft Complete!**\n\nI have prepared your application based on your Vault. Tap the button below to review, edit, and approve the final text.",
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "📱 Open Live Preview", web_app: { url: reviewUrl } }]
        ]
      }
    }
  );

} catch (err) {
  console.error('Pipeline error:', err);
  user.sessionState = 'IDLE';
  await user.save();
  await ctx.reply("⚠️ Something went wrong while processing that link. Please try another one.");
}
    return;
  }
  return ctx.reply("Send me a valid scholarship link to start applying!");
}

      default:
        return ctx.reply("I received your message. Send a scholarship URL to get started.");
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