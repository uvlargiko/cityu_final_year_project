import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/App.css';

export default function Checkout({ cart, setCart }) {
  const navigate = useNavigate();
  const savedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
      return null;
    }
  })();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Shipping
    fullName: savedUser?.name || '',
    email: savedUser?.email || '',
    address: '',
    city: '',
    zipCode: '',
    // Step 2: Payment
    paymentMethod: 'card',
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });
  const [errors, setErrors] = useState({});

  const inputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'Zip code is required';
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (formData.paymentMethod === 'card') {
      if (!formData.cardNumber.trim()) newErrors.cardNumber = 'Card number is required';
      if (!formData.cardName.trim()) newErrors.cardName = 'Card holder name is required';
      if (!formData.expiryDate.trim()) newErrors.expiryDate = 'Expiry date is required';
      if (!formData.cvv.trim()) newErrors.cvv = 'CVV is required';
    }
    return newErrors;
  };

  const handleNext = () => {
    if (step === 1) {
      const newErrors = validateStep1();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const newErrors = validateStep2();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(3);
    }
  };

  const handlePlaceOrder = async () => {
    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      let shipping = 5.99;
      if (subtotal > 50) {
        shipping = 0;
      }
      const totalPrice = subtotal + shipping;

      const orderData = {
        user: savedUser?.id || savedUser?._id || formData.fullName,
        orderItems: cart.map((item) => ({
          itemid: item.itemid || item._id,
          name: item.name,
          qty: item.quantity,
          price: item.price,
          imageUrl: item.imageUrl?.[0] || ''
        })),
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          postalCode: formData.zipCode,
          country: 'USA'
        },
        paymentMethod: formData.paymentMethod,
        itemsPrice: subtotal,
        shippingPrice: shipping,
        totalPrice: totalPrice,
        isPaid: true,
        paidAt: new Date(),
        isDelivered: false
      };
      const response = await fetch('http://localhost:5000/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }
      const savedOrder = data;
      const orderNumber = savedOrder._id || Math.floor(100000 + Math.random() * 900000);
      // Clear cart
      setCart([]);
      localStorage.setItem('cart', JSON.stringify([]));
      // Force recommendations refresh after purchase
      const refreshTs = Date.now().toString();
      localStorage.setItem('recommendationsRefreshTs', refreshTs);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recommendations:refresh', { detail: refreshTs }));
      }
      // Redirect to success page
      navigate(`/order-success/${orderNumber}`);
    } catch (err) {
      alert(`Error placing order: ${err.message}`);
    }
  };
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let shipping = 5.99;
  if (subtotal > 50) {
    shipping = 0;
  }
  const getStepClass = (stepNumber) => {
    let className = 'progress-step';
    if (step >= stepNumber) {
      className += ' active';
    }
    return className;
  };
  let paymentSummary = 'Cash on Delivery';
  if (formData.paymentMethod === 'card') {
    paymentSummary = `Card ending in ${formData.cardNumber.slice(-4)}`;
  } 
  let shippingLabel = `$${shipping.toFixed(2)}`;
  if (shipping === 0) {
    shippingLabel = 'FREE';
  }
  const getErrorClass = (fieldName) => {
    if (errors[fieldName]) {
      return 'error-input';
    }
    return '';
  };
  const total = subtotal + shipping;
  if (cart.length === 0) {
    return (
      <div className="content">
        <div className="info">Your cart is empty. Please add items before checking out.</div>
      </div>
    );
  }
  return (
    <div className="content">
      <h1>Checkout</h1>
      
      <div className="checkout-progress">
        <div className={getStepClass(1)}>
        <div className="step-number">1</div>
        <div className="step-label">Shipping</div>
        </div>
        <div className="progress-line"></div>
        <div className={getStepClass(2)}>
        <div className="step-number">2</div>
        <div className="step-label">Payment</div>
        </div>
        <div className="progress-line"></div>
        <div className={getStepClass(3)}>
        <div className="step-number">3</div>
        <div className="step-label">Review</div>
        </div>
      </div>

      <div className="checkout-container">
        <div className="checkout-form">
          {step === 1 && (
            <div className="checkout-step">
            <h2>Shipping Information</h2>
            <div className="form-group">
             <label htmlFor="fullName">Full Name *</label>
                <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={inputChange} className={getErrorClass('fullName')}
                />
                {errors.fullName && <span className="error-text">{errors.fullName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={inputChange} className={getErrorClass('email')}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <input type="text" id="address" name="address" value={formData.address} onChange={inputChange} className={getErrorClass('address')}
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City *</label>
                  <input type="text" id="city" name="city" value={formData.city} onChange={inputChange} className={getErrorClass('city')}
                  />
                  {errors.city && <span className="error-text">{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="zipCode">Zip Code *</label>
                  <input type="text" id="zipCode"name="zipCode" value={formData.zipCode}onChange={inputChange}className={getErrorClass('zipCode')}
                  />
                  {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
                </div>
              </div>
              <button className="checkout-next-btn" onClick={handleNext}>Continue to Payment</button>
            </div>
          )}

          {step === 2 && (
            <div className="checkout-step">
              <h2>Payment Method</h2>
              <div className="payment-methods">
                <label className="payment-option">
                  <input type="radio" name="paymentMethod"value="card" checked={formData.paymentMethod === 'card'} onChange={inputChange}
                  />
                  Credit/Debit Card
                </label>
                <label className="payment-option">
                  <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={inputChange}
                  />
                  Cash on Delivery
                </label>
              </div>

              {formData.paymentMethod === 'card' && (
                <>
                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number *</label>
                    <input type="text" id="cardNumber" name="cardNumber" placeholder="1234 5678 9012 3456"value={formData.cardNumber}onChange={inputChange}className={getErrorClass('cardNumber')}
                    />
                    {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="cardName">Card Holder Name *</label>
                    <input type="text" id="cardName" name="cardName"value={formData.cardName}onChange={inputChange}className={getErrorClass('cardName')}
                    />
                    {errors.cardName && <span className="error-text">{errors.cardName}</span>}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiryDate">Expiry Date *</label>
                      <input type="text"id="expiryDate"name="expiryDate"placeholder="MM/YY"value={formData.expiryDate}onChange={inputChange}className={getErrorClass('expiryDate')}
                      />
                      {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="cvv">CVV *</label>
                      <input type="text" id="cvv"name="cvv"placeholder="123"value={formData.cvv}onChange={inputChange}className={getErrorClass('cvv')}
                      />
                      {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                    </div>
                  </div>
                </>
              )}

              <div className="checkout-buttons">
                <button className="checkout-back-btn" onClick={() => setStep(1)}>Back</button>
                <button className="checkout-next-btn" onClick={handleNext}>Review Order</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="checkout-step">
              <h2>Order Review</h2>
              
              <div className="review-section">
                <h3>Shipping Address</h3>
                <p>
                  {formData.fullName}<br />
                  {formData.address}<br />
                  {formData.city}, {formData.zipCode}<br />
                  {formData.email}
                </p>
              </div>

              <div className="review-section">
                <h3>Payment Method</h3>
                <p>{paymentSummary}</p>
              </div>

              <div className="review-section">
                <h3>Order Items</h3>
                {cart.map(item => (
                  <div key={item._id} className="review-item">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="checkout-buttons">
                <button className="checkout-back-btn" onClick={() => setStep(2)}>Back</button>
                <button className="checkout-place-order-btn" onClick={handlePlaceOrder}>Place Order</button>
              </div>
            </div>
          )}
        </div>

        <div className="checkout-summary">
          <h2>Order Summary</h2>
          <div className="summary-items">
            {cart.map(item => (
              <div key={item._id} className="summary-item">
              <span>{item.name} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping:</span>
            <span>{shippingLabel}</span>
          </div>
          <div className="summary-total">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
