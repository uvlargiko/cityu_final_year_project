import React, { useState, useRef, useEffect } from 'react';
import '../styles/App.css';

export default function ChatWidget() {
  const [sessionId] = useState(() => {
    const existing = localStorage.getItem('chatSessionId');
    if (existing) return existing;
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('chatSessionId', newId);
    return newId;
  });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 'initial-' + Date.now(), role: 'assistant', content: 'Hi! I am your shop assistant. How can I help?' }
  ]);
  const [loading, setLoading] = useState(false);
  const [feedbackStates, setFeedbackStates] = useState({}); // Track feedback for each message
  const [showFeedbackModal, setShowFeedbackModal] = useState(null); // For detailed feedback
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { id: 'user-' + Date.now(), role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem('user') || 'null');
        } catch (e) {
          return null;
        }
      })();
      const userId = storedUser?.id || storedUser?._id || null;
      const userName = storedUser?.name || storedUser?.email || null;

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(-10),
          sessionId,
          userId,
          userName
        })
      });

      const raw = await response.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error('Chat server returned non-JSON response. Is the backend running on port 5000?');
        }
        throw new Error('Unexpected response from chat server.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Chat error');
      }

      setMessages((prev) => [...prev, { id: 'assistant-' + Date.now(), role: 'assistant', content: data.reply || 'No response.' }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: 'error-' + Date.now(), role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Submit quick feedback (like/dislike)
  const submitQuickFeedback = async (messageIndex, isHelpful, rating) => {
    const assistantMessage = messages[messageIndex];
    let userMessage = 'General inquiry';
    if (messageIndex > 0) {
      userMessage = messages[messageIndex - 1]?.content;
    }

    let feedbackCategory = 'irrelevant';
    if (isHelpful) {
      feedbackCategory = 'helpful';
    }

    try {
      await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messageId: assistantMessage.id, 
          userMessage,
          assistantResponse: assistantMessage.content,
          rating,
          isHelpful,
          category: feedbackCategory
        })
      });

      // Update UI to show feedback was submitted
      setFeedbackStates((prev) => ({
        ...prev,
        [messageIndex]: { submitted: true, isHelpful }
      }));

      setTimeout(() => {
        setFeedbackStates((prev) => ({
          ...prev,
          [messageIndex]: { submitted: true, hidden: true }
        }));
      }, 2000);
    } catch (err) {
      console.error('Feedback submission error:', err);
    }
  };

  // Submit detailed feedback
  const submitDetailedFeedback = async (messageIndex, feedbackData) => {
    const assistantMessage = messages[messageIndex];
    let userMessage = 'General inquiry';
    if (messageIndex > 0) {
      userMessage = messages[messageIndex - 1]?.content;
    }

    try {
      await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: assistantMessage.id, 
          sessionId,
          userMessage,
          assistantResponse: assistantMessage.content,
          rating: feedbackData.rating,
          isHelpful: feedbackData.isHelpful,
          category: feedbackData.category,
          comment: feedbackData.comment,
          suggestedImprovement: feedbackData.suggestion
        })
      });

      setShowFeedbackModal(null);
      setFeedbackStates((prev) => ({
        ...prev,
        [messageIndex]: { submitted: true, hidden: true }
      }));
    } catch (err) {
      console.error('Feedback submission error:', err);
    }
  };

  return (
    <div className="chat-widget">
      {!open && (
        <button className="chat-toggle" onClick={() => setOpen(true)} aria-label="Open chat">
          💬 Chat
        </button>
      )}

      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <strong>AI Assistant</strong>
              <div className="chat-subtitle">Local Llama</div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((m, idx) => (
              <div key={idx}>
                <div className={`chat-message ${m.role}`}>
                  <div className="chat-bubble">{m.content}</div>
                </div>

                {/* Show feedback buttons for assistant messages */}
                {m.role === 'assistant' && !feedbackStates[idx]?.hidden && (
                  <div className="chat-feedback">
                    {!feedbackStates[idx]?.submitted ? (
                      <div className="feedback-buttons">
                        <button
                          className="feedback-btn helpful"
                          onClick={() => submitQuickFeedback(idx, true, 5)}
                          title="This response was helpful"
                        >
                          👍 Helpful
                        </button>
                        <button
                          className="feedback-btn unhelpful"
                          onClick={() => submitQuickFeedback(idx, false, 2)}
                          title="This response was not helpful"
                        >
                          👎 Not Helpful
                        </button>
                        <button
                          className="feedback-btn detailed"
                          onClick={() => setShowFeedbackModal(idx)}
                          title="Provide detailed feedback"
                        >
                          ⭐ Feedback
                        </button>
                      </div>
                    ) : (
                      <div className="feedback-thank-you">
                        ✓ Thank you for your feedback!
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="chat-bubble">Thinking…</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <textarea
              rows={2}
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Detailed Feedback Modal */}
      {showFeedbackModal !== null && (
        <FeedbackModal
          onClose={() => setShowFeedbackModal(null)}
          onSubmit={(data) => submitDetailedFeedback(showFeedbackModal, data)}
        />
      )}
    </div>
  );
}

// Detailed Feedback Modal Component
function FeedbackModal({ onClose, onSubmit }) {
  const [rating, setRating] = useState(3);
  const [isHelpful, setIsHelpful] = useState(null);
  const [category, setCategory] = useState('helpful');
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const getStarClass = (star) => {
    let className = 'star';
    if (rating >= star) {
      className += ' active';
    }
    return className;
  };

  const getHelpfulBtnClass = (value) => {
    let className = 'toggle-btn';
    if (isHelpful === value) {
      className += ' active';
    }
    return className;
  };

  const handleSubmit = () => {
    onSubmit({ rating, isHelpful, category, comment, suggestion });
  };

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h3>How would you rate this response?</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="feedback-modal-body">
          {/* Star Rating */}
          <div className="feedback-section">
            <label>Rating:</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={getStarClass(star)}
                  onClick={() => setRating(star)}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {/* Helpful/Not Helpful */}
          <div className="feedback-section">
            <label>Was this response helpful?</label>
            <div className="feedback-toggle">
              <button
                className={getHelpfulBtnClass(true)}
                onClick={() => setIsHelpful(true)}
              >
                👍 Yes
              </button>
              <button
                className={getHelpfulBtnClass(false)}
                onClick={() => setIsHelpful(false)}
              >
                👎 No
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="feedback-section">
            <label>Category:</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="helpful">Helpful</option>
              <option value="accurate">Accurate</option>
              <option value="inaccurate">Inaccurate</option>
              <option value="irrelevant">Irrelevant</option>
              <option value="confused">Confused</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Comment */}
          <div className="feedback-section">
            <label>Additional Comments:</label>
            <textarea
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Suggestion */}
          <div className="feedback-section">
            <label>Suggested Improvement:</label>
            <textarea
              placeholder="How could we improve this response?"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="feedback-modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" onClick={handleSubmit}>Submit Feedback</button>
        </div>
      </div>
    </div>
  );
}

