import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/App.css';

export default function Cart({ cart, setCart }) {
  const navigate = useNavigate();

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return;
    const newCart = cart.map((item) => {
      if (item._id === id) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = (id) => {
    const newCart = cart.filter(item => item._id !== id);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let shipping = 5.99;
  if (subtotal > 50) {
    shipping = 0;
  }

  let shippingLabel = `$${shipping.toFixed(2)}`;
  if (shipping === 0) {
    shippingLabel = 'FREE';
  }

  const total = subtotal + shipping;

  if (cart.length === 0) {
    return (
      <div className="content">
      <div className="cart-empty">
       <h2>Your cart is empty</h2>
        <p>Add some products to get started!</p>
        <Link to="/" className="continue-shopping-btn">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>Shopping Cart</h1>
      <div className="cart-container">
        <div className="cart-items">
          <table className="cart-table">
            <thead>
              <tr><th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
              <th></th></tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item._id}>
                  <td className="cart-product">
                    <div className="cart-product-info">
                      {item.imageUrl && item.imageUrl[0] ? (<img src={item.imageUrl[0]} alt={item.name} className="cart-product-image" />
                      ) 
                      : (<div className="cart-image-placeholder">No image</div>
                      )}
                      <div>
                      <Link to={`/product/${item._id}`} className="cart-product-name">{item.name}</Link>
                      <div className="cart-product-brand">{item.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cart-price">${Number(item.price).toFixed(2)}</td>
                  <td className="cart-quantity">
                    <div className="quantity-controls-cart">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>−</button>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateQuantity(item._id, parseInt(e.target.value) || 1)}/>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                    </div>
                  </td>
                  <td className="cart-subtotal">${(item.price * item.quantity).toFixed(2)}</td>
                  <td> <button className="remove-btn" onClick={() => removeItem(item._id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping:</span>
            <span>{shippingLabel}</span>
          </div>
          {subtotal < 50 && (
            <div className="shipping-note">
              Add ${(50 - subtotal).toFixed(2)} more for free shipping!
            </div>
          )}
          <div className="summary-total">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button className="checkout-btn" onClick={() => navigate('/checkout')}>
            Proceed to Checkout
          </button>
          <Link to="/" className="continue-shopping-link">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
