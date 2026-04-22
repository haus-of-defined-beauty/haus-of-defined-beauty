import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CalendarView.css';

function CalendarView({ isAdmin }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [calendarDay, setCalendarDay] = useState(null);
  const [newSlot, setNewSlot] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedDate) return;
    setError('');
    axios.get(`/api/calendar/${selectedDate}`)
      .then(res => setCalendarDay(res.data))
      .catch(() => setCalendarDay({ availableSlots: [], blockedSlots: [], blockedDate: false }));
  }, [selectedDate]);

  const save = (patch) => {
    axios.put(`/api/calendar/${selectedDate}`, patch)
      .then(res => setCalendarDay(res.data))
      .catch(() => setError('Failed to update calendar.'));
  };

  const addSlot = () => {
    if (!newSlot) return;
    const updated = [...(calendarDay.availableSlots || []), newSlot];
    save({ availableSlots: updated });
    setNewSlot('');
  };

  const removeSlot = slot => {
    const updated = calendarDay.availableSlots.filter(s => s !== slot);
    save({ availableSlots: updated });
  };

  const toggleBlock = () => {
    save({ blockedDate: !calendarDay.blockedDate });
  };

  return (
    <div className="calendar-view">
      <h3>Calendar Management</h3>
      <label className="date-picker-label">Select Date
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
      </label>

      {selectedDate && calendarDay && (
        <div className="calendar-day">
          {error && <p className="error-msg">{error}</p>}

          <div className="block-toggle">
            <span>Day blocked:</span>
            <strong>{calendarDay.blockedDate ? 'Yes' : 'No'}</strong>
            {isAdmin && (
              <button className={`btn-toggle ${calendarDay.blockedDate ? 'unblock' : 'block'}`} onClick={toggleBlock}>
                {calendarDay.blockedDate ? 'Unblock' : 'Block Day'}
              </button>
            )}
          </div>

          <div className="slots-section">
            <h4>Available Slots</h4>
            {calendarDay.availableSlots.length === 0
              ? <p className="empty-msg">No slots set.</p>
              : (
                <ul className="slot-list">
                  {calendarDay.availableSlots.map(slot => (
                    <li key={slot}>
                      {slot}
                      {isAdmin && <button className="btn-remove" onClick={() => removeSlot(slot)}>✕</button>}
                    </li>
                  ))}
                </ul>
              )
            }
            {isAdmin && (
              <div className="add-slot">
                <input
                  type="time"
                  value={newSlot}
                  onChange={e => setNewSlot(e.target.value)}
                />
                <button className="btn-primary" onClick={addSlot}>Add Slot</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
