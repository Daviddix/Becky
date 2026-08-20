import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
    unique: true
  },
  sessionState: {
    type: String,
    enum: ['NEW_USER', 'AWAITING_BIO', 'IDLE', 'PROCESSING_LINK', 'NEEDS_REVIEW', 'AWAITING_APPROVAL'],
    default: 'NEW_USER'
  },
  vault: {
    university: { type: String, default: null },
    major: { type: String, default: null },
    gpa: { type: Number, default: null },
    extracurriculars: { type: [String], default: [] }
  }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);