const Booking = require('../models/Booking');
const renderReportPdf = require('../utils/pdfReport');
const { MONTH_NAMES, describePeriod, rangeFromQuery } = require('../utils/reportRange');

const periodTitle = (title, period) => `${title} — ${period.label} (${period.startFormatted} – ${period.endFormatted})`;

const CATEGORY_GROUPS = { hair: 'Hair', nails: 'Nails', makeup: 'Makeup & Lashes', lashes: 'Makeup & Lashes' };
const CATEGORIES = ['Hair', 'Nails', 'Makeup & Lashes'];

// The salon is closed Sundays (see calendarSlots.js) — weekday charts only
// cover the days it's actually open, in business-week order.
const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayName = d => WEEKDAY_NAMES[new Date(d).getUTCDay()];

const TIME_SLOTS = [
  { label: '09:00–11:00', start: 9 * 60, end: 11 * 60 },
  { label: '11:00–13:00', start: 11 * 60, end: 13 * 60 },
  { label: '13:00–15:00', start: 13 * 60, end: 15 * 60 },
  { label: '15:00–17:30', start: 15 * 60, end: 17 * 60 + 30 },
];
function timeSlotLabel(time) {
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  if (mins < TIME_SLOTS[0].start) return TIME_SLOTS[0].label;
  const hit = TIME_SLOTS.find(s => mins >= s.start && mins < s.end);
  return hit ? hit.label : TIME_SLOTS[TIME_SLOTS.length - 1].label;
}

const shortId = id => `B${id.toString().slice(-5).toUpperCase()}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_BUCKET_LIMIT = 10; // more bars than this and weeks stop being readable

// Labels for the status breakdown, and the bucket a given date belongs to.
// Over a single calendar month this gives the same "Week 1…5" it always did.
function statusBuckets(start, end) {
  const spanDays = Math.ceil((end - start) / DAY_MS);
  const weeks = Math.max(1, Math.ceil(spanDays / 7));

  if (weeks <= WEEKLY_BUCKET_LIMIT) {
    return {
      bucketLabel: date => `Week ${Math.floor((new Date(date) - start) / (7 * DAY_MS)) + 1}`,
      bucketLabels: Array.from({ length: weeks }, (_, i) => `Week ${i + 1}`),
    };
  }

  const monthLabel = d => `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  const labels = [];
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d < end; d.setMonth(d.getMonth() + 1)) {
    labels.push(monthLabel(d));
  }
  return { bucketLabel: date => monthLabel(new Date(date)), bucketLabels: labels };
}

// ── Report 4: Returning and New Customers ──────────────────────────────
// "Returning" vs "new" is judged against a customer's whole history, not
// just this month — a customer who visited before the month started is
// returning even if this happens to be their only booking this month.
// Read from real Booking records rather than Customer.bookingHistory, which
// nothing in the app ever writes to.
async function getNewReturningData(range) {
  const { start, end } = range;

  const allBookings = await Booking.find({ status: { $in: ['confirmed', 'completed'] } })
    .select('customerId date');
  const firstVisit = {};
  allBookings.forEach(b => {
    const cid = b.customerId?.toString();
    if (!cid) return;
    const t = new Date(b.date).getTime();
    if (!(cid in firstVisit) || t < firstVisit[cid]) firstVisit[cid] = t;
  });
  const classify = cid => (firstVisit[cid] < start.getTime() ? 'Returning' : 'New');

  const bookings = await Booking.find({
    status: { $in: ['confirmed', 'completed'] },
    date: { $gte: start, $lt: end },
  })
    .populate('serviceId customerId')
    .sort('-date -time');

  const overall = { returning: 0, new: 0 };
  const seen = new Set();
  const categoryMap = {};
  const details = [];

  bookings.forEach(b => {
    const cid = b.customerId?._id?.toString();
    if (!cid) return;
    const status = classify(cid);

    if (!seen.has(cid)) {
      seen.add(cid);
      overall[status === 'Returning' ? 'returning' : 'new'] += 1;
    }

    const category = CATEGORY_GROUPS[b.serviceId?.category];
    if (category) {
      if (!categoryMap[category]) categoryMap[category] = { category, New: 0, Returning: 0 };
      categoryMap[category][status] += 1;
    }

    details.push({
      status,
      customerName: b.customerId?.name || 'Unknown',
      customerNumber: b.customerId?.phone || '—',
      bookingId: shortId(b._id),
      date: b.date,
      time: b.time,
      service: b.serviceId?.name || 'Unknown',
    });
  });

  const byCategory = CATEGORIES.map(c => categoryMap[c] || { category: c, New: 0, Returning: 0 });
  return { overall, byCategory, period: describePeriod(start, end), details: details.slice(0, 25) };
}

