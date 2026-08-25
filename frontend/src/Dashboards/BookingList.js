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

function BookingList({ isAdmin }) {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const endpoint = isAdmin ? '/api/bookings' : '/api/bookings/my';

  const load = () => {
    axios.get(endpoint)
      .then(res => setBookings(res.data))
      .catch(() => setError('Failed to load bookings.'));
  };

  useEffect(() => { load(); }, [endpoint]);

  const handleCancel = id => {
    if (!window.confirm('Cancel this booking?')) return;
    axios.patch(`/api/bookings/${id}/cancel`)
      .then(load)
      .catch(err => alert(err.response?.data?.message || 'Cancel failed.'));
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
              {isAdmin && <td>{b.customerId?.name || '—'}</td>}
              <td>{b.serviceId?.name || '—'}</td>
              <td>{new Date(b.date).toLocaleDateString('en-ZA')}</td>
              <td>{b.time}</td>
              <td>
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
              <td className="action-cell">
                {['pending', 'confirmed'].includes(b.status) && !isAdmin && (
                  <button className="btn-reschedule" onClick={() => setRescheduleTarget(b)}>Reschedule</button>
                )}
                {['pending', 'confirmed'].includes(b.status) && !isAdmin && (
                  <button className="btn-cancel" onClick={() => handleCancel(b._id)}>Cancel</button>
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
