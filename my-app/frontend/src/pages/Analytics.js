import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/AnalyticsView.css';

export default function AnalyticsView() {
  const [summary, setSummary] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return !!user.isAdmin;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError('');
      try {
        const [summaryRes, listRes] = await Promise.all([
          fetch('http://localhost:5000/api/feedback/stats/summary'),
          fetch('http://localhost:5000/api/feedback')
        ]);

        if (!summaryRes.ok) {
          throw new Error('Failed to load analytics summary');
        }

        if (!listRes.ok) {
          throw new Error('Failed to load feedback list');
        }

        const summaryData = await summaryRes.json();
        const listData = await listRes.json();

        if (!canceled) {
          setSummary(summaryData || null);
          setRecentFeedback(Array.isArray(listData?.data) ? listData.data.slice(0, 10) : []);
        }
      } catch (e) {
        if (!canceled) {
          setError(e.message || 'Failed to load analytics');
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      canceled = true;
    };
  }, []);

  if (!isAdmin) {
    return (
      <div className="content">
        <div className="analytics-blocked">
          <h1>Feedback Analytics</h1>
          <p>Admin access is required.</p>
          <Link to="/" className="analytics-back">Back to Shop</Link>
        </div>
      </div>
    );
  }

  const ratingDistribution = summary?.ratingDistribution || {};
  const categoryBreakdown = summary?.categoryBreakdown || {};

  return (
    <div className="content analytics-page">
      <div className="analytics-head">
        <h1>Feedback Analytics</h1>
        <Link to="/" className="analytics-back">Back to Shop</Link>
      </div>

      {error && <div className="analytics-error">{error}</div>}

      {loading ? (
        <div className="info">Loading analytics...</div>
      ) : (
        <>
          <section className="analytics-kpis">
            <article className="kpi-card">
              <h3>Total Feedback</h3>
              <p>{summary?.totalFeedback ?? 0}</p>
            </article>
            <article className="kpi-card">
              <h3>Average Rating</h3>
              <p>{Number(summary?.averageRating || 0).toFixed(2)}</p>
            </article>
            <article className="kpi-card">
              <h3>Helpful %</h3>
              <p>{summary?.helpfulness?.helpful_percentage ?? 0}%</p>
            </article>
          </section>

          <section className="analytics-grid">
            <div className="analytics-panel">
              <h2>Rating Distribution</h2>
              <ul>
                {[1, 2, 3, 4, 5].map((r) => (
                  <li key={r}>
                    <span>{r} star</span>
                    <strong>{ratingDistribution[`rating_${r}`] || 0}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="analytics-panel">
              <h2>Category Breakdown</h2>
              {Object.keys(categoryBreakdown).length === 0 ? (
                <p className="muted">No category data available.</p>
              ) : (
                <ul>
                  {Object.entries(categoryBreakdown).map(([category, count]) => (
                    <li key={category}>
                      <span>{category}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="analytics-panel recent-feedback">
            <h2>Recent Feedback</h2>
            {recentFeedback.length === 0 ? (
              <p className="muted">No feedback records found.</p>
            ) : (
              <div className="feedback-list">
                {recentFeedback.map((f) => (
                  <article key={f._id} className="feedback-item">
                    <header>
                      <strong>{f.category || 'other'}</strong>
                      <span>{new Date(f.createdAt || Date.now()).toLocaleString()}</span>
                    </header>
                    <p className="feedback-meta">Rating: {f.rating} | Helpful: {typeof f.isHelpful === 'boolean' ? (f.isHelpful ? 'Yes' : 'No') : 'N/A'}</p>
                    {f.comment ? <p className="feedback-comment">{f.comment}</p> : <p className="muted">No comment</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
