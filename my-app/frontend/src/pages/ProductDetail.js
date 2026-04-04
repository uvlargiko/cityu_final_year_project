import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import '../styles/App.css';

export default function ProductDetail({ cart, setCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/goods/getallgoods')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        const found = Array.isArray(data) ? data.find(p => p._id === id) : null;
        setProduct(found);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Fetch error');
        setLoading(false);
      });
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    
    const existing = cart.find(item => item._id === product._id);
    let newCart;
    if (existing) {
      newCart = cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity }];
    }
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    alert(`Added ${quantity} ${product.name} to cart!`);
  };

  if (loading) return <div className="content"><div className="info">Loading product...</div></div>;
  if (error) return <div className="content"><div className="error">Error: {error}</div></div>;
  if (!product) return <div className="content"><div className="info">Product not found.</div></div>;

  const images = product.imageUrl && product.imageUrl.length > 0 ? product.imageUrl : [''];

  return (
    <div className="product-detail-page">
      <div className="content">
        <Link to="/" className="back-link">← Back to Shop</Link>
        
        <div className="product-detail-container">
          <div className="product-images">
            <div className="main-image-wrap">
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} className="main-image" />
              ) : (
                <div className="image-placeholder-large">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="thumbnail-grid">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`thumbnail ${idx === selectedImage ? 'active' : ''}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    {img ? (
                      <img src={img} alt={`${product.name} view ${idx + 1}`} />
                    ) : (
                      <div className="image-placeholder-small">No image</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="product-info-detail">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-meta">
              <span className="product-brand">Brand: {product.brand || 'N/A'}</span>
              <span className="product-category">Category: {product.category || 'N/A'}</span>
              <div className="product-rating-detail">⭐ {product.rating ?? 'N/A'} / 5</div>
            </div>

            <div className="product-price-detail">
              ${Number(product.price || 0).toFixed(2)}
            </div>

            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description || 'No description available.'}</p>
              <ul>
                <li>Item ID: {product.itemid}</li>
                <li>High quality materials</li>
                <li>Fast shipping available</li>
                <li>30-day return policy</li>
              </ul>
            </div>

            <div className="quantity-selector">
              <label htmlFor="quantity">Quantity:</label>
              <div className="quantity-controls">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            <button className="add-to-cart-btn-detail" onClick={addToCart}>
              Add to Cart
            </button>
          </div>
        </div>

        <div className="product-reviews">
          <h2>Customer Reviews</h2>
          <div className="review">
            <div className="review-header">
              <strong>John D.</strong> <span className="review-rating">⭐⭐⭐⭐⭐</span>
            </div>
            <p>Excellent product! Great quality and fast delivery.</p>
          </div>
          <div className="review">
            <div className="review-header">
              <strong>Sarah M.</strong> <span className="review-rating">⭐⭐⭐⭐</span>
            </div>
            <p>Very satisfied with this purchase. Would recommend!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
