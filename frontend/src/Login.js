import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', name: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/dev-login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      navigate(data.user.role === 'admin' ? '/admin' : '/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Haus of Defined Beauty</h1>
        <p className="tagline">Where Beauty Is Defined</p>

        <form className="dev-login-form" onSubmit={handleDevLogin}>
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
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="google-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in (Dev Mode)'}
          </button>
        </form>

        <p className="dev-notice">Google OAuth will replace this form in production.</p>
      </div>
    </div>
  );
}

export default Login;
