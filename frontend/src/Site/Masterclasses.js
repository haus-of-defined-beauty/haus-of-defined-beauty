import React, { useState } from 'react';
import axios from 'axios';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import photo from '../assets/home/masterclass.jpg';
import { emailProblem, suggestEmail, normalizeEmail } from '../utils/emailCheck';
import { nameProblem, normalizeName } from '../utils/nameCheck';
import './Masterclasses.css';

function Masterclasses() {
  const [form, setForm] = useState({ name: '', surname: '', email: '', website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');
  const [emailMsg, setEmailMsg] = useState('');   // prompt shown under the email box
  const [emailHint, setEmailHint] = useState('');  // a likely typo fix, e.g. name@gmail.com
  const [keptEmail, setKeptEmail] = useState('');  // typo-looking address the user chose to keep
  const [nameMsg, setNameMsg] = useState('');
  const [surnameMsg, setSurnameMsg] = useState('');

  const update = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const onNameChange = e => { update('name')(e); setNameMsg(''); };
  const onNameBlur = () => { if (form.name.trim()) setNameMsg(nameProblem(form.name, 'name')); };
  const onSurnameChange = e => { update('surname')(e); setSurnameMsg(''); };
  const onSurnameBlur = () => { if (form.surname.trim()) setSurnameMsg(nameProblem(form.surname, 'surname')); };

  const onEmailChange = e => {
    update('email')(e);
    setEmailMsg('');
    setEmailHint('');
  };

  const onEmailBlur = () => {
    if (form.email.trim()) setEmailMsg(emailProblem(form.email));
  };

  const useSuggestion = () => {
    setForm(f => ({ ...f, email: emailHint }));
    setEmailMsg('');
    setEmailHint('');
  };

  // A likely typo is flagged once; pressing Apply again with the same address confirms it.
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

  const submit = async e => {
    e.preventDefault();
    setError('');
    // Check every box so all problems are shown at once.
    const nameIssue = nameProblem(form.name, 'name');
    const surnameIssue = nameProblem(form.surname, 'surname');
    setNameMsg(nameIssue);
    setSurnameMsg(surnameIssue);
    const emailOk = emailIsOk();
    if (nameIssue || surnameIssue || !emailOk) return;

    setStatus('sending');
    try {
      await axios.post('/api/masterclass/apply', {
        ...form,
        name: normalizeName(form.name),
        surname: normalizeName(form.surname),
        email: normalizeEmail(form.email),
      });
      setStatus('done');
    } catch (err) {
      const { code, message } = err.response?.data || {};
      if (code === 'INVALID_EMAIL') {
        setEmailMsg(message);
        setEmailHint('');
      } else if (code === 'INVALID_NAME') {
        setNameMsg(message);
      } else if (code === 'INVALID_SURNAME') {
        setSurnameMsg(message);
      } else {
        setError(message || 'Something went wrong. Please try again.');
      }
      setStatus('idle');
    }
  };

  return (
    <div className="site">
      <SiteNav />

      <main className="mc-main">
        <div className="mc-top site-marble">
          <div className="mc-stage">
            <section className="mc-photo">
              <img src={photo} alt="A nail technician building acrylic extensions on a client's hand" />
              <div className="mc-photo-copy">
                <h1>Masterclasses</h1>
                <p>Learn the techniques behind our most-requested looks — from acrylic application to lash mapping — in small, hands-on sessions led by our own technicians. No experience necessary, just a willingness to get your hands a little dirty.</p>
              </div>
            </section>

            <section className="mc-card">
              {status === 'done' ? (
                <div className="mc-success" role="status">
                  <h2>Thank you, {form.name.trim()}!</h2>
                  <p>Your application has been received. We'll be in touch by email.</p>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className="mc-field">
                    <label htmlFor="mc-name">Name:</label>
                    <input id="mc-name" type="text" maxLength={80} autoComplete="given-name"
                      value={form.name} onChange={onNameChange} onBlur={onNameBlur}
                      className={nameMsg ? 'input-invalid' : undefined}
                      aria-invalid={nameMsg ? 'true' : undefined}
                      aria-describedby={nameMsg ? 'mc-name-msg' : undefined} />
                    {nameMsg && <p id="mc-name-msg" className="mc-field-error" role="alert">{nameMsg}</p>}
                  </div>
                  <div className="mc-field">
                    <label htmlFor="mc-surname">Surname:</label>
                    <input id="mc-surname" type="text" maxLength={80} autoComplete="family-name"
                      value={form.surname} onChange={onSurnameChange} onBlur={onSurnameBlur}
                      className={surnameMsg ? 'input-invalid' : undefined}
                      aria-invalid={surnameMsg ? 'true' : undefined}
                      aria-describedby={surnameMsg ? 'mc-surname-msg' : undefined} />
                    {surnameMsg && <p id="mc-surname-msg" className="mc-field-error" role="alert">{surnameMsg}</p>}
                  </div>
                  <div className="mc-field">
                    <label htmlFor="mc-email">Email:</label>
                    <input id="mc-email" type="email" maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false}
                      value={form.email} onChange={onEmailChange} onBlur={onEmailBlur}
                      className={emailMsg ? 'input-invalid' : undefined}
                      aria-invalid={emailMsg ? 'true' : undefined}
                      aria-describedby={emailMsg ? 'mc-email-msg' : undefined} />
                    {emailMsg && (
                      <p id="mc-email-msg" className="mc-field-error" role="alert">
                        {emailHint ? (
                          <>
                            Did you mean{' '}
                            <button type="button" className="mc-suggest" onClick={useSuggestion}>{emailHint}</button>?
                            {' '}If your address is correct, press Apply again.
                          </>
                        ) : emailMsg}
                      </p>
                    )}
                  </div>

                  <input
                    type="text"
                    name="website"
                    className="mc-hp"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={form.website}
                    onChange={update('website')}
                  />

                  {error && <p className="mc-error" role="alert">{error}</p>}
                  <button type="submit" className="mc-submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Apply'}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Masterclasses;
