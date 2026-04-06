import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/AuthPages.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Registration failed');
        return;
      }
      navigate('/login');
    } catch (e) {
      setErr('Failed to fetch');
    }
  };

  return (
    <div className="auth-shell auth-shell-signup">
      <div className="auth-backdrop" />
      <section className="auth-layout auth-layout-signup">
        <aside className="auth-brand-panel">
          <p className="auth-eyebrow">Join MyShop</p>
          <h1>Create Your Account</h1>
          <p>
            Start building your cart, save order history, and receive recommendations tailored to your purchases.</p>
          <div className="auth-points">
            <span>Personalized suggestions</span>
            <span>Secure sign-in experience</span>
            <span>Smarter support with AI</span>
          </div>
        </aside>

        <div className="auth-card">
          <h2>Sign Up</h2>
          <p className="auth-subtitle">Set up your profile in under a minute.</p>
          {err && <div className="auth-error">{err}</div>}

          <form onSubmit={submit} className="auth-form">
            <label>
              Full Name
              <input required type="text" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label>
              Email
              <input required type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input required type="password" placeholder="Choose a secure password" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <button type="submit" className="auth-submit-btn">Create Account</button>
          </form>
          <p className="auth-switch-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}