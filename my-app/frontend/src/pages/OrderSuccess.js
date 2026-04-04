import React from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles/App.css';

export default function OrderSuccess() {
  const { orderNumber } = useParams();

  return (
    <div className="content">
      <div className="order-success">
        <div className="success-icon">✓</div>
        <h1>Order Placed Successfully!</h1>
        <p className="order-number">Order Number: #{orderNumber}</p>
        <p>Thank you for your purchase. We've sent a confirmation email with your order details.</p>
        <div className="success-actions">
          <Link to="/" className="btn-primary">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
