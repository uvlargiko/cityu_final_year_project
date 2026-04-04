import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/AuthPages.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Login failed');
        return;
      }
      // expect token in response
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      navigate('/');
    } catch (e) {
      setErr('Failed to fetch');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" />
      <section className="auth-layout auth-layout-login">
        <aside className="auth-brand-panel">
          <p className="auth-eyebrow">Welcome back</p>
          <h1>Sign In To Continue Shopping</h1>
          <p>
            Access your cart, chat history, order updates, and personalized recommendations.
          </p>
          <div className="auth-points">
            <span>Fast checkout flow</span>
            <span>Order and delivery tracking</span>
            <span>AI shopping support</span>
          </div>
        </aside>

        <div className="auth-card">
          <h2>Sign In</h2>
          <p className="auth-subtitle">Use your account credentials to continue.</p>
          {err && <div className="auth-error">{err}</div>}

          <form onSubmit={submit} className="auth-form">
            <label>
              Email
              <input required type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </label>

            <label>
              Password
              <input required type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>

            <button type="submit" className="auth-submit-btn">Sign In</button>
          </form>

          <p className="auth-switch-link">
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}