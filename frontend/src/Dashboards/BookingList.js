import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RescheduleModal from './RescheduleModal';
import './BookingList.css';

const STATUS_COLORS = {
  pending: '#e67e22',
  confirmed: '#27ae60',
  cancelled: '#c0392b',
  completed: '#2980b9',
  'no-show': '#7f8c8d',
};

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'];

const CANCELLATION_WINDOW_HOURS = 24;

// Matches the server's rule (bookingController): cancelling inside the window
// is allowed but costs the booking fee, so the customer is told which it is
// before they commit rather than after.
function feeIsForfeited(booking) {
  const [h, m] = String(booking.time || '00:00').split(':').map(Number);
  const when = new Date(booking.date);
  when.setHours(h, m, 0, 0);
  return (when - new Date()) / 36e5 < CANCELLATION_WINDOW_HOURS;
}

function BookingList({ isAdmin }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const endpoint = isAdmin ? '/api/bookings' : '/api/bookings/my';

  const load = () => {
    axios.get(endpoint)
      // Newest appointment first — the one a customer is looking for is
      // almost always the most recent, not the oldest.
      .then(res => setBookings([...res.data].sort((a, b) => {
        const byDate = new Date(b.date) - new Date(a.date);
        return byDate !== 0 ? byDate : String(b.time).localeCompare(String(a.time));
      })))
      .catch(() => setError('Failed to load bookings.'));
  };

  useEffect(() => { load(); }, [endpoint]);

  const confirmCancel = () => {
    if (!cancelTarget) return;
    setCancelling(true);
    axios.patch(`/api/bookings/${cancelTarget._id}/cancel`)
      .then(() => { setCancelTarget(null); load(); })
      .catch(err => setError(err.response?.data?.message || 'Cancel failed.'))
      .finally(() => setCancelling(false));
  };

  const handleStatusChange = (id, status) => {
    axios.put(`/api/bookings/${id}`, { status })
      .then(load)
      .catch(err => alert(err.response?.data?.message || 'Status update failed.'));
  };

  if (error) return <p className="error-msg">{error}</p>;
  if (!bookings.length) return <p className="empty-msg">No bookings found.</p>;

  return (
    <div className="booking-list">
      <h3>{isAdmin ? 'All Bookings' : 'My Bookings'}</h3>
      {rescheduleTarget && (
        <RescheduleModal
          booking={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={() => { setRescheduleTarget(null); load(); }}
        />
      )}

      {/* Cancelling is irreversible and may cost the booking fee, so it
          confirms first and says which — in the system's own styling rather
          than a browser alert. */}
      {cancelTarget && (
        <div className="bl-overlay" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bl-confirm" onClick={e => e.stopPropagation()}>
            <h4>Cancel this booking?</h4>
            <div className="bl-confirm-details">
              <p>{cancelTarget.serviceId?.name || 'Service'}</p>
              <p>{new Date(cancelTarget.date).toLocaleDateString('en-ZA')} at {cancelTarget.time}</p>
            </div>
            <p className={`bl-fee-note${feeIsForfeited(cancelTarget) ? ' forfeit' : ''}`}>
              {feeIsForfeited(cancelTarget)
                ? 'This is within 24 hours of your appointment, so the R100 booking fee will be forfeited.'
                : 'Your R100 booking fee will be refunded.'}
            </p>
            <div className="bl-confirm-btns">
              <button className="btn-secondary" disabled={cancelling} onClick={() => setCancelTarget(null)}>
                Keep booking
              </button>
              <button className="btn-cancel" disabled={cancelling} onClick={confirmCancel}>
                {cancelling ? 'Cancelling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
      <table>
        <thead>
          <tr>
            {isAdmin && <th>Customer</th>}
            <th>Service</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b._id}>
              {/* data-label drives the stacked card layout at phone width
                  (see BookingList.css), where there's no room for columns. */}
              {isAdmin && <td data-label="Customer">{b.customerId?.name || '—'}</td>}
              <td data-label="Service">{b.serviceId?.name || '—'}</td>
              <td data-label="Date">{new Date(b.date).toLocaleDateString('en-ZA')}</td>
              <td data-label="Time">{b.time}</td>
              <td data-label="Status">
                {isAdmin ? (
                  <select
                    className="status-select"
                    style={{ borderColor: STATUS_COLORS[b.status], color: STATUS_COLORS[b.status] }}
                    value={b.status}
                    onChange={e => handleStatusChange(b._id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className="status-badge" style={{ background: STATUS_COLORS[b.status] }}>
                    {b.status}
                  </span>
                )}
              </td>
              <td className="action-cell" data-label="Action">
                {['pending', 'confirmed'].includes(b.status) && !isAdmin && (
                  <button className="btn-reschedule" onClick={() => setRescheduleTarget(b)}>Reschedule</button>
                )}
                {['pending', 'confirmed'].includes(b.status) && !isAdmin && (
                  <button className="btn-cancel" onClick={() => setCancelTarget(b)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookingList;
