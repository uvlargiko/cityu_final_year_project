const express = require('express');
const Feedback = require('../models/Feedback');
const ChatMessage = require('../models/Chat');

const router = express.Router();

// POST /api/feedback - Submit feedback for a response
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      messageId,
      userMessage,
      assistantResponse,
      rating,
      isHelpful,
      category,
      comment,
      suggestedImprovement,
      userEmail
    } = req.body;

    // Validate required fields
    if (!sessionId || !userMessage || !assistantResponse || !rating) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, userMessage, assistantResponse, rating'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 5'
      });
    }

    // Create feedback document in Feedback collection
    const feedback = new Feedback({
      sessionId,
      messageId,
      userMessage,
      assistantResponse,
      rating,
      isHelpful,
      category,
      comment,
      suggestedImprovement,
      userEmail
    });

    // Save to Feedback collection
    await feedback.save();

    let feedbackIsHelpful = null;
    if (isHelpful !== undefined) {
      feedbackIsHelpful = isHelpful;
    }
    
    // update ChatMessage feedback field
    if (sessionId && messageId) {
      await ChatMessage.updateOne(
        { sessionId, 'content': assistantResponse },
        {
          $set: {
            'feedback.rating': rating,
            'feedback.isHelpful': feedbackIsHelpful,
            'feedback.category': category || 'other',
            'feedback.comment': comment || '',
            'feedback.suggestedImprovement': suggestedImprovement || '',
            'feedback.submittedAt': new Date()
          }
        }
      );
      console.log(`[Feedback] ✅ Updated ChatMessage feedback for sessionId: ${sessionId}, messageId: ${messageId}`);
    }
    
    console.log(`[Feedback] ✅ Saved feedback - Rating: ${rating}, Category: ${category}, MessageId: ${messageId}`);

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      feedbackId: feedback._id
    });
  } catch (err) {
    console.error('[Feedback] ❌ Error saving feedback:', err.message);
    console.error('[Feedback] Error details:', err);
    res.status(500).json({
      error: 'Failed to save feedback. Please try again.',
      details: err.message
    });
  }
});

// Get all feedback (admin only)
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({
      count: feedback.length,
      data: feedback
    });
  } catch (err) {
    console.error('[Feedback] Error retrieving feedback:', err.message);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

//Get feedback for a specific session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const feedback = await Feedback.find({ sessionId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      sessionId,
      count: feedback.length,
      data: feedback
    });
  } catch (err) {
    console.error('[Feedback] Error retrieving session feedback:', err.message);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

//  Get feedback statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalFeedback = await Feedback.countDocuments();
    
    const avgRating = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const ratingDistribution = await Feedback.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const categoryBreakdown = await Feedback.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const helpfulCount = await Feedback.countDocuments({ isHelpful: true });
    const unhelpfulCount = await Feedback.countDocuments({ isHelpful: false });

    let helpfulPercentage = 0;
    if (totalFeedback > 0) {
      helpfulPercentage = ((helpfulCount / totalFeedback) * 100).toFixed(1);
    }

    res.json({
      totalFeedback,
      averageRating: avgRating[0]?.averageRating || 0,
      ratingDistribution: ratingDistribution.reduce((acc, item) => {
        acc[`rating_${item._id}`] = item.count;
        return acc;
      }, {}),
      helpfulness: {
        helpful: helpfulCount,
        unhelpful: unhelpfulCount,
        helpful_percentage: helpfulPercentage
      },
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('[Feedback] Error calculating stats:', err.message);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

//Delete specific feedback
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Feedback.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ success: true, message: 'Feedback deleted' });
  } catch (err) {
    console.error('[Feedback] Error deleting feedback:', err.message);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
