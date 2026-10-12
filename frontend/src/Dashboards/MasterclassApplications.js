import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MasterclassApplications.css';

const fmtDate = d => new Date(d).toLocaleDateString('en-ZA', {
  day: 'numeric', month: 'short', year: 'numeric',
});

function MasterclassApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/masterclass/applications')
      .then(res => setApplications(res.data))
      .catch(() => setError('Failed to load masterclass applications.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mca">
      <h3>Masterclass Applications</h3>
      {error && <p className="error-msg">{error}</p>}

      <div className="dash-card">
        <div className="dash-card-header">
          <div>
            <h4>Applications received</h4>
            <p className="dash-card-sub">
              {loading ? 'Loading…' : `${applications.length} application${applications.length === 1 ? '' : 's'}, newest first`}
            </p>
          </div>
        </div>

        {loading ? null : !applications.length ? (
          <p className="empty-msg">No masterclass applications yet.</p>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr><th>Applied</th><th>Name</th><th>Email</th><th></th></tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id}>
                    {/* data-label drives the stacked card layout at phone
                        width (see the CSS), where there's no room for columns. */}
                    <td data-label="Applied"><span className="mca-date">{fmtDate(a.appliedAt)}</span></td>
                    <td data-label="Name">{a.name} {a.surname}</td>
                    <td data-label="Email"><span className="mca-email">{a.email}</span></td>
                    <td className="mca-actions" data-label="">
                      <a
                        className="mca-reply"
                        href={`mailto:${a.email}?subject=${encodeURIComponent('Your Haus of Defined Beauty masterclass application')}`}
                      >
                        Reply
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MasterclassApplications;
