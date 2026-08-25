import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from './assets/logo.jpeg';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'numbers'
  const [form, setForm] = useState({ email: '', name: '' });
  const [options, setOptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login/start', {
        email: form.email,
        name: form.name,
      });
      setOptions(data.options);
      setStep('numbers');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async selected => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login/verify', {
        email: form.email,
        selected,
        name: form.name,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      navigate(data.user.role === 'admin' ? '/admin' : '/customer', { state: { justSignedUp: data.isNewAccount } });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid selection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login/start', {
        email: form.email,
        name: form.name,
      });
      setOptions(data.options);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">

      <div className="login-brand">
        <div className="logo-scene">

          {/* Spinning decorative rings */}
          <div className="deco-ring r1" />
          <div className="deco-ring r2" />
          <div className="deco-ring r3" />

          {/* Floating sparkles */}
          <span className="spark sp1">✦</span>
          <span className="spark sp2">✧</span>
          <span className="spark sp3">✦</span>
          <span className="spark sp4">✧</span>
          <span className="spark sp5">✦</span>
          <span className="spark sp6">✧</span>
          <span className="spark sp7">✦</span>

          {/* Logo box — wrapper handles spin, inner handles glow */}
          <div className="logo-box-wrapper">
            <div className="logo-box">
              <img src={logo} alt="Haus of Defined Beauty" className="logo-img" />
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <h2>Welcome</h2>
          <p className="login-subtitle">
            {step === 'email'
              ? 'Sign in with your email to continue'
              : `We emailed a number to ${form.email} — click the matching one below`}
          </p>

          {step === 'email' && (
            <form className="otp-form" onSubmit={handleStart}>
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="google-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          )}

          {step === 'numbers' && (
            <div className="otp-form">
              <div className="number-grid">
                {options.map(n => (
                  <button
                    key={n}
                    type="button"
                    className="number-btn"
                    onClick={() => handleSelect(n)}
                    disabled={loading}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {error && <p className="login-error">{error}</p>}
              <div className="otp-links">
                <button type="button" className="otp-link" onClick={() => { setStep('email'); setOptions([]); setError(''); }}>
                  Change email
                </button>
                <button type="button" className="otp-link" onClick={handleResend} disabled={loading}>
                  Resend code
                </button>
              </div>
            </div>
          )}

          <p className="login-hint">No password needed — just your email.</p>
        </div>
      </div>

    </div>
  );
}

export default Login;
