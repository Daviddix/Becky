import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { User, Application } from '@scholarship-pilot/shared';
import { inspectScholarshipPage } from './services/scraper.service.js';
import { generateFormAnswers } from './utils/gemini.utils.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    await Application.findByIdAndUpdate(_id, { 
      formFields, 
      status: 'READY' 
    });

    const user = await User.findById(userId);
    
    // We will ping the Telegram bot to notify the user via a webhook or queue later
    console.log(`Application ${_id} ready for submission by user ${user.chatId}`);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to process submission' });
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

// Start the server
app.listen(PORT, () => {
  console.log(`🧠 Main Server running on port ${PORT}`);
});