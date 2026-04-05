import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/PurchaseHistory.css';

function getUserIdentifiers() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return [user.id, user._id, user.name, user.email]
      .filter((v) => typeof v === 'string' && v.trim())
      .map((v) => v.trim());
  } catch {
    return [];
  }
}

export default function PurchaseHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const identifiers = useMemo(() => getUserIdentifiers(), []);

  useEffect(() => {
    let canceled = false;

    async function fetchOrders() {
      if (identifiers.length === 0) {
        setLoading(false);
        setError('Please sign in to view your purchase history.');
        return;
      }

      setLoading(true);
      setError('');

      try {
        const uniqueIds = Array.from(new Set(identifiers));
        let foundOrders = [];

        for (const id of uniqueIds) {
          const res = await fetch(`http://localhost:5000/api/orders/user/${encodeURIComponent(id)}`);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            foundOrders = data;
            break;
          }
        }

        if (!canceled) {
          setOrders(foundOrders);
          setLoading(false);
        }
      } catch (e) {
        if (!canceled) {
          setError('Failed to load purchase history.');
          setLoading(false);
        }
      }
    }

    fetchOrders();
    return () => {
      canceled = true;
    };
  }, [identifiers]);

  return (
    <div className="purchase-history-page">
      <div className="purchase-history-content">
        <div className="purchase-history-header">
          <h1>Your Purchase History</h1>
          <p>Track your previous orders and items purchased.</p>
          <Link to="/" className="purchase-history-back">Back to Shop</Link>
        </div>

        {loading ? (
          <div className="purchase-history-state">Loading your orders...</div>
        ) : error ? (
          <div className="purchase-history-state purchase-history-error">{error}</div>
        ) : orders.length === 0 ? (
          <div className="purchase-history-state">No purchases yet. Your future orders will appear here.</div>
        ) : (
          <div className="purchase-history-list">
            {orders.map((order) => {
              let statusClass = 'badge pending';
              let statusLabel = 'Pending';
              if (order.isDelivered) {
                statusClass = 'badge delivered';
                statusLabel = 'Delivered';
              } else if (order.isPaid) {
                statusClass = 'badge paid';
                statusLabel = 'Paid';
              }

              return (
                <section key={order._id} className="purchase-order-card">
                  <header className="purchase-order-head">
                    <div>
                      <h2>Order #{String(order._id).slice(-8).toUpperCase()}</h2>
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="purchase-order-meta">
                      <strong>${Number(order.totalPrice || 0).toFixed(2)}</strong>
                      <span className={statusClass}>{statusLabel}</span>
                    </div>
                  </header>

                  <div className="purchase-order-items">
                    {(order.orderItems || []).map((item, idx) => {
                      let mediaNode = <div className="no-image">No image</div>;
                      if (item.imageUrl) {
                        mediaNode = <img src={item.imageUrl} alt={item.name} />;
                      }

                      return (
                        <article key={`${order._id}-${idx}`} className="purchase-item-row">
                          <div className="purchase-item-media">{mediaNode}</div>
                          <div className="purchase-item-info">
                            <h3>{item.name}</h3>
                            <p>Quantity: {item.qty}</p>
                          </div>
                          <div className="purchase-item-price">${Number(item.price || 0).toFixed(2)}</div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
