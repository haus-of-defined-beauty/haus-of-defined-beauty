import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
import './Auth.css';

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
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [form, setForm] = useState({ email: '', name: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [noProfile, setNoProfile] = useState(false); // show a way to sign up instead
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
    setNoProfile(false);
    setError('');
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
    setNoProfile(false);
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
      setCode('');
      setStep('code');
    } catch (err) {
      const { code, message } = err.response?.data || {};
      if (code === 'INVALID_EMAIL') {
        setEmailMsg(message);
        setEmailHint('');
      } else if (code === 'INVALID_NAME') {
        setNameMsg(message);
      } else if (code === 'NO_PROFILE') {
        // Nothing to sign in to yet — point them at sign-up rather than
        // leaving a dead end.
        setNoProfile(true);
        setError(message || "We couldn't find a profile for that email address.");
      } else {
        setError(message || 'Could not send code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async e => {
    e.preventDefault();
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login/verify', {
        email: form.email,
        code,
        name: normalizeName(form.name),
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      navigate(data.user.role === 'admin' ? '/admin' : '/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'That code could not be checked. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/login/start', {
        email: form.email,
        name: normalizeName(form.name),
      });
      setCode('');
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
      <section className="auth-hero site-marble">
        <div className="auth-hero-inner">
          <button type="button" className="auth-back" onClick={goBack}>
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

            <div className="auth-center">
              <h2>Welcome</h2>
              <p className="auth-subtitle">
                {step === 'email'
                  ? 'Sign in with your email to continue'
                  : `We emailed a 6-digit code to ${form.email} — enter it below`}
              </p>

              {/* Carried over from the sign-up screen, which sends people
                  here once their email is confirmed. */}
              {location.state?.profileCreated && step === 'email' && (
                <p className="auth-flash" role="status">
                  Your profile is ready{location.state.name ? `, ${location.state.name}` : ''} — sign in below to get started.
                </p>
              )}

              <div className="auth-card">
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
                      <p id="login-email-msg" className="auth-error" role="alert">
                        {emailHint ? (
                          <>
                            Did you mean{' '}
                            <button type="button" className="auth-suggest" onClick={useSuggestion}>{emailHint}</button>?
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
                    {nameMsg && <p id="login-name-msg" className="auth-error" role="alert">{nameMsg}</p>}
                    {error && (
                      <p className="auth-error" role="alert">
                        {error}
                        {noProfile && (
                          <>
                            {' '}
                            <Link className="auth-error-link" to="/signup" state={{ email: normalizeEmail(form.email), name: form.name }}>
                              Create one here
                            </Link>.
                          </>
                        )}
                      </p>
                    )}
                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? 'Sending…' : 'Send Code'}
                    </button>
                  </form>
                )}

                {step === 'code' && (
                  <form className="otp-form" onSubmit={handleVerify} noValidate>
                    <input
                      className="code-input"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      maxLength={6}
                      value={code}
                      autoFocus
                      onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                      aria-label="6-digit code from your email"
                    />
                    {error && <p className="auth-error" role="alert">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={loading || code.length !== 6}>
                      {loading ? 'Checking…' : 'Sign In'}
                    </button>
                    <div className="otp-links">
                      <button type="button" className="otp-link" onClick={() => { setStep('email'); setCode(''); setError(''); }}>
                        Change email
                      </button>
                      <button type="button" className="otp-link" onClick={handleResend} disabled={loading}>
                        Resend code
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <p className="auth-hint">No password needed — just your email.</p>

              {step === 'email' && (
                <p className="auth-alt">
                  Don't have a profile yet?{' '}
                  <Link className="auth-alt-link" to="/signup">Create one here</Link>
                </p>
              )}
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
