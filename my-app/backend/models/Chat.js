const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    messageId: { type: String },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    context_retrieved: { type: String, default: null },
    intent_classified: { type: String, default: null },
    keywords_extracted: { type: String, default: null },
    meta: { type: Object },
    feedback: {rating: {type: Number,enum: [1, 2, 3, 4, 5]},
    isHelpful: {type: Boolean},
    category: {type: String,enum: ['accurate', 'inaccurate', 'helpful', 'irrelevant', 'confused', 'other']},
    comment: {type: String,maxlength: 500},
    suggestedImprovement: {type: String,maxlength: 500},
    submittedAt: {type: Date,}}
  },{ timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
