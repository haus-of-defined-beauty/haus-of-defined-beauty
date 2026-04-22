import React, { useState } from 'react';
import axios from 'axios';
import './Reports.css';

const REPORTS = [
  { key: 'newAndReturning', label: 'New vs Returning Customers', endpoint: '/api/reports/customers' },
  { key: 'topServices', label: 'Top Services', endpoint: '/api/reports/top-services' },
  { key: 'monthlyStatus', label: 'Monthly Booking Status', endpoint: '/api/reports/monthly-status' },
  { key: 'peakTimes', label: 'Peak Booking Times', endpoint: '/api/reports/peak-times' },
];

function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = (report) => {
    setActiveReport(report.key);
    setData(null);
    setError('');
    setLoading(true);
    axios.get(report.endpoint)
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="reports">
      <h3>Reports</h3>
      <div className="report-tabs">
        {REPORTS.map(r => (
          <button
            key={r.key}
            className={`report-tab ${activeReport === r.key ? 'active' : ''}`}
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
          <pre className="report-json">{JSON.stringify(data, null, 2)}</pre>
        )}
        {!activeReport && !loading && (
          <p className="empty-msg">Select a report above to view data.</p>
        )}
      </div>
    </div>
  );
}

export default Reports;
