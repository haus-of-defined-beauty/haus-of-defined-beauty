import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SiteNav from './Site/SiteNav';
import SiteFooter from './Site/SiteFooter';
import polaroid1 from './assets/home/polaroid-1.jpg';
import polaroid2 from './assets/home/polaroid-2.jpg';
import polaroid3 from './assets/home/polaroid-3.jpg';
import polaroid4 from './assets/about/polaroid-1.jpg';
import polaroid5 from './assets/about/polaroid-2.jpg';
import polaroid6 from './assets/home/service-nails.jpg';
import { emailProblem, suggestEmail, normalizeEmail } from './utils/emailCheck';
import { nameProblem, normalizeName } from './utils/nameCheck';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // True "back to where I came from" (e.g. Home → Book Now → here → back
  // lands on Home again), not a hardcoded page. `location.key === 'default'`
  // means this tab has no in-app history to go back to (a fresh visit/direct
  // link/refresh), so fall back to Home instead of leaving/going nowhere.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  };
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
    // Same top-level wrapper every other public page uses (Home/About/etc.)
    // instead of this page's own one-off — gives it the site's fonts, link
    // resets and flex-column-with-footer layout for free, no overrides.
    <div className="site">
      <SiteNav />

      <main>
      <section className="login-hero site-marble">
        <div className="login-hero-inner">
          <button type="button" className="login-back" onClick={goBack}>
            <span aria-hidden="true">←</span> Back
          </button>

          <div className="login-stage">
            {/* Decorative — the same real salon photos used on Home/About,
                just scattered around the sign-in card here. */}
            <div className="login-polaroids" aria-hidden="true">
              <div className="polaroid lp1"><img src={polaroid1} alt="" /></div>
              <div className="polaroid lp2"><img src={polaroid2} alt="" /></div>
              <div className="polaroid lp3"><img src={polaroid3} alt="" /></div>
              <div className="polaroid lp4"><img src={polaroid4} alt="" /></div>
              <div className="polaroid lp5"><img src={polaroid5} alt="" /></div>
              <div className="polaroid lp6"><img src={polaroid6} alt="" /></div>
            </div>

            <div className="login-center">
              <h2>Welcome</h2>
              <p className="login-subtitle">
                {step === 'email'
                  ? 'Sign in with your email to continue'
                  : `We emailed a number to ${form.email} — click the matching one below`}
              </p>

              <div className="login-card">
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
              </div>

              <p className="login-hint">No password needed — just your email.</p>
            </div>
          </div>
        </div>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Login;
