import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.jpeg';
import './AdminCalendar.css';

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const GRID_START = 8 * 60;
const GRID_DURATION = 9 * 60;

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMiniCalDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const days = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toPercent(minutes) { return (minutes / GRID_DURATION) * 100; }

function slotToEvent(slot, dayIndex, dateIso) {
  const [sh, sm] = slot.start.split(':').map(Number);
  const [eh, em] = slot.end.split(':').map(Number);
  const startMin = sh * 60 + sm - GRID_START;
  const durationMin = (eh * 60 + em) - (sh * 60 + sm);
  const type = slot.status === 'booked' ? 'booked' : slot.status === 'blocked' ? 'blocked' : 'available';

  let booking = null;
  if (slot.status === 'booked' && slot.bookingId) {
    const b = slot.bookingId;
    booking = {
      id: b._id,
      name: b.customerId?.name || '—',
      date: new Date(b.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: `${slot.start} - ${slot.end}`,
      service: b.serviceId?.name || '—',
    };
  }

  return {
    id: slot._id,
    date: dateIso,
    dayIndex,
    startMin,
    durationMin,
    type,
    label: booking ? `${booking.name} — ${booking.service}` : '',
    text: `${slot.start} - ${slot.end}`,
    booking,
  };
}

export default function AdminCalendar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [events, setEvents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addStart, setAddStart] = useState('');
  const [addEnd, setAddEnd] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formError, setFormError] = useState('');
  const [slotError, setSlotError] = useState('');

  const weekDays = getWeekDays(weekStart);

  const loadWeek = useCallback(() => {
    const days = getWeekDays(weekStart);
    return Promise.all(
      days.map((d, dayIndex) => {
        const iso = isoDate(d);
        return axios.get(`/api/calendar/${iso}`)
          .then(res => (res.data.slots || []).map(slot => slotToEvent(slot, dayIndex, iso)))
          .catch(() => []);
      })
    ).then(perDay => setEvents(perDay.flat()));
  }, [weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  function weekLabel() {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const f = d => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    return `${f(weekStart)} - ${f(end)}`;
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }
  function goToday()  { setWeekStart(getMondayOf(new Date())); }

  function openAddForm() {
    setShowAddForm(true);
    setSelectedSlot(null);
    setSelectedBooking(null);
    setFormError('');
  }

  function handleEventClick(evt) {
    setShowAddForm(false);
    setFormError('');
    setSlotError('');
    if (evt.type === 'booked' && evt.booking) {
      setSelectedBooking(evt.booking);
      setSelectedSlot(null);
    } else {
      setSelectedSlot(evt);
      setSelectedBooking(null);
    }
  }

  async function handleRemoveSlot() {
    if (!selectedSlot) return;
    try {
      await axios.delete(`/api/calendar/${selectedSlot.date}/slots/${selectedSlot.id}`);
      setSelectedSlot(null);
      setSlotError('');
      await loadWeek();
    } catch (err) {
      setSlotError(err.response?.data?.message || 'Failed to remove slot.');
    }
  }

  async function handleAddConfirm() {
    setShowConfirm(false);
    if (!addDate || !addStart || !addEnd) return;
    try {
      await axios.post(`/api/calendar/${addDate}/slots`, { start: addStart, end: addEnd });
      setAddDate(''); setAddStart(''); setAddEnd('');
      setShowAddForm(false);
      setFormError('');
      await loadWeek();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add slot.');
    }
  }

  async function handleCancelBooking() {
    if (!selectedBooking) return;
    try {
      await axios.patch(`/api/bookings/${selectedBooking.id}/cancel`);
      setSelectedBooking(null);
      await loadWeek();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  }

  function formatConfirmDate() {
    if (!addDate) return '';
    return new Date(addDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Mini calendar — show month of last day of week
  const displayMonth = new Date(weekStart);
  displayMonth.setDate(displayMonth.getDate() + 6);
  const miniYear = displayMonth.getFullYear();
  const miniMonth = displayMonth.getMonth();
  const miniDays = getMiniCalDays(miniYear, miniMonth);

  return (
    <div className="ac-page">
      {/* Header */}
      <header className="ac-header">
        <div className="ac-header-left">
          <button className="ac-hamburger">&#9776;</button>
          <div className="ac-logo-box">
            <img src={logo} alt="Haus of Defined Beauty" className="ac-logo-img" />
          </div>
        </div>
        <div className="ac-header-center">
          <div className="ac-header-name">{user.name || 'TechNova Admin'}</div>
          <div className="ac-header-title">Update Calendar</div>
        </div>
        <button className="ac-header-back" onClick={() => navigate('/admin')}>BACK</button>
      </header>

      {/* Body */}
      <div className="ac-body">
        {/* Left Panel */}
        <div className="ac-left">
          {/* Mini calendar */}
          <div className="ac-mini-cal">
            <div className="ac-mini-header">{MONTH_NAMES[miniMonth].toUpperCase()} {miniYear}</div>
            <div className="ac-mini-grid">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <span key={i} className="ac-mini-dow">{d}</span>
              ))}
              {miniDays.map((d, i) => (
                <span key={i} className={`ac-mini-day${d === null ? ' empty' : ''}`}>{d ?? ''}</span>
              ))}
            </div>
          </div>

          <button className="ac-add-btn" onClick={openAddForm}>Add Time Slot</button>

          {/* Add form */}
          {showAddForm && (
            <div className="ac-add-form">
              <div className="ac-form-row">
                <input type="date" className="ac-date-input" value={addDate} onChange={e => setAddDate(e.target.value)} />
                <button className="ac-form-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
              <div className="ac-form-row">
                <input type="time" className="ac-time-input" value={addStart} onChange={e => setAddStart(e.target.value)} />
                <span className="ac-time-sep">-</span>
                <input type="time" className="ac-time-input" value={addEnd} onChange={e => setAddEnd(e.target.value)} />
                <button className="ac-form-add" onClick={() => addDate && addStart && addEnd && setShowConfirm(true)}>Add</button>
              </div>
              {formError && <p className="ac-form-error">{formError}</p>}
            </div>
          )}

          {/* Selected available slot details */}
          {selectedSlot && !showAddForm && (
            <div className="ac-slot-detail">
              <div className="ac-slot-detail-time">{selectedSlot.text}</div>
              <div className="ac-slot-detail-btns">
                <button className="ac-detail-btn">Change</button>
                <button className="ac-detail-btn dark" onClick={handleRemoveSlot}>Remove</button>
              </div>
              {slotError && <p className="ac-form-error">{slotError}</p>}
            </div>
          )}

          {/* Booking details panel */}
          {selectedBooking && (
            <div className="ac-booking-detail">
              <h4 className="ac-booking-detail-title">Booking Details</h4>
              <p><span className="ac-bd-key">Name:</span> {selectedBooking.name}</p>
              <p><span className="ac-bd-key">Date:</span> {selectedBooking.date}</p>
              <p><span className="ac-bd-key">Time:</span> {selectedBooking.time}</p>
              <p><span className="ac-bd-key">Services:</span> {selectedBooking.service}</p>
              <button className="ac-cancel-booking" onClick={handleCancelBooking}>Cancel</button>
            </div>
          )}
        </div>

        {/* Right — Week Grid */}
        <div className="ac-right">
          <div className="ac-week-nav">
            <button className="ac-today-btn" onClick={goToday}>Today</button>
            <button className="ac-nav-btn" onClick={prevWeek}>&#8249;</button>
            <span className="ac-week-label">{weekLabel()}</span>
            <button className="ac-nav-btn" onClick={nextWeek}>&#8250;</button>
          </div>

          <div className="ac-grid-wrapper">
            {/* Day header row */}
            <div className="ac-day-header-row">
              <div className="ac-time-gutter" />
              {weekDays.map((d, i) => (
                <div key={i} className="ac-day-header-cell">
                  <span className="ac-day-name">{DAY_NAMES[i]}</span>
                  <span className="ac-day-num">{d.getDate()}</span>
                </div>
              ))}
            </div>

            {/* Scrollable grid body */}
            <div className="ac-grid-body">
              {/* Time labels */}
              <div className="ac-time-col">
                {HOURS.map(h => (
                  <div key={h} className="ac-hour-label">{String(h).padStart(2, '0')}:00</div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((d, di) => {
                const dayEvts = events.filter(e => e.dayIndex === di);
                return (
                  <div key={di} className="ac-day-col">
                    {HOURS.map(h => <div key={h} className="ac-hour-cell" />)}
                    {dayEvts.map(evt => (
                      <div
                        key={evt.id}
                        className={`ac-event ${evt.type}`}
                        style={{
                          top: `${toPercent(evt.startMin)}%`,
                          height: `${Math.max(toPercent(evt.durationMin), 2.5)}%`,
                        }}
                        onClick={() => handleEventClick(evt)}
                      >
                        {evt.label && <span className="ac-evt-label">{evt.label}</span>}
                        <span className="ac-evt-time">{evt.text}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div className="ac-overlay" onClick={() => setShowConfirm(false)}>
          <div className="ac-confirm-dialog" onClick={e => e.stopPropagation()}>
            <p className="ac-confirm-q">Add the following time slot?</p>
            <div className="ac-confirm-details">
              <p>{formatConfirmDate()}</p>
              <p>{addStart} - {addEnd}</p>
            </div>
            <div className="ac-confirm-btns">
              <button className="ac-confirm-no" onClick={() => setShowConfirm(false)}>No</button>
              <button className="ac-confirm-yes" onClick={handleAddConfirm}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