const newAndReturningCustomers = async (req, res) => {
  try {
    const data = await getNewReturningData(rangeFromQuery(req.query));
    if (req.query.format === 'pdf') {
      return renderReportPdf(res, 'new-vs-returning-customers.pdf', periodTitle('Returning and New Customers Report', data.period), [
        { heading: 'Overall', rows: [
          { label: 'Returning Customers', value: data.overall.returning },
          { label: 'New Customers', value: data.overall.new },
        ] },
        { heading: 'By Category', rows: data.byCategory.flatMap(c =>
          ['New', 'Returning'].map(k => ({ label: `${c.category} — ${k}`, value: c[k] }))) },
      ]);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Report 2: Top Ranked Services ──────────────────────────────────────
// Counts confirmed+completed bookings (not just 'completed' — nothing in
// the app ever marks a booking completed, so that always returned empty).
// Combinations are pairs of services sharing a cart (groupId).
async function getTopServicesData(range) {
  const { start, end } = range;
  const bookings = await Booking.find({
    status: { $in: ['confirmed', 'completed'] },
    date: { $gte: start, $lt: end },
  })
    .populate('serviceId customerId')
    .sort('-date -time');

  const countByService = {};
  const details = [];
  const byGroup = {};

  bookings.forEach(b => {
    const name = b.serviceId?.name || 'Unknown service';
    countByService[name] = (countByService[name] || 0) + 1;

    const gid = b.groupId.toString();
    if (!byGroup[gid]) byGroup[gid] = new Set();
    byGroup[gid].add(name);

    details.push({
      service: name,
      bookingId: shortId(b._id),
      date: b.date,
      time: b.time,
      customerName: b.customerId?.name || 'Unknown',
      customerNumber: b.customerId?.phone || '—',
    });
  });

  const topServices = Object.entries(countByService)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const comboCounts = {};
  Object.values(byGroup).forEach(serviceSet => {
    const names = [...serviceSet].sort();
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const key = `${names[i]} + ${names[j]}`;
        comboCounts[key] = (comboCounts[key] || 0) + 1;
      }
    }
  });
  const topCombinations = Object.entries(comboCounts)
    .map(([combo, count]) => ({ combo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { topServices, topCombinations, period: describePeriod(start, end), details: details.slice(0, 25) };
}

const topServices = async (req, res) => {
  try {
    const data = await getTopServicesData(rangeFromQuery(req.query));
    if (req.query.format === 'pdf') {
      return renderReportPdf(res, 'top-services.pdf', periodTitle('Top Ranked Services Report', data.period), [
        { heading: 'Top Services', rows: data.topServices.map(s =>
          ({ label: s.name, value: `${s.count} booking${s.count === 1 ? '' : 's'}` })) },
        { heading: 'Most Common Combinations', rows: data.topCombinations.map(c =>
          ({ label: c.combo, value: `${c.count} booking${c.count === 1 ? '' : 's'}` })) },
      ]);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Report 3: Monthly Booking Status ───────────────────────────────────
// Filters by appointment date rather than createdAt — this report is about
// what happened during that month's appointments, not when they were booked.
// Buckets are mutually exclusive so they sum to the total.
async function getMonthlyStatusData(range) {
  const { start, end } = range;
  const bookings = await Booking.find({ date: { $gte: start, $lt: end } })
    .populate('serviceId customerId')
    .sort('date time');

  const statusOf = b => {
    if (b.status === 'cancelled') return 'Cancelled';
    if (b.status === 'no-show') return 'No-show';
    if (b.wasRescheduled) return 'Rescheduled';
    return 'Booked';
  };

  // The breakdown runs in weeks from the start of the range, except over a
  // long range where 30-odd weekly bars say nothing — then it runs in months.
  const { bucketLabel, bucketLabels } = statusBuckets(start, end);

  const overall = { Booked: 0, Rescheduled: 0, Cancelled: 0, 'No-show': 0 };
  const weeklyMap = {};
  const categoryMap = {};
  const details = [];

  bookings.forEach(b => {
    const bucket = statusOf(b);
    overall[bucket] += 1;

    const weekLabel = bucketLabel(b.date);
    if (!weeklyMap[weekLabel]) weeklyMap[weekLabel] = { week: weekLabel, Booked: 0, Rescheduled: 0, Cancelled: 0 };
    if (bucket !== 'No-show') weeklyMap[weekLabel][bucket] += 1;

    const category = CATEGORY_GROUPS[b.serviceId?.category];
    if (category) {
      if (!categoryMap[category]) categoryMap[category] = { category, Booked: 0, Rescheduled: 0, Cancelled: 0 };
      if (bucket !== 'No-show') categoryMap[category][bucket] += 1;
    }

    details.push({
      bookingId: shortId(b._id),
      status: bucket,
      date: b.date,
      time: b.time,
      service: b.serviceId?.name || 'Unknown',
      customerName: b.customerId?.name || 'Unknown',
      customerNumber: b.customerId?.phone || '—',
    });
  });

  const weekly = bucketLabels.map(label =>
    weeklyMap[label] || { week: label, Booked: 0, Rescheduled: 0, Cancelled: 0 });
  const byCategory = CATEGORIES.map(c => categoryMap[c] || { category: c, Booked: 0, Rescheduled: 0, Cancelled: 0 });

  return { overall, weekly, byCategory, period: describePeriod(start, end), details: details.slice(0, 25) };
}

const monthlyBookingStatus = async (req, res) => {
  try {
    const data = await getMonthlyStatusData(rangeFromQuery(req.query));
    if (req.query.format === 'pdf') {
      return renderReportPdf(res, 'monthly-booking-status.pdf', periodTitle('Monthly Booking Status Report', data.period), [
        { heading: 'Overall', rows: Object.entries(data.overall).map(([label, value]) => ({ label, value })) },
        { heading: 'Weekly Breakdown', rows: data.weekly.flatMap(w =>
          ['Booked', 'Rescheduled', 'Cancelled'].map(k => ({ label: `${w.week} — ${k}`, value: w[k] }))) },
        { heading: 'By Category', rows: data.byCategory.flatMap(c =>
          ['Booked', 'Rescheduled', 'Cancelled'].map(k => ({ label: `${c.category} — ${k}`, value: c[k] }))) },
      ]);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Report 1: Peak Booking Times ───────────────────────────────────────
// Three views over the same underlying confirmed/completed bookings: by
// time slot (line), by weekday + category (clustered bar), and by weekday
// + time slot (stacked column). Masterclass bookings are excluded — not
// one of the three categories the report tracks.
async function getPeakBookingTimesData(range) {
  const { start, end } = range;
  const bookings = await Booking.find({
    status: { $in: ['confirmed', 'completed'] },
    date: { $gte: start, $lt: end },
  })
    .populate('serviceId customerId')
    .sort('date time');

  const byTimeSlotMap = {};
  const byDayCategoryMap = {};
  const byDayTimeSlotMap = {};
  const details = [];

  bookings.forEach(b => {
    const category = CATEGORY_GROUPS[b.serviceId?.category];
    if (!category) return;
    const slot = timeSlotLabel(b.time);
    const day = weekdayName(b.date);
    if (!WEEK_ORDER.includes(day)) return; // salon is closed Sundays

    if (!byTimeSlotMap[slot]) byTimeSlotMap[slot] = { time: slot, Hair: 0, Nails: 0, 'Makeup & Lashes': 0 };
    byTimeSlotMap[slot][category] += 1;

    if (!byDayCategoryMap[day]) byDayCategoryMap[day] = { day, Hair: 0, Nails: 0, 'Makeup & Lashes': 0 };
    byDayCategoryMap[day][category] += 1;

    if (!byDayTimeSlotMap[day]) byDayTimeSlotMap[day] = {};
    byDayTimeSlotMap[day][slot] = (byDayTimeSlotMap[day][slot] || 0) + 1;

    details.push({
      time: b.time,
      timeSlot: slot,
      day,
      category,
      bookingId: shortId(b._id),
      status: b.status,
      date: b.date,
      service: b.serviceId?.name || 'Unknown',
      customerName: b.customerId?.name || 'Unknown',
      customerNumber: b.customerId?.phone || '—',
    });
  });

  const byTimeSlot = TIME_SLOTS.map(s => byTimeSlotMap[s.label] || { time: s.label, Hair: 0, Nails: 0, 'Makeup & Lashes': 0 });
  const byDayAndCategory = WEEK_ORDER.map(d => byDayCategoryMap[d] || { day: d, Hair: 0, Nails: 0, 'Makeup & Lashes': 0 });
  const byDayAndTimeSlot = WEEK_ORDER.map(d => {
    const row = { day: d };
    TIME_SLOTS.forEach(s => { row[s.label] = byDayTimeSlotMap[d]?.[s.label] || 0; });
    return row;
  });

  return { byTimeSlot, byDayAndCategory, byDayAndTimeSlot, period: describePeriod(start, end), details: details.slice(0, 25) };
}

const peakBookingTimes = async (req, res) => {
  try {
    const data = await getPeakBookingTimesData(rangeFromQuery(req.query));
    if (req.query.format === 'pdf') {
      return renderReportPdf(res, 'peak-booking-times.pdf', periodTitle('Peak Booking Times Report', data.period), [
        { heading: 'By Time Slot', rows: data.byTimeSlot.flatMap(r => CATEGORIES
          .filter(c => r[c] > 0).map(c => ({ label: `${r.time} — ${c}`, value: r[c] }))) },
        { heading: 'By Day & Category', rows: data.byDayAndCategory.flatMap(r => CATEGORIES
          .filter(c => r[c] > 0).map(c => ({ label: `${r.day} — ${c}`, value: r[c] }))) },
        { heading: 'By Day & Time Slot', rows: data.byDayAndTimeSlot.flatMap(r => TIME_SLOTS
          .map(s => s.label).filter(l => r[l] > 0).map(l => ({ label: `${r.day} — ${l}`, value: r[l] }))) },
      ]);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { newAndReturningCustomers, topServices, monthlyBookingStatus, peakBookingTimes };
