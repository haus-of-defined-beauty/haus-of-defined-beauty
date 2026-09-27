import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from './assets/logo.jpeg';
import SiteNav from './Site/SiteNav';
import { emailProblem, suggestEmail, normalizeEmail } from './utils/emailCheck';
import { nameProblem, normalizeName } from './utils/nameCheck';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'numbers'
  const [form, setForm] = useState({ email: '', name: '' });
  const [options, setOptions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');   // prompt shown under the email box
  const [emailHint, setEmailHint] = useState('');  // a likely typo fix, e.g. name@gmail.com
  const [keptEmail, setKeptEmail] = useState('');  // typo-looking address the user chose to keep
  const [nameMsg, setNameMsg] = useState('');     // prompt shown under the name box

  const onNameChange = e => {
    setForm({ ...form, name: e.target.value });
    setNameMsg('');
  };

  // On leaving the box: only nag once something has been typed.
  const onNameBlur = () => {
    if (form.name.trim()) setNameMsg(nameProblem(form.name));
  };

  const onEmailChange = e => {
    setForm({ ...form, email: e.target.value });
    setEmailMsg('');
    setEmailHint('');
  };

  // On leaving the box: only nag about a clearly invalid address, never an empty one.
  const onEmailBlur = () => {
    if (form.email.trim()) setEmailMsg(emailProblem(form.email));
  };

  const useSuggestion = () => {
    setForm({ ...form, email: emailHint });
    setEmailMsg('');
    setEmailHint('');
  };

  // Returns true when the address is fine to send. A likely typo is flagged once;
  // pressing the button again with the same address confirms it is intended.
  const emailIsOk = () => {
    const problem = emailProblem(form.email);
    if (problem) { setEmailMsg(problem); setEmailHint(''); return false; }

    const suggestion = suggestEmail(form.email);
    if (suggestion && keptEmail !== normalizeEmail(form.email)) {
      setEmailHint(suggestion);
      setEmailMsg('typo');
      setKeptEmail(normalizeEmail(form.email));
      return false;
    }
    return true;
  };

  const handleStart = async e => {
    e.preventDefault();
    setError('');
    // Check both boxes so every problem is shown at once.
    const emailOk = emailIsOk();
    const nameIssue = nameProblem(form.name);
    setNameMsg(nameIssue);
    if (!emailOk || nameIssue) return;

    const email = normalizeEmail(form.email);
    const name = normalizeName(form.name);
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login/start', {
        email,
        name,
      });
      setForm(f => ({ ...f, email, name }));
      setOptions(data.options);
      setStep('numbers');
    } catch (err) {
      const { code, message } = err.response?.data || {};
      if (code === 'INVALID_EMAIL') {
        setEmailMsg(message);
        setEmailHint('');
      } else if (code === 'INVALID_NAME') {
        setNameMsg(message);
      } else {
        setError(message || 'Could not send code.');
      }
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
        name: normalizeName(form.name),
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
        name: normalizeName(form.name),
      });
      setOptions(data.options);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Same header as every other public page — gives this page the site's
          look and, via the logo/links, a way back that isn't just the
          browser's back button. */}
      <div className="login-topnav"><SiteNav /></div>

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
            <form className="otp-form" onSubmit={handleStart} noValidate>
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={onEmailChange}
                onBlur={onEmailBlur}
                className={emailMsg ? 'input-invalid' : undefined}
                aria-invalid={emailMsg ? 'true' : undefined}
                aria-describedby={emailMsg ? 'login-email-msg' : undefined}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
              />
              {emailMsg && (
                <p id="login-email-msg" className="login-error" role="alert">
                  {emailHint ? (
                    <>
                      Did you mean{' '}
                      <button type="button" className="login-suggest" onClick={useSuggestion}>{emailHint}</button>?
                      {' '}If your address is correct, press Send Code again.
                    </>
                  ) : emailMsg}
                </p>
              )}
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={onNameChange}
                onBlur={onNameBlur}
                className={nameMsg ? 'input-invalid' : undefined}
                aria-invalid={nameMsg ? 'true' : undefined}
                aria-describedby={nameMsg ? 'login-name-msg' : undefined}
                autoComplete="name"
                maxLength={80}
              />
              {nameMsg && <p id="login-name-msg" className="login-error" role="alert">{nameMsg}</p>}
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
    </div>
  );
}

export default Login;
