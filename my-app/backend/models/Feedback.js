const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messageId: {
    type: String,  // Changed from ObjectId to String
  },
  userMessage: {
    type: String,
    required: true
  },
  assistantResponse: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    enum: [1, 2, 3, 4, 5], 
    required: true
  },
  isHelpful: {
    type: Boolean
  },
  category: {
    type: String,
    enum: ['accurate', 'inaccurate', 'helpful', 'irrelevant', 'confused', 'other'],
    default: 'other'
  },
  comment: {
    type: String,
    maxlength: 500
  },
  suggestedImprovement: {
    type: String,
    maxlength: 500
  },
  userEmail: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
