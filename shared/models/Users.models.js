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
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  university: { type: String, default: null },
  vault: {
    university: { type: String, default: null },
    major: { type: String, default: null },
    gpa: { type: Number, default: null },
    extracurriculars: { type: [String], default: [] }
  }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);