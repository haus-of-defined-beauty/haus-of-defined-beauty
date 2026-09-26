import React, { useState } from 'react';
import axios from 'axios';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import photo from '../assets/home/masterclass.jpg';
import './Masterclasses.css';

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

function Masterclasses() {
  const [form, setForm] = useState({ name: '', surname: '', email: '', website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');

  const update = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setStatus('sending');
    try {
      await axios.post('/api/masterclass/apply', form);
      setStatus('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
                <p>{LOREM}</p>
              </div>
            </section>

            <section className="mc-card">
              {status === 'done' ? (
                <div className="mc-success" role="status">
                  <h2>Thank you, {form.name.trim()}!</h2>
                  <p>Your application has been received. We'll be in touch by email.</p>
                </div>
              ) : (
                <form onSubmit={submit} noValidate={false}>
                  <div className="mc-field">
                    <label htmlFor="mc-name">Name:</label>
                    <input id="mc-name" type="text" required maxLength={80} autoComplete="given-name"
                      value={form.name} onChange={update('name')} />
                  </div>
                  <div className="mc-field">
                    <label htmlFor="mc-surname">Surname:</label>
                    <input id="mc-surname" type="text" required maxLength={80} autoComplete="family-name"
                      value={form.surname} onChange={update('surname')} />
                  </div>
                  <div className="mc-field">
                    <label htmlFor="mc-email">Email:</label>
                    <input id="mc-email" type="email" required maxLength={254} autoComplete="email"
                      value={form.email} onChange={update('email')} />
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
