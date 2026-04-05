import React, { useEffect, useState } from 'react';
import '../styles/App.css';

export default function ChatHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCreatedAt = (value) => {
    if (value) {
      return new Date(value).toLocaleString();
    }
    return '';
  };

  useEffect(() => {
    const sessionId = localStorage.getItem('chatSessionId') || 'default';
    fetch(`http://localhost:5000/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        let nextRecords = [];
        if (Array.isArray(data.records)) {
          nextRecords = data.records;
        }
        setRecords(nextRecords);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load history');
        setLoading(false);
      });
  }, []);

  return (
    <div className="content">
      <h1>Chat History</h1>
      {loading && <div className="info">Loading chat history...</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && records.length === 0 && (
        <div className="info">No chat records found for this session.</div>
      )}
      {!loading && !error && records.length > 0 && (
        <div className="chat-history">
          {records.map((r) => (
            <div key={r._id} className={`chat-history-item ${r.role}`}>
              <div className="chat-history-role">{r.role}</div>
              <div className="chat-history-content">{r.content}</div>
              <div className="chat-history-time">
                {formatCreatedAt(r.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
