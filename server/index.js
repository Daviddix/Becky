import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import TelegramBot from "node-telegram-bot-api";
import mongoose from 'mongoose';
import { User, Application } from '@scholarship-pilot/shared';
import { inspectScholarshipPage, injectAndSubmit } from './services/scraper.service.js';
import { generateFormAnswers } from './utils/gemini.utils.js';

const app = express();
const PORT = process.env.PORT || 4000;
const token = process.env.TELEGRAM_TOKEN; 
// We set polling to false because the Next.js server only needs to SEND messages, not receive them.
const bot = new TelegramBot(token, { polling: false });

app.use(cors());
app.use(express.json());


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI) 
  .then(() => console.log('Server connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API ENDPOINTS ---

// Endpoint for Next.js to submit approved drafts
app.post('/api/submit', async (req, res) => {
  const { _id, userId, formFields } = req.body;

  try {
    res.status(200).json({ success: true });

    const appRecord = await Application.findByIdAndUpdate(_id, { 
      formFields, 
      status: 'READY' 
    }, { new: true });

    const user = await User.findById(userId);
    
    // We will ping the Telegram bot to notify the user via a webhook or queue later
    console.log(`Application ${_id} ready for submission by user ${user.chatId}`);

    // 6. The Final Handoff: Trigger Playwright in the background
    console.log("🚀 Firing up background browser to submit the final application...");
    
    // Notify the user that the background process has started
    bot.sendMessage(user.chatId, "🚀 Starting background submission. This may take a few moments...");

    injectAndSubmit(appRecord.scholarshipUrl, formFields)
      .then(async (result) => {
        appRecord.status = 'SUBMITTED';
        await appRecord.save();
        
        user.sessionState = 'IDLE';
        await user.save();

        // Send the confirmation and the Playwright screenshot back to Telegram
        await bot.sendPhoto(user.chatId, result.proofImage, {
          caption: "🎉 **Application Successfully Submitted!**\n\nHere is a screenshot of the final confirmation screen.",
          parse_mode: 'Markdown'
        });
        
        console.log(`✅ Successfully submitted for ${user.chatId}`);
      })
      .catch(async (err) => {
        console.error("Submission failed:", err);
        appRecord.status = 'FAILED';
        await appRecord.save();
        
        user.sessionState = 'IDLE';
        await user.save();
        
        bot.sendMessage(user.chatId, "⚠️ I encountered an error while trying to submit the application. Please check the website manually.");
      });

  } catch (error) {
    console.error('API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process submission' });
    }
  }
});

// --- NEW SCRAPE ENDPOINT ---
app.post('/api/scrape', async (req, res) => {
  const { userId, chatId, url } = req.body;

  try {
    const user = await User.findById(userId);

    // 1. Create initial Application record
    const appRecord = await Application.create({
      userId: user._id,
      chatId: chatId,
      scholarshipUrl: url,
      status: 'SCRAPING'
    });

    // 2. Scrape the form (Assuming inspectScholarshipPage is imported from your services)
    const scrapedData = await inspectScholarshipPage(url); 

    // 3. Draft answers
    const answers = await generateFormAnswers(user.vault, scrapedData.fields);
    
    // 4. Merge answers
    const filledFields = scrapedData.fields.map(field => ({
      ...field,
      value: answers[field.name] || '' 
    }));

    // 5. Update DB
    appRecord.formFields = filledFields;
    appRecord.status = 'NEEDS_REVIEW';
    await appRecord.save();
    
    user.sessionState = 'NEEDS_REVIEW';
    await user.save();

    // 6. Return the success and the new App ID to the Telegram bot
    res.status(200).json({ success: true, applicationId: appRecord._id });

  } catch (error) {
    console.error('Scraping Error:', error);
    res.status(500).json({ error: 'Failed to process link' });
  }
});

// GET endpoint to fetch application data for the frontend
app.get('/api/application/:id', async (req, res) => {
  try {
    const appRecord = await Application.findById(req.params.id).lean();
    if (!appRecord) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.status(200).json(appRecord);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🧠 Main Server running on port ${PORT}`);
});