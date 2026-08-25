import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import './Reports.css';

const REPORTS = [
  { key: 'newAndReturning', label: 'New vs Returning Customers', endpoint: '/api/reports/customers' },
  { key: 'topServices', label: 'Top Services', endpoint: '/api/reports/services' },
  { key: 'monthlyStatus', label: 'Monthly Booking Status', endpoint: '/api/reports/monthly' },
  { key: 'peakTimes', label: 'Peak Booking Times', endpoint: '/api/reports/peak-times' },
];

// Categorical palette, fixed order — validated for adjacency + all-pairs CVD safety.
const CAT_1 = '#2a78d6'; // blue
const CAT_2 = '#eb6834'; // orange
const CAT_3 = '#1baf7a'; // aqua

// Fixed status palette — reserved meaning, never reused as a plain series color.
const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

const INK = { secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' };
const axisStyle = { fontSize: 12, fill: INK.muted, fontFamily: 'Inter, sans-serif' };
const legendStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', color: INK.secondary };
const tooltipStyle = { fontSize: 13, fontFamily: 'Inter, sans-serif', borderRadius: 6, border: '1px solid #ede5de' };

function renderReportBody(key, data) {
  if (key === 'newAndReturning') {
    const pieData = [
      { name: 'Returning Customers', value: data.returning },
      { name: 'New Customers', value: data.new },
    ];
    const colors = [CAT_1, CAT_2];
    if (!data.returning && !data.new) return <p className="empty-cell">No data available.</p>;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
            {pieData.map((entry, i) => <Cell key={entry.name} fill={colors[i]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (key === 'topServices') {
    if (!data.length) return <p className="empty-cell">No data available.</p>;
    return (
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 50 }}>
          <CartesianGrid vertical={false} stroke={INK.grid} />
          <XAxis dataKey="name" tick={axisStyle} angle={-25} textAnchor="end" interval={0} height={70} stroke={INK.axis} />
          <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} label={{ value: 'Bookings', angle: -90, position: 'insideLeft', style: axisStyle }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Bookings" fill={CAT_1} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (key === 'monthlyStatus') {
    const order = ['Booked', 'Rescheduled', 'Cancelled', 'No-show'];
    const colorMap = { Booked: STATUS.good, Rescheduled: STATUS.warning, Cancelled: STATUS.serious, 'No-show': STATUS.critical };
    const pieData = order.map(name => ({ name, value: data[name] || 0 }));
    const total = pieData.reduce((sum, d) => sum + d.value, 0);
    if (!total) return <p className="empty-cell">No bookings last month.</p>;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
            {pieData.map(entry => <Cell key={entry.name} fill={colorMap[entry.name]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (key === 'peakTimes') {
    if (!data.length) return <p className="empty-cell">No data available.</p>;
    return (
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid vertical={false} stroke={INK.grid} />
          <XAxis dataKey="time" tick={axisStyle} stroke={INK.axis} />
          <YAxis allowDecimals={false} tick={axisStyle} stroke={INK.axis} label={{ value: 'Bookings', angle: -90, position: 'insideLeft', style: axisStyle }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ ...legendStyle, paddingTop: 12 }} />
          <Line type="monotone" dataKey="Hair" stroke={CAT_1} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
          <Line type="monotone" dataKey="Nails" stroke={CAT_2} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
          <Line type="monotone" dataKey="Makeup & Lashes" stroke={CAT_3} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return null;
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
        {data && !loading && (
          <>
            <div className="report-output-header">
              <h4>{activeReport.label}</h4>
              <button className="pdf-btn" onClick={downloadPdf} disabled={downloading}>
                {downloading ? 'Preparing…' : 'Download PDF'}
              </button>
            </div>
            {renderReportBody(activeReport.key, data)}
          </>
        )}
        {!activeReport && !loading && (
          <p className="empty-msg">Select a report above to view data.</p>
        )}
      </div>
    </div>
  );
}

export default Reports;
