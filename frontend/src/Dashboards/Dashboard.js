import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This week' },
];

const STATUS_COLORS = {
  pending: '#e67e22',
  confirmed: '#27ae60',
  cancelled: '#c0392b',
  completed: '#2980b9',
  'no-show': '#7f8c8d',
};

const fmtDate = d => new Date(d).toLocaleDateString('en-ZA');
const fmtAmount = n => (n ? `R${Number(n).toLocaleString()}` : '—');

function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [history, setHistory] = useState([]);
  const [cancelled, setCancelled] = useState({ total: 0, rows: [] });
  const [error, setError] = useState('');
  const [refunding, setRefunding] = useState(null);

  const loadSchedule = useCallback((p, d) => {
    const params = p === 'date' ? { period: 'date', date: d } : { period: p };
    if (p === 'date' && !d) return;
    axios.get('/api/dashboard/schedule', { params })
      .then(res => setSchedule(res.data))
      .catch(() => setError('Failed to load schedule.'));
  }, []);

  const loadHistory = useCallback(() => {
    axios.get('/api/dashboard/history').then(res => setHistory(res.data)).catch(() => {});
  }, []);

  const loadCancelled = useCallback(() => {
    axios.get('/api/dashboard/cancelled').then(res => setCancelled(res.data)).catch(() => {});
  }, []);

  useEffect(() => { loadSchedule(period, customDate); }, [period, loadSchedule]);
  useEffect(() => { loadHistory(); loadCancelled(); }, [loadHistory, loadCancelled]);

  const handlePeriod = key => { setPeriod(key); setCustomDate(''); };
  const handlePickDate = e => {
    const val = e.target.value;
    setCustomDate(val);
    setPeriod('date');
    if (val) loadSchedule('date', val);
  };

  const markRefunded = paymentId => {
    setRefunding(paymentId);
    axios.patch(`/api/dashboard/refund/${paymentId}`)
      .then(loadCancelled)
      .catch(() => alert('Failed to mark as refunded.'))
      .finally(() => setRefunding(null));
  };

  return (
    <div className="dash">
      <h3>Dashboard</h3>
      {error && <p className="error-msg">{error}</p>}

      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h4>Up to date schedule</h4>
            <p className="dash-card-sub">Bookings for the selected period</p>
          </div>
          <div className="dash-period-controls">
            {PERIODS.map(p => (
              <button key={p.key} className={`dash-period-btn ${period === p.key ? 'active' : ''}`} onClick={() => handlePeriod(p.key)}>
                {p.label}
              </button>
            ))}
            <input type="date" className="dash-date-picker" value={customDate} onChange={handlePickDate} />
          </div>
        </div>
        {!schedule.length ? (
          <p className="empty-msg">No bookings for this period.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr><th>Time</th><th>Client</th><th>Service</th><th>Status</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {schedule.map(b => (
                  <tr key={b.id}>
                    <td>
                      <span className="dash-time">{b.time}</span>
                      {b.duration ? <span className="dash-duration">{b.duration} min</span> : null}
                    </td>
                    <td>{b.client}</td>
                    <td>{b.service}</td>
                    <td>
                      <span className="dash-status" style={{ background: STATUS_COLORS[b.status] }}>{b.status}</span>
                    </td>
                    <td>{fmtAmount(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dash-row">
        <div className="dash-card dash-half">
          <div className="dash-card-header">
            <div>
              <h4>Booking history</h4>
              <p className="dash-card-sub">Recently completed appointments</p>
            </div>
          </div>
          {!history.length ? (
            <p className="empty-msg">No completed appointments yet.</p>
          ) : (
            <ul className="dash-list">
              {history.map(h => (
                <li key={h.id} className="dash-list-row">
                  <span className="dash-list-check">✓</span>
                  <div className="dash-list-main">
                    <div className="dash-list-title">{h.client}</div>
                    <div className="dash-list-sub">{h.service}</div>
                  </div>
                  <div className="dash-list-end">
                    <div className="dash-list-amount">{fmtAmount(h.amount)}</div>
                    <div className="dash-list-date">{fmtDate(h.date)} · {h.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dash-card dash-half">
          <div className="dash-card-header">
            <div>
              <h4>Cancelled bookings</h4>
              <p className="dash-card-sub">Awaiting refund · {fmtAmount(cancelled.total)} total</p>
            </div>
            {cancelled.rows.length > 0 && <span className="dash-pending-badge">{cancelled.rows.length} pending</span>}
          </div>
          {!cancelled.rows.length ? (
            <p className="empty-msg">No refunds pending.</p>
          ) : (
            <ul className="dash-list">
              {cancelled.rows.map(c => (
                <li key={c.bookingId} className="dash-list-row">
                  <span className="dash-list-x">✕</span>
                  <div className="dash-list-main">
                    <div className="dash-list-title">{c.client}</div>
                    <div className="dash-list-sub">{c.service} · cancelled {fmtDate(c.date)}</div>
                  </div>
                  <div className="dash-list-end">
                    <div className="dash-list-amount">{fmtAmount(c.amount)}</div>
                    <button
                      className="dash-refund-btn"
                      disabled={refunding === c.paymentId}
                      onClick={() => markRefunded(c.paymentId)}
                    >
                      {refunding === c.paymentId ? 'Marking…' : 'Mark refunded'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button className="dash-calendar-link" onClick={() => navigate('/admin/calendar')}>
        View full calendar →
      </button>
    </div>
  );
}

export default Dashboard;
