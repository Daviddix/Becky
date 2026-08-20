import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: Number,
    required: true
  },
  scholarshipUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['SCRAPING', 'SYNTHESIZING', 'NEEDS_REVIEW', 'READY', 'SUBMITTED', 'FAILED'],
    default: 'SCRAPING'
  },
  formFields: [{
    label: String,
    name: String,
    type: { type: String },
    required: Boolean,
    value: String
  }],
  essayPrompt: {
    type: String,
    default: null
  },
  essayDraft: {
    type: String,
    default: null
  },
  screenshotPath: {
    type: String,
    default: null
  }
}, { timestamps: true });

export const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);