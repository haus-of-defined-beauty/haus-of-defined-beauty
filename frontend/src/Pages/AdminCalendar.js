import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminCalendar.css';

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const GRID_START = 8 * 60;
const GRID_DURATION = 9 * 60;

// dayIndex: 0=Mon … 6=Sun, startMin relative to 08:00
const INITIAL_EVENTS = [
  { id: 1, dayIndex: 4, startMin: 0,   durationMin: 30, type: 'available', label: '',              text: '08:00 - 08:30' },
  { id: 2, dayIndex: 4, startMin: 60,  durationMin: 30, type: 'booked',    label: 'Soak Off & Acrylic', text: '09:00 - 09:30',
    booking: { name: 'Jane Doe', date: '01 May 2026', time: '09:00 - 09:30', service: 'Soak-Off & Acrylic' } },
  { id: 3, dayIndex: 4, startMin: 120, durationMin: 60, type: 'available', label: '',              text: '10:00 - 11:00' },
  { id: 4, dayIndex: 4, startMin: 210, durationMin: 30, type: 'booked',    label: 'Pedicure',      text: '11:30 - 12:00',
    booking: { name: 'Jane Doe', date: '01 May 2026', time: '11:30 - 12:00', service: 'Pedicure' } },
  { id: 5, dayIndex: 4, startMin: 300, durationMin: 30, type: 'available', label: '',              text: '13:00 - 13:30' },
];

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

export default function AdminCalendar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addStart, setAddStart] = useState('');
  const [addEnd, setAddEnd] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const weekDays = getWeekDays(weekStart);

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
  }

  function handleEventClick(evt) {
    setShowAddForm(false);
    if (evt.type === 'booked' && evt.booking) {
      setSelectedBooking(evt.booking);
      setSelectedSlot(null);
    } else {
      setSelectedSlot(evt);
      setSelectedBooking(null);
    }
  }

  function handleRemoveSlot() {
    if (!selectedSlot) return;
    setEvents(e => e.filter(ev => ev.id !== selectedSlot.id));
    setSelectedSlot(null);
  }

  function handleAddConfirm() {
    setShowConfirm(false);
    if (!addDate || !addStart || !addEnd) return;
    const [sh, sm] = addStart.split(':').map(Number);
    const [eh, em] = addEnd.split(':').map(Number);
    const startMin = sh * 60 + sm - GRID_START;
    const durationMin = eh * 60 + em - (sh * 60 + sm);
    const dateObj = new Date(addDate);
    const dayIndex = (dateObj.getDay() + 6) % 7;
    setEvents(e => [...e, {
      id: Date.now(), dayIndex, startMin, durationMin,
      type: 'available', label: '', text: `${addStart} - ${addEnd}`,
    }]);
    setAddDate(''); setAddStart(''); setAddEnd('');
    setShowAddForm(false);
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
            <span className="ac-logo-l1">HAUS OF DEFINED</span>
            <span className="ac-logo-l2">BEAUTY</span>
            <span className="ac-logo-l3">BEAUTY SALON</span>
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
              <button className="ac-cancel-booking" onClick={() => setSelectedBooking(null)}>Cancel</button>
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
