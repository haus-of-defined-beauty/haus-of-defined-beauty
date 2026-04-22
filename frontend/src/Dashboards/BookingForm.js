import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingForm.css';

function BookingForm() {
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ serviceId: '', date: '', time: '', notes: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/bookings/services')
      .then(res => setServices(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.date) return;
    axios.get(`/api/calendar/${form.date}`)
      .then(res => setSlots(res.data.availableSlots || []))
      .catch(() => setSlots([]));
  }, [form.date]);

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    setStatus('');
    axios.post('/api/bookings', form)
      .then(() => {
        setStatus('Booking created! Complete your R100 deposit to confirm.');
        setForm({ serviceId: '', date: '', time: '', notes: '' });
      })
      .catch(err => setError(err.response?.data?.message || 'Booking failed.'));
  };

  return (
    <div className="booking-form-container">
      <h3>Book an Appointment</h3>
      {status && <p className="success-msg">{status}</p>}
      {error && <p className="error-msg">{error}</p>}
      <form className="booking-form" onSubmit={handleSubmit}>
        <label>Service
          <select value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })} required>
            <option value="">Select a service…</option>
            {services.map(s => (
              <option key={s._id} value={s._id}>{s.name} — {s.category}</option>
            ))}
          </select>
        </label>
        <label>Date
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label>Time
          <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required>
            <option value="">Select a time slot…</option>
            {slots.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <label>Notes (optional)
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
        </label>
        <button type="submit" className="btn-primary">Request Booking</button>
      </form>
    </div>
  );
}

export default BookingForm;
