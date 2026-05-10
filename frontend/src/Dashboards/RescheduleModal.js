import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RescheduleModal.css';

function RescheduleModal({ booking, onClose, onSuccess }) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) { setSlots([]); setTime(''); return; }
    axios.get(`/api/calendar/${date}`)
      .then(res => setSlots(res.data.availableSlots || []))
      .catch(() => setSlots([]));
  }, [date]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.put(`/api/bookings/${booking._id}`, { date, time });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Reschedule failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Reschedule Appointment</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-current">
          <span className="modal-label">Current booking</span>
          <p className="modal-current-detail">
            {booking.serviceId?.name || 'Service'} &mdash;&nbsp;
            {new Date(booking.date).toLocaleDateString('en-ZA')} at {booking.time}
          </p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>New Date
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              required
            />
          </label>

          <label>New Time Slot
            <select value={time} onChange={e => setTime(e.target.value)} required disabled={!slots.length}>
              <option value="">{slots.length ? 'Select a time slot…' : 'Pick a date first'}</option>
              {slots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving…' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RescheduleModal;
