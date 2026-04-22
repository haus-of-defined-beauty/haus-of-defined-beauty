import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfilePanel.css';

function ProfilePanel({ isAdmin }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');

  const endpoint = isAdmin ? '/api/admin/profile' : '/api/customers/profile';

  useEffect(() => {
    axios.get(endpoint)
      .then(res => {
        setProfile(res.data);
        setForm({ name: res.data.name || '', phone: res.data.phone || '' });
      })
      .catch(() => setError('Failed to load profile.'));
  }, [endpoint]);

  const handleSave = () => {
    axios.put(endpoint, form)
      .then(res => {
        setProfile(res.data);
        setEditing(false);
      })
      .catch(() => setError('Failed to save profile.'));
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
          <div className="profile-actions">
            <button className="btn-primary" onClick={handleSave}>Save</button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="profile-info">
          <p><span>Name:</span> {profile.name}</p>
          <p><span>Email:</span> {profile.email}</p>
          {!isAdmin && <p><span>Phone:</span> {profile.phone || '—'}</p>}
          <button className="btn-primary" onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}
    </div>
  );
}

export default ProfilePanel;
