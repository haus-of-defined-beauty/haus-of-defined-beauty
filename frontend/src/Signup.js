import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import SiteNav from './Site/SiteNav';
import SiteFooter from './Site/SiteFooter';
import polaroid1 from './assets/home/service-nails.jpg';
import polaroid2 from './assets/home/polaroid-2.jpg';
import polaroid3 from './assets/home/service-eyelashes.jpg';
import { emailProblem, suggestEmail, normalizeEmail } from './utils/emailCheck';
import { nameProblem, normalizeName } from './utils/nameCheck';
import { phoneProblem, normalizePhone } from './utils/phoneCheck';
import './Auth.css';

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  // Anything already typed on the sign-in screen before we found there was
  // no profile for it — no reason to make them type it twice.
  const handedOver = location.state || {};

  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  const [step, setStep] = useState('details'); // 'details' | 'numbers'
  const [form, setForm] = useState({
    email: handedOver.email || '',
    name: handedOver.name || '',
    phone: '',
  });
  const [options, setOptions] = useState([]);
  const [error, setError] = useState('');
  const [alreadyExists, setAlreadyExists] = useState(false); // offer sign-in instead
  const [loading, setLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailHint, setEmailHint] = useState('');  // a likely typo fix, e.g. name@gmail.com
  const [keptEmail, setKeptEmail] = useState('');  // typo-looking address they chose to keep
  const [nameMsg, setNameMsg] = useState('');
  const [phoneMsg, setPhoneMsg] = useState('');

  const onEmailChange = e => {
    setForm({ ...form, email: e.target.value });
    setEmailMsg('');
    setEmailHint('');
    setAlreadyExists(false);
    setError('');
  };
  const onNameChange = e => { setForm({ ...form, name: e.target.value }); setNameMsg(''); };
  const onPhoneChange = e => { setForm({ ...form, phone: e.target.value }); setPhoneMsg(''); };

  // On leaving a box: only nag once something has been typed.
  const onEmailBlur = () => { if (form.email.trim()) setEmailMsg(emailProblem(form.email)); };
  const onNameBlur  = () => { if (form.name.trim()) setNameMsg(nameProblem(form.name)); };
  const onPhoneBlur = () => { if (form.phone.trim()) setPhoneMsg(phoneProblem(form.phone)); };

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
    setAlreadyExists(false);
    // Check every box so all the problems show at once.
    const emailOk = emailIsOk();
    const nameIssue = nameProblem(form.name);
    const phoneIssue = phoneProblem(form.phone);
    setNameMsg(nameIssue);
    setPhoneMsg(phoneIssue);
    if (!emailOk || nameIssue || phoneIssue) return;

    const email = normalizeEmail(form.email);
    const name = normalizeName(form.name);
    const phone = normalizePhone(form.phone);
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/signup/start', { email, name, phone });
      setForm({ email, name, phone });
      setOptions(data.options);
      setStep('numbers');
    } catch (err) {
      const { code, message } = err.response?.data || {};
      if (code === 'INVALID_EMAIL') { setEmailMsg(message); setEmailHint(''); }
      else if (code === 'INVALID_NAME') setNameMsg(message);
      else if (code === 'INVALID_PHONE') setPhoneMsg(message);
      else if (code === 'PROFILE_EXISTS') {
        setAlreadyExists(true);
        setError(message || 'There is already a profile for that email address.');
      } else setError(message || 'Could not send the confirmation code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async selected => {
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/signup/verify', { email: form.email, selected });
      // The profile exists now but isn't signed in — signing in is its own
      // step, so hand over to the sign-in screen with a note of what happened.
      navigate('/login', { state: { profileCreated: true, name: form.name } });
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
      const { data } = await axios.post('/api/auth/signup/start', {
        email: form.email,
        name: form.name,
        phone: form.phone,
      });
      setOptions(data.options);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site">
      <SiteNav />

      <main>
        <section className="auth-hero site-marble">
          <div className="auth-hero-inner">
            <button type="button" className="auth-back" onClick={goBack}>
              <span aria-hidden="true">←</span> Back
            </button>

            <div className="signup-stage">
              <div className="auth-center">
                <h2>Create a Profile</h2>
                <p className="auth-subtitle">
                  {step === 'details'
                    ? 'Create a profile with just your name, email address and number — no password needed'
                    : `We emailed a number to ${form.email} — click the matching one below to confirm it`}
                </p>

                <div className="auth-card">
                  {step === 'details' && (
                    <form className="otp-form" onSubmit={handleStart} noValidate>
                      <input
                        type="email"
                        placeholder="Email address"
                        value={form.email}
                        onChange={onEmailChange}
                        onBlur={onEmailBlur}
                        className={emailMsg ? 'input-invalid' : undefined}
                        aria-invalid={emailMsg ? 'true' : undefined}
                        aria-describedby={emailMsg ? 'signup-email-msg' : undefined}
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      {emailMsg && (
                        <p id="signup-email-msg" className="auth-error" role="alert">
                          {emailHint ? (
                            <>
                              Did you mean{' '}
                              <button type="button" className="auth-suggest" onClick={useSuggestion}>{emailHint}</button>?
                              {' '}If your address is correct, press Sign Up again.
                            </>
                          ) : emailMsg}
                        </p>
                      )}

                      <input
                        type="text"
                        placeholder="Name"
                        value={form.name}
                        onChange={onNameChange}
                        onBlur={onNameBlur}
                        className={nameMsg ? 'input-invalid' : undefined}
                        aria-invalid={nameMsg ? 'true' : undefined}
                        aria-describedby={nameMsg ? 'signup-name-msg' : undefined}
                        autoComplete="name"
                        maxLength={80}
                      />
                      {nameMsg && <p id="signup-name-msg" className="auth-error" role="alert">{nameMsg}</p>}

                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={form.phone}
                        onChange={onPhoneChange}
                        onBlur={onPhoneBlur}
                        className={phoneMsg ? 'input-invalid' : undefined}
                        aria-invalid={phoneMsg ? 'true' : undefined}
                        aria-describedby={phoneMsg ? 'signup-phone-msg' : undefined}
                        autoComplete="tel"
                        maxLength={30}
                      />
                      {phoneMsg && <p id="signup-phone-msg" className="auth-error" role="alert">{phoneMsg}</p>}

                      {error && (
                        <p className="auth-error" role="alert">
                          {error}
                          {alreadyExists && (
                            <>
                              {' '}
                              <Link className="auth-error-link" to="/login">Sign in instead</Link>.
                            </>
                          )}
                        </p>
                      )}

                      <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Sending…' : 'Sign Up'}
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
                      {error && <p className="auth-error" role="alert">{error}</p>}
                      <div className="otp-links">
                        <button type="button" className="otp-link" onClick={() => { setStep('details'); setOptions([]); setError(''); }}>
                          Change details
                        </button>
                        <button type="button" className="otp-link" onClick={handleResend} disabled={loading}>
                          Resend code
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <p className="auth-hint">We'll only use your number to reach you about your bookings.</p>

                {step === 'details' && (
                  <p className="auth-alt">
                    Already have a profile?{' '}
                    <Link className="auth-alt-link" to="/login">Sign in here</Link>
                  </p>
                )}
              </div>

              {/* Decorative — the same real salon photos used elsewhere on the site. */}
              <div className="signup-polaroids" aria-hidden="true">
                <div className="polaroid sp1"><img src={polaroid1} alt="" /></div>
                <div className="polaroid sp2"><img src={polaroid2} alt="" /></div>
                <div className="polaroid sp3"><img src={polaroid3} alt="" /></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Signup;
