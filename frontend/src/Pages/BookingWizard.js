import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.jpeg';
import './BookingWizard.css';

const STEPS = ['SELECT SERVICES', 'CONFIRMATION', 'PAYMENT'];
const BOOKING_FEE = 100;

const CATEGORY_LABELS = {
  hair: 'Hair Services',
  nails: 'Nail Services',
  makeup: 'Makeup & Lashes',
  lashes: 'Makeup & Lashes',
  masterclass: 'Masterclass',
};

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

export default function BookingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [step, setStep] = useState(0);
  const [cart, setCart] = useState([]);
  const [services, setServices] = useState({});
  const [expanded, setExpanded] = useState({});
  const [showSlots, setShowSlots] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [daySlots, setDaySlots] = useState([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [groupId, setGroupId] = useState(null);

  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // null | 'success' | 'failed' | 'gateway-cancelled'

  const weekDays = getWeekDays(weekStart);

  useEffect(() => {
    axios.get('/api/bookings/services').then(res => {
      const grouped = {};
      for (const s of res.data) {
        const label = CATEGORY_LABELS[s.category] || s.category;
        (grouped[label] = grouped[label] || []).push(s);
      }
      setServices(grouped);
    }).catch(() => setServices({}));
  }, []);

  useEffect(() => {
    axios.get(`/api/calendar/${isoDate(selectedDay)}`)
      .then(res => setDaySlots(res.data.slots || []))
      .catch(() => setDaySlots([]));
  }, [selectedDay]);

  // Handles landing back here after a PayFast redirect (return_url/cancel_url).
  // Local state (cart, step) is gone on a fresh page load, so this rebuilds
  // just enough from the URL to show the right outcome screen.
  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    const groupIdParam = searchParams.get('groupId');
    if (!paymentParam || !groupIdParam) return;

    setGroupId(groupIdParam);
    setStep(2);

    if (paymentParam === 'cancel') {
      setPaymentResult('gateway-cancelled');
      return;
    }

    if (paymentParam === 'return') {
      setPolling(true);
      let attempts = 0;
      const poll = () => {
        axios.get(`/api/payments/group/${groupIdParam}`).then(res => {
          const status = res.data.payment?.status;
          if (status === 'successful') { setPaymentResult('success'); setPolling(false); }
          else if (status === 'failed') { setPaymentResult('failed'); setPolling(false); }
          else if (attempts < 5) { attempts += 1; setTimeout(poll, 2000); }
          else { setPolling(false); }
        }).catch(() => setPolling(false));
      };
      poll();
    }
  }, []);

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
    const entry = {
      service: activeService,
      isoDate: isoDate(selectedDay),
      date: dateLabel(selectedDay),
      time,
      endTime: addMins(time, activeService.duration),
    };
    const idx = cart.findIndex(c => c.service._id === activeService._id);
    if (idx >= 0) { const u = [...cart]; u[idx] = entry; setCart(u); }
    else setCart(c => [...c, entry]);
    setActiveService(null);
  }

  function removeItem(i) { setCart(c => c.filter((_, j) => j !== i)); }
  function editItem(item) { setActiveService(item.service); setShowSlots(true); }

  function inCart(time) {
    const iso = isoDate(selectedDay);
    return cart.some(c => c.time === time && c.isoDate === iso);
  }

  async function handleContinue() {
    setCreateError('');
    setStep(1);
  }

  async function handleConfirmBooking() {
    setCreateError('');
    setCreating(true);
    try {
      const items = cart.map(c => ({ serviceId: c.service._id, date: c.isoDate, time: c.time }));
      const res = await axios.post('/api/bookings', { items });
      setGroupId(res.data.groupId);
      setStep(2);
    } catch (err) {
      const conflict = err.response?.data?.item;
      if (err.response?.status === 409 && conflict) {
        setCart(c => c.filter(ci => !(
          ci.service._id === conflict.serviceId && ci.isoDate === conflict.date && ci.time === conflict.time
        )));
        setCreateError(`${err.response.data.message || 'That slot is no longer available.'} Please pick a new time.`);
      } else {
        setCreateError(err.response?.data?.message || 'Failed to create booking. Please try again.');
      }
      setStep(0);
    } finally {
      setCreating(false);
    }
  }

  async function handlePayNow() {
    setPaying(true);
    setCreateError('');
    try {
      const res = await axios.post('/api/payments/initiate', { groupId });
      const { processUrl, fields } = res.data;
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = processUrl;
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      // browser navigates away to PayFast here — no need to reset `paying`
    } catch (err) {
      setPaying(false);
      setCreateError(err.response?.data?.message || 'Could not start payment.');
    }
  }

  async function handleCancelGroup() {
    try {
      await axios.delete(`/api/bookings/group/${groupId}`);
    } catch (err) {
      // best-effort — still navigate away
    }
    navigate('/customer');
  }

  function CartCard({ actions = true }) {
    return (
      <div className="bw-cart">
        <div className="bw-cart-top">
          <span className="bw-cart-title">Your Booking:</span>
          {cart.length === 0 && <span className="bw-cart-empty">No services selected</span>}
        </div>
        {createError && <p className="bw-error">{createError}</p>}
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
            <button className="bw-btn-dark" disabled={cart.length === 0} onClick={handleContinue}>Continue</button>
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
            {Object.entries(services).map(([cat, svcs]) => (
              <div key={cat} className="bw-category">
                <button className="bw-cat-header" onClick={() => setExpanded(e => ({ ...e, [cat]: !e[cat] }))}>
                  <span>{cat}</span>
                  <span>{expanded[cat] ? '∧' : '∨'}</span>
                </button>
                {expanded[cat] && (
                  <div className="bw-svc-list">
                    {svcs.map(s => {
                      const active = activeService?._id === s._id || cart.some(c => c.service._id === s._id);
                      return (
                        <div key={s._id} className={`bw-svc-row${active ? ' selected' : ''}`} onClick={() => selectService(s)}>
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
                {weekDays.map((d, i) => {
                  const disabled = isoDate(d) <= isoDate(new Date());
                  return (
                    <button key={i}
                      className={`bw-day-btn${d.toDateString() === selectedDay.toDateString() ? ' active' : ''}`}
                      disabled={disabled}
                      onClick={() => !disabled && setSelectedDay(d)}
                    >{d.getDate()}</button>
                  );
                })}
              </div>
              <div className="bw-slot-list">
                {daySlots.filter(s => s.status === 'available').map(slot => {
                  const picked = inCart(slot.start);
                  const end = activeService ? addMins(slot.start, activeService.duration) : '';
                  return (
                    <div key={slot._id}
                      className={`bw-slot${picked ? ' picked' : ''}`}
                      onClick={() => selectSlot(slot.start)}
                    >
                      <span>{slot.start}{end ? ` - ${end}` : ''}</span>
                      {!picked && <span className="bw-slot-add">+</span>}
                    </div>
                  );
                })}
                {!daySlots.some(s => s.status === 'available') && <div className="bw-slot">No slots available for this day</div>}
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
          <button className="bw-btn-dark" disabled={creating} onClick={handleConfirmBooking}>
            {creating ? 'Confirming…' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  function Step4() {
    if (polling) {
      return (
        <div className="bw-confirm-card">
          <div className="bw-confirm-top">
            <h2 className="bw-confirm-title">Confirming your payment…</h2>
          </div>
          <p>This should only take a moment.</p>
        </div>
      );
    }

    if (paymentResult === 'success') {
      return (
        <div className="bw-confirm-card bw-success-card">
          <div className="bw-success-icon">✓</div>
          <h2 className="bw-confirm-title">Payment Successful</h2>
          <p>Your booking is confirmed. See you soon!</p>
          <div className="bw-confirm-btns">
            <button className="bw-btn-dark" onClick={() => navigate('/customer')}>Done</button>
          </div>
        </div>
      );
    }

    if (paymentResult === 'failed' || paymentResult === 'gateway-cancelled') {
      return (
        <div className="bw-confirm-card">
          <div className="bw-confirm-top">
            <h2 className="bw-confirm-title">{paymentResult === 'gateway-cancelled' ? 'Payment Cancelled' : 'Payment Unsuccessful'}</h2>
          </div>
          <p>{paymentResult === 'gateway-cancelled'
            ? 'You cancelled the payment before it completed.'
            : 'Please update your payment info or try a different method.'}</p>
          {createError && <p className="bw-error">{createError}</p>}
          <div className="bw-confirm-btns">
            <button className="bw-btn-outline" disabled={paying} onClick={handleCancelGroup}>Cancel Booking</button>
            <button className="bw-btn-dark" disabled={paying} onClick={handlePayNow}>
              {paying ? 'Redirecting…' : 'Try Again'}
            </button>
          </div>
        </div>
      );
    }

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
        {createError && <p className="bw-error">{createError}</p>}
        <div className="bw-confirm-btns">
          <button className="bw-btn-outline" disabled={paying} onClick={handleCancelGroup}>Cancel Booking</button>
          <button className="bw-btn-dark" disabled={paying} onClick={handlePayNow}>
            {paying ? 'Redirecting…' : 'Pay Now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-page">
      <header className="bw-header">
        <div className="bw-logo-box">
          <img src={logo} alt="Haus of Defined Beauty" className="bw-logo-img" />
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
        {step === 1 && <Step3 />}
        {step === 2 && <Step4 />}
      </main>
    </div>
  );
}
