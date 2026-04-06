import React, { useState, useEffect } from 'react';
import '../styles/RecommendationWidget.css';

export function RecommendationWidget({ userId, maxItems = 5, addtoCart, refresh }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const imgSrc = (product) => {
  const value = product?.imageUrl;
  if (Array.isArray(value)) {
      return value.find((url) => typeof url === 'string' && url.trim()) || '';
    }
  if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  };

  useEffect(() => {
    if (!userId) return;
    fetch(`http://localhost:5000/api/recommendations/${userId}?limit=${maxItems}&_ts=${Date.now()}&refresh=${encodeURIComponent(refresh || '')}`, {
      cache: 'no-store',
      headers: {'Cache-Control': 'no-cache'      }
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
  }, [userId, maxItems, refresh]);

  if (loading) return <div className="recommendation-loading">Loading recommendations...</div>;
  if (recommendations.length === 0) return null;

  const add_to_cart = (product) => {
    if (typeof addtoCart === 'function') {
      addtoCart(product);
      return;
    }
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const exist = cart.find((item) => item._id === product._id);
    if (exist) {
      exist.quantity = (exist.quantity || 1) + 1;
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
        {recommendations.map((product) => {
          const imageSrc = imgSrc(product);
          return (
            <div key={product._id} className="recommendation-item">
              <div className="recommendation-image-wrap">
                {imageSrc ? (
                  <img className="recommendation-image" src={imageSrc} alt={product.name}/>
                ) : (
                  <div className="recommendation-image-not-exist">No image</div>
                )}
              </div>
              <h4 className="recommendation-name">{product.name}</h4>
              <p className="recommendation-price">${Number(product.price || 0).toFixed(2)}</p>
              <button className="recommendation-btn" onClick={() => add_to_cart(product)}>Add to Cart</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecommendationWidget;