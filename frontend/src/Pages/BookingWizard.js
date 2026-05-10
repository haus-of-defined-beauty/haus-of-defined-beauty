import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BookingWizard.css';

const STEPS = ['SELECT SERVICES', 'PERSONAL INFO', 'CONFIRMATION', 'PAYMENT'];
const BOOKING_FEE = 200;

const MOCK_SERVICES = {
  'Hair Services': [
    { id: 'h1', name: 'Basic Install', duration: 90 },
    { id: 'h2', name: 'Style & Install', duration: 60 },
    { id: 'h3', name: 'Frontal Pony (Your Hair)', duration: 30 },
    { id: 'h4', name: 'Frontal Pony (Hair)', duration: 45 },
  ],
  'Nail Services': [
    { id: 'n1', name: 'Plain Gel', duration: 30 },
    { id: 'n2', name: 'Plain Acrylic', duration: 60 },
    { id: 'n3', name: 'Plain Polygel', duration: 40 },
    { id: 'n4', name: 'Gel Toes', duration: 45 },
  ],
  'Makeup & Lashes': [
    { id: 'm1', name: 'Full Glam', duration: 60 },
    { id: 'm2', name: 'Natural Look', duration: 45 },
    { id: 'm3', name: 'Lash Application', duration: 30 },
  ],
};

const DEMO_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '16:00'];
const DEMO_BOOKED = { '10:00': 'Style & Install' };

function fmt(minutes) {
  if (minutes < 60) return `${minutes}mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}hr ${m}mins` : `${h}hr`;
}

function addMins(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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

export default function BookingWizard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [showSlots, setShowSlots] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [info, setInfo] = useState({ name: '', surname: '', phone: '' });

  const weekDays = getWeekDays(weekStart);

  function weekLabel() {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const f = d => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
    return `${f(weekStart)} - ${f(end)}`;
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }

  function dateLabel(d) {
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function selectService(svc) { setActiveService(svc); setShowSlots(true); }

  function selectSlot(time) {
    if (!activeService) return;
    const entry = { service: activeService, date: dateLabel(selectedDay), time, endTime: addMins(time, activeService.duration) };
    const idx = cart.findIndex(c => c.service.id === activeService.id);
    if (idx >= 0) { const u = [...cart]; u[idx] = entry; setCart(u); }
    else setCart(c => [...c, entry]);
    setActiveService(null);
  }

  function removeItem(i) { setCart(c => c.filter((_, j) => j !== i)); }
  function editItem(item) { setActiveService(item.service); setShowSlots(true); }

  function inCart(time) {
    const date = dateLabel(selectedDay);
    return cart.some(c => c.time === time && c.date === date);
  }

  function CartCard({ actions = true }) {
    return (
      <div className="bw-cart">
        <div className="bw-cart-top">
          <span className="bw-cart-title">Your Booking:</span>
          {cart.length === 0 && <span className="bw-cart-empty">No services selected</span>}
        </div>
        {cart.map((item, i) => (
          <div key={i} className="bw-cart-item">
            <div className="bw-cart-info">
              <span className="bw-cart-name">{item.service.name}</span>
              <span className="bw-dur"> -{fmt(item.service.duration)}</span>
              <div className="bw-cart-dt">{item.date}, {item.time} - {item.endTime}</div>
            </div>
            {actions && (
              <div className="bw-cart-icons">
                <button className="bw-icon" onClick={() => removeItem(i)}>&#128465;</button>
                <button className="bw-icon" onClick={() => editItem(item)}>&#9998;</button>
              </div>
            )}
          </div>
        ))}
        {actions && (
          <div className="bw-cart-btns">
            <button className="bw-btn-outline" onClick={() => navigate('/customer')}>Cancel Booking</button>
            <button className="bw-btn-dark" disabled={cart.length === 0} onClick={() => setStep(s => s + 1)}>Continue</button>
          </div>
        )}
      </div>
    );
  }

  function Step1() {
    return (
      <div className="bw-step1">
        <CartCard />
        <div className={`bw-step1-body${showSlots ? ' with-slots' : ''}`}>
          <div className="bw-services">
            <h3 className="bw-section-title">Add your Service</h3>
            {Object.entries(MOCK_SERVICES).map(([cat, svcs]) => (
              <div key={cat} className="bw-category">
                <button className="bw-cat-header" onClick={() => setExpanded(e => ({ ...e, [cat]: !e[cat] }))}>
                  <span>{cat}</span>
                  <span>{expanded[cat] ? '∧' : '∨'}</span>
                </button>
                {expanded[cat] && (
                  <div className="bw-svc-list">
                    {svcs.map(s => {
                      const active = activeService?.id === s.id || cart.some(c => c.service.id === s.id);
                      return (
                        <div key={s.id} className={`bw-svc-row${active ? ' selected' : ''}`} onClick={() => selectService(s)}>
                          <span>{s.name}<span className="bw-dur"> - {fmt(s.duration)}</span></span>
                          <span className={`bw-radio${active ? ' filled' : ''}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {showSlots && (
            <div className="bw-slots">
              <h3 className="bw-section-title">Select Time Slot</h3>
              <div className="bw-week-nav">
                <button className="bw-nav-btn" onClick={prevWeek}>&#8249;</button>
                <span className="bw-week-label">{weekLabel()}</span>
                <button className="bw-nav-btn" onClick={nextWeek}>&#8250;</button>
                <button className="bw-cal-icon">&#128197;</button>
              </div>
              <div className="bw-day-strip">
                {weekDays.map((d, i) => (
                  <button key={i}
                    className={`bw-day-btn${d.toDateString() === selectedDay.toDateString() ? ' active' : ''}`}
                    onClick={() => setSelectedDay(d)}
                  >{d.getDate()}</button>
                ))}
              </div>
              <div className="bw-slot-list">
                {DEMO_SLOTS.map(time => {
                  const booked = DEMO_BOOKED[time];
                  const picked = inCart(time);
                  const end = activeService ? addMins(time, activeService.duration) : '';
                  return (
                    <div key={time}
                      className={`bw-slot${booked ? ' booked' : ''}${picked ? ' picked' : ''}`}
                      onClick={() => !booked && selectSlot(time)}
                    >
                      <span>{time}{end ? ` - ${end}` : ''}</span>
                      {booked && <span className="bw-slot-svc">{booked}</span>}
                      {!booked && !picked && <span className="bw-slot-add">+</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button className="bw-slots-toggle" onClick={() => setShowSlots(s => !s)}>
          &#128197; Available Time Slots
        </button>
      </div>
    );
  }

  function Step2() {
    return (
      <div className="bw-step2">
        <div className="bw-step2-left">
          <h2 className="bw-step2-title">Personal Information</h2>
          {[['Name:', 'name'], ['Surname:', 'surname'], ['Mobile Number:', 'phone']].map(([label, key]) => (
            <div key={key} className="bw-field">
              <label className="bw-field-label">{label}</label>
              <input className="bw-field-input" value={info[key]} onChange={e => setInfo(i => ({ ...i, [key]: e.target.value }))} />
            </div>
          ))}
          <p className="bw-login-hint">Already have an account? <span className="bw-login-link">Log In</span></p>
          <div className="bw-step-btns">
            <button className="bw-btn-outline" onClick={() => navigate('/customer')}>Cancel Booking</button>
            <button className="bw-btn-dark" onClick={() => setStep(2)}>Continue</button>
          </div>
        </div>
        <div className="bw-step2-right">
          <div className="bw-summary-card">
            <h3 className="bw-summary-title">Your Booking:</h3>
            {cart.map((item, i) => (
              <div key={i} className="bw-summary-item">
                <span className="bw-cart-name">{item.service.name}</span>
                <span className="bw-dur"> - {fmt(item.service.duration)}</span>
                <div className="bw-cart-dt">{item.date}, {item.time} - {item.endTime}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function Step3() {
    return (
      <div className="bw-confirm-card">
        <div className="bw-confirm-top">
          <h2 className="bw-confirm-title">Confirmation:</h2>
          <span className="bw-fee-badge">BOOKING FEE - R{BOOKING_FEE}</span>
        </div>
        {cart.map((item, i) => (
          <div key={i} className="bw-confirm-item">
            <span className="bw-cart-name">{item.service.name}</span>
            <span className="bw-dur"> - {fmt(item.service.duration)}</span>
            <div className="bw-cart-dt">{item.date}, {item.time} - {item.endTime}</div>
          </div>
        ))}
        <div className="bw-confirm-btns">
          <button className="bw-btn-outline" onClick={() => navigate('/customer')}>Cancel Booking</button>
          <button className="bw-btn-dark" onClick={() => setStep(3)}>Confirm</button>
        </div>
      </div>
    );
  }

  function Step4() {
    return (
      <div className="bw-confirm-card">
        <div className="bw-confirm-top">
          <h2 className="bw-confirm-title">Booking Fee: R{BOOKING_FEE}</h2>
        </div>
        {cart.map((item, i) => (
          <div key={i} className="bw-confirm-item">
            <span className="bw-cart-name">{item.service.name}</span>
            <span className="bw-dur"> - {fmt(item.service.duration)}</span>
            <div className="bw-cart-dt">{item.date}, {item.time} - {item.endTime}</div>
          </div>
        ))}
        <div className="bw-confirm-btns">
          <button className="bw-btn-outline" onClick={() => navigate('/customer')}>Cancel Booking</button>
          <button className="bw-btn-dark" onClick={() => { alert('Redirecting to payment gateway… (prototype)'); navigate('/customer'); }}>Pay Now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-page">
      <header className="bw-header">
        <div className="bw-logo-box">
          <span className="bw-logo-l1">HAUS OF DEFINED</span>
          <span className="bw-logo-l2">BEAUTY</span>
          <span className="bw-logo-l3">BEAUTY SALON</span>
        </div>
        <div className="bw-header-center">
          <div className="bw-header-name">{user.name || 'Jane Doe'}</div>
          <div className="bw-header-title">Book Appointment</div>
        </div>
        <div className="bw-header-right">
          <button className="bw-header-btn" onClick={() => navigate('/customer')}>BACK</button>
          <button className="bw-header-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}>LOG OUT</button>
        </div>
      </header>

      <div className="bw-stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`bw-step-lbl${i === step ? ' active' : i < step ? ' done' : ''}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="bw-step-sep">&#62;</span>}
          </React.Fragment>
        ))}
      </div>

      <main className="bw-main">
        {step === 0 && <Step1 />}
        {step === 1 && <Step2 />}
        {step === 2 && <Step3 />}
        {step === 3 && <Step4 />}
      </main>
    </div>
  );
}
