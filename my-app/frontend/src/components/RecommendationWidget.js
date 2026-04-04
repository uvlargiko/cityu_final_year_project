import React, { useState, useEffect } from 'react';
import '../styles/RecommendationWidget.css';

export function RecommendationWidget({ userId, maxItems = 5, onAddToCart, refreshSignal }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:5000/api/recommendations/${userId}?limit=${maxItems}&_ts=${Date.now()}&refresh=${encodeURIComponent(refreshSignal || '')}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        setRecommendations(data.recommendations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Recommendation error:', err);
        setLoading(false);
      });
  }, [userId, maxItems, refreshSignal]);

  if (loading) return <div className="recommendation-loading">Loading recommendations...</div>;
  if (recommendations.length === 0) return null;

  const handleAddToCart = (product) => {
    if (typeof onAddToCart === 'function') {
      onAddToCart(product);
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
  };

  return (
    <div className="recommendation-widget">
      <h3 className="recommendation-title">Recommended for You</h3>
      <p className="recommendation-subtitle">Personalized picks based on your recent orders</p>
      <div className="recommendation-list">
        {recommendations.map(product => (
          <div key={product._id} className="recommendation-item">
            <div className="recommendation-image-wrap">
              <img
                className="recommendation-image"
                src={product.imageUrl?.[0] || ''}
                alt={product.name}
              />
            </div>
            <h4 className="recommendation-name">{product.name}</h4>
            <p className="recommendation-price">${Number(product.price || 0).toFixed(2)}</p>
            <button className="recommendation-btn" onClick={() => handleAddToCart(product)}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendationWidget;