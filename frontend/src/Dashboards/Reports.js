import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import './Reports.css';

const REPORTS = [
  { key: 'peakTimes', label: 'Peak Booking Times', endpoint: '/api/reports/peak-times' },
  { key: 'topServices', label: 'Top Services', endpoint: '/api/reports/services' },
  { key: 'monthlyStatus', label: 'Monthly Booking Status', endpoint: '/api/reports/monthly' },
  { key: 'newAndReturning', label: 'New vs Returning Customers', endpoint: '/api/reports/customers' },
];

// Categorical palette, fixed order — validated for adjacency + all-pairs CVD safety.
const CAT_1 = '#2a78d6'; // blue
const CAT_2 = '#eb6834'; // orange
const CAT_3 = '#1baf7a'; // aqua
const CATEGORY_COLORS = { Hair: CAT_1, Nails: CAT_2, 'Makeup & Lashes': CAT_3 };

// Fixed status palette — reserved meaning, never reused as a plain series color.
const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };
const STATUS_COLORS = { Booked: STATUS.good, Rescheduled: STATUS.warning, Cancelled: STATUS.serious, 'No-show': STATUS.critical };

// Ordinal ramp (one hue, monotone light→dark) for the four time-of-day
// slots — validated with scripts/validate_palette.js --ordinal.
const TIME_SLOT_COLORS = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'];
const TIME_SLOTS = ['09:00–11:00', '11:00–13:00', '13:00–15:00', '15:00–17:30'];

const INK = { secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' };
const axisStyle = { fontSize: 12, fill: INK.muted, fontFamily: 'Inter, sans-serif' };
const legendStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', color: INK.secondary };
const tooltipStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', borderRadius: 6, border: '1px solid #ede5de' };

const fmtDate = d => new Date(d).toLocaleDateString('en-ZA');

// Period text is driven entirely by what the backend actually queried —
// every report is scoped to last calendar month, matching the spec.
const periodRangeText = period => (period?.startFormatted ? `${period.startFormatted} – ${period.endFormatted}` : null);
const periodTitle = (reportLabel, period) => `${reportLabel} Report — ${period?.label || ''}`;
const periodHeading = (reportLabel, period) => {
  const range = periodRangeText(period);
  return `${periodTitle(reportLabel, period)}${range ? ` (${range})` : ''}`;
};

function ChartCard({ title, subtitle, dateRange, children, empty }) {
  return (
    <div className="chart-card">
      <h5>{title}</h5>
      {subtitle && <p className="chart-card-sub">{subtitle}</p>}
      {dateRange && <p className="chart-card-daterange">({dateRange})</p>}
      {empty ? <p className="empty-cell">No data available.</p> : children}
    </div>
  );
}

function DataTable({ rows, columns, title }) {
  return (
    <div className="report-data-panel">
      {title && <h5 className="drilldown-title">{title}</h5>}
      {!rows || !rows.length ? (
        <p className="empty-cell">No supporting data available.</p>
      ) : (
        <div className="drilldown-table-wrap">
          <table className="drilldown-table">
            <thead>
              <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Returns { charts, columns } rather than one combined block — the charts
// render in the left column, the supporting-data table (built from
// `columns`) renders in the right column, side by side.
function renderReportBody(key, data) {
  const dateRange = periodRangeText(data.period);

  if (key === 'peakTimes') {
    const columns = [
      { key: 'time', label: 'Time' },
      { key: 'category', label: 'Category' },
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
      { key: 'service', label: 'Service' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerNumber', label: 'Customer Number' },
    ];
    const anyData = data.details.length > 0;
    return { columns, charts: (
      <>
        <ChartCard title="Peak Booking Times by Category" subtitle="Bookings per category across the day's time slots" dateRange={dateRange} empty={!anyData}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byTimeSlot} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="time" tick={axisStyle} stroke={INK.axis} />
              <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} label={{ value: 'Bookings', angle: -90, position: 'insideLeft', style: axisStyle }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ ...legendStyle, paddingTop: 12 }} />
              <Line type="monotone" dataKey="Hair" stroke={CATEGORY_COLORS.Hair} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              <Line type="monotone" dataKey="Nails" stroke={CATEGORY_COLORS.Nails} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              <Line type="monotone" dataKey="Makeup & Lashes" stroke={CATEGORY_COLORS['Makeup & Lashes']} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Booking Volume per Category and Day" subtitle="Which category is busiest on each day of the week" dateRange={dateRange} empty={!anyData}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byDayAndCategory} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="day" tick={axisStyle} stroke={INK.axis} />
              <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Hair" fill={CATEGORY_COLORS.Hair} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Nails" fill={CATEGORY_COLORS.Nails} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Makeup & Lashes" fill={CATEGORY_COLORS['Makeup & Lashes']} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Booking Times by Day of the Week" subtitle="Number of bookings in each time slot, per day" dateRange={dateRange} empty={!anyData}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byDayAndTimeSlot} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="day" tick={axisStyle} stroke={INK.axis} />
              <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              {TIME_SLOTS.map((slot, i) => (
                <Bar key={slot} dataKey={slot} stackId="slots" fill={TIME_SLOT_COLORS[i]} stroke="#fff" strokeWidth={1}
                  radius={i === TIME_SLOTS.length - 1 ? [3, 3, 0, 0] : 0} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </>
    ) };
  }

  if (key === 'topServices') {
    const columns = [
      { key: 'service', label: 'Service' },
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
      { key: 'time', label: 'Time' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerNumber', label: 'Customer Number' },
    ];
    return { columns, charts: (
      <>
        <ChartCard title="Top Ranked Services" subtitle="Most frequently booked services" dateRange={dateRange} empty={!data.topServices.length}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.topServices} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="name" tick={axisStyle} angle={-25} textAnchor="end" interval={0} height={70} stroke={INK.axis} />
              <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} label={{ value: 'Bookings', angle: -90, position: 'insideLeft', style: axisStyle }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Bookings" fill={CAT_1} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Most Common Service Combinations" subtitle="Services frequently booked together in the same visit" dateRange={dateRange} empty={!data.topCombinations.length}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topCombinations} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid horizontal={false} stroke={INK.grid} />
              <XAxis type="number" allowDecimals={false} tick={axisStyle} stroke={INK.axis} />
              <YAxis type="category" dataKey="combo" tick={{ ...axisStyle, fontSize: 11 }} width={190} stroke={INK.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Bookings" fill={CAT_1} radius={[0, 4, 4, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </>
    ) };
  }

  if (key === 'monthlyStatus') {
    const order = ['Booked', 'Rescheduled', 'Cancelled', 'No-show'];
    const pieData = order.map(name => ({ name, value: data.overall[name] || 0 }));
    const total = pieData.reduce((sum, d) => sum + d.value, 0);
    const columns = [
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
      { key: 'time', label: 'Time' },
      { key: 'service', label: 'Service' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerNumber', label: 'Customer Number' },
    ];
    return { columns, charts: (
      <>
        <ChartCard title="Monthly Booking Status" subtitle="Bookings, reschedules, and cancellations for the last month" dateRange={dateRange} empty={!total}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map(entry => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Weekly Breakdown of the Month's Bookings" subtitle="Booked, rescheduled, and cancelled counts per week" dateRange={dateRange} empty={!total}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.weekly} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="week" tick={axisStyle} stroke={INK.axis} />
              <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Booked" fill={STATUS_COLORS.Booked} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Rescheduled" fill={STATUS_COLORS.Rescheduled} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="Cancelled" fill={STATUS_COLORS.Cancelled} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bookings, Reschedules & Cancellations per Category" subtitle="Same breakdown, split by service category" dateRange={dateRange} empty={!total}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byCategory} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid horizontal={false} stroke={INK.grid} />
              <XAxis type="number" allowDecimals={false} tick={axisStyle} stroke={INK.axis} />
              <YAxis type="category" dataKey="category" tick={axisStyle} width={100} stroke={INK.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="Booked" fill={STATUS_COLORS.Booked} radius={[0, 3, 3, 0]} maxBarSize={16} />
              <Bar dataKey="Rescheduled" fill={STATUS_COLORS.Rescheduled} radius={[0, 3, 3, 0]} maxBarSize={16} />
              <Bar dataKey="Cancelled" fill={STATUS_COLORS.Cancelled} radius={[0, 3, 3, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </>
    ) };
  }

  if (key === 'newAndReturning') {
    const pieData = [
      { name: 'Returning Customers', value: data.overall.returning },
      { name: 'New Customers', value: data.overall.new },
    ];
    const colors = [CAT_1, CAT_2];
    const total = data.overall.returning + data.overall.new;
    const columns = [
      { key: 'status', label: 'Status' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerNumber', label: 'Customer Number' },
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'date', label: 'Date', render: r => fmtDate(r.date) },
      { key: 'time', label: 'Time' },
      { key: 'service', label: 'Service' },
    ];
    return { columns, charts: (
      <>
        <ChartCard title="Returning & New Customers" subtitle="Share of customers who have booked before" dateRange={dateRange} empty={!total}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((entry, i) => <Cell key={entry.name} fill={colors[i]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Returning & New Customers per Category" subtitle="Which services are attracting new customers vs. retaining regulars" dateRange={dateRange} empty={!total}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.byCategory} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid horizontal={false} stroke={INK.grid} />
              <XAxis type="number" allowDecimals={false} tick={axisStyle} stroke={INK.axis} />
              <YAxis type="category" dataKey="category" tick={axisStyle} width={100} stroke={INK.axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="New" fill={CAT_2} radius={[0, 3, 3, 0]} maxBarSize={20} />
              <Bar dataKey="Returning" fill={CAT_1} radius={[0, 3, 3, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </>
    ) };
  }

  return { columns: [], charts: null };
}

function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = (report) => {
    setActiveReport(report);
    setData(null);
    setError('');
    setLoading(true);
    axios.get(report.endpoint)
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  };

  const downloadPdf = async () => {
    if (!activeReport) return;
    setDownloading(true);
    try {
      const res = await axios.get(activeReport.endpoint, { params: { format: 'pdf' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeReport.key}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="reports">
      <h3>Reports</h3>
      <div className="report-tabs">
        {REPORTS.map(r => (
          <button
            key={r.key}
            className={`report-tab ${activeReport?.key === r.key ? 'active' : ''}`}
            onClick={() => loadReport(r)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="report-output">
        {loading && <p className="loading">Loading…</p>}
        {error && <p className="error-msg">{error}</p>}
        {data && !loading && (() => {
          const { charts, columns } = renderReportBody(activeReport.key, data);
          const supportingTitle = `Supporting Data for ${periodHeading(activeReport.label, data.period)}`;
          return (
            <>
              <div className="report-output-header">
                <h4 className="report-heading">
                  {periodTitle(activeReport.label, data.period)}
                  {periodRangeText(data.period) && (
                    <span className="report-heading-range"> ({periodRangeText(data.period)})</span>
                  )}
                </h4>
                <button className="pdf-btn" onClick={downloadPdf} disabled={downloading}>
                  {downloading ? 'Preparing…' : 'Download PDF'}
                </button>
              </div>
              <div className="report-split">
                <div className="report-charts-col">{charts}</div>
                <div className="report-data-col">
                  <DataTable rows={data.details} columns={columns} title={supportingTitle} />
                </div>
              </div>
            </>
          );
        })()}
        {!activeReport && !loading && (
          <p className="empty-msg">Select a report above to view data.</p>
        )}
      </div>
    </div>
  );
}

export default Reports;
