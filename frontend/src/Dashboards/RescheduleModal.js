import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RescheduleModal.css';

function minSelectableDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1); // bookings must be made at least a day in advance
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function RescheduleModal({ booking, onClose, onSuccess }) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) { setSlots([]); setTime(''); return; }
    axios.get(`/api/calendar/${date}`)
      .then(res => setSlots((res.data.slots || []).filter(s => s.status === 'available').map(s => s.start)))
      .catch(() => setSlots([]));
  }, [date]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.put(`/api/bookings/${booking._id}/reschedule`, { date, time });
      onSuccess();
    } catch (err) {
      if (err.response?.data?.code === 'SLOT_UNAVAILABLE') {
        setError('SLOT_UNAVAILABLE');
      } else {
        setError(err.response?.data?.message || 'Reschedule failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInstead = async () => {
    setLoading(true);
    try {
      await axios.patch(`/api/bookings/${booking._id}/cancel`);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed.');
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
              min={minSelectableDate()}
              onChange={e => setDate(e.target.value)}
              required
            />
          </label>

          <label>New Time Slot
            <select value={time} onChange={e => setTime(e.target.value)} required disabled={!slots.length}>
              <option value="">
                {!date ? 'Pick a date first' : slots.length ? 'Select a time slot…' : 'No slots available'}
              </option>
              {slots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {error === 'SLOT_UNAVAILABLE' || (date && !slots.length) ? (
            <div className="modal-error">
              <p>No matching time slot available for your needs.</p>
              <button type="button" className="btn-outline" onClick={handleCancelInstead} disabled={loading}>
                Cancel this booking instead
              </button>
            </div>
          ) : error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !slots.length}>
              {loading ? 'Saving…' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RescheduleModal;
