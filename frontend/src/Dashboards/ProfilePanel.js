import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { nameProblem, normalizeName } from '../utils/nameCheck';
import './ProfilePanel.css';

// Which services an admin works on. Availability is per-artist, so this is
// what decides whose open slots a customer sees for a given service.
const SPECIALTIES = [
  { key: 'nails', label: 'Nails' },
  { key: 'hair', label: 'Hair' },
  { key: 'makeup', label: 'Makeup' },
  { key: 'lashes', label: 'Lashes' },
];

const specialtyLabel = key => (SPECIALTIES.find(s => s.key === key) || {}).label || key;

function ProfilePanel({ isAdmin }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', specialties: [] });
  const [error, setError] = useState('');

  const endpoint = isAdmin ? '/api/admin/profile' : '/api/customers/profile';

  const formFrom = data => ({
    name: data.name || '',
    phone: data.phone || '',
    specialties: data.specialties || [],
  });

  useEffect(() => {
    axios.get(endpoint)
      .then(res => {
        setProfile(res.data);
        setForm(formFrom(res.data));
      })
      .catch(() => setError('Failed to load profile.'));
  }, [endpoint]);

  const toggleSpecialty = key => {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(key)
        ? f.specialties.filter(s => s !== key)
        : [...f.specialties, key],
    }));
  };

  const handleSave = () => {
    const problem = nameProblem(form.name);
    if (problem) {
      setError(problem);
      return;
    }
    if (isAdmin && !form.specialties.length) {
      setError('Choose at least one service type — otherwise none of your availability can be booked.');
      return;
    }
    setError('');
    const body = isAdmin
      ? { name: normalizeName(form.name), specialties: form.specialties }
      : { ...form, name: normalizeName(form.name) };
    axios.put(endpoint, body)
      .then(res => {
        setProfile(res.data);
        setForm(formFrom(res.data));
        setEditing(false);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to save profile.'));
  };

  if (!profile) return <p className="loading">Loading profile…</p>;

  return (
    <div className="profile-panel">
      <h3>My Profile</h3>
      {error && <p className="error-msg">{error}</p>}
      {editing ? (
        <div className="profile-form">
          <label>Name
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          {!isAdmin && (
            <label>Phone
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </label>
          )}
          {isAdmin && (
            <fieldset className="profile-specialties">
              <legend>Services I do</legend>
              <p className="profile-hint">
                Customers booking these services see the time slots you open. Anything
                you don't do stays with the other artist.
              </p>
              <div className="profile-specialty-list">
                {SPECIALTIES.map(s => (
                  <label key={s.key} className="profile-specialty">
                    <input
                      type="checkbox"
                      checked={form.specialties.includes(s.key)}
                      onChange={() => toggleSpecialty(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="profile-actions">
            <button className="btn-primary" onClick={handleSave}>Save</button>
            <button className="btn-secondary" onClick={() => { setEditing(false); setError(''); setForm(formFrom(profile)); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="profile-info">
          <p><span>Name:</span> {profile.name}</p>
          <p><span>Email:</span> {profile.email}</p>
          {!isAdmin && <p><span>Phone:</span> {profile.phone || '—'}</p>}
          {isAdmin && (
            <p>
              <span>Services I do:</span>{' '}
              {(profile.specialties || []).length
                ? profile.specialties.map(specialtyLabel).join(', ')
                : '—'}
            </p>
          )}
          <button className="btn-primary" onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}

export default ProfilePanel;
