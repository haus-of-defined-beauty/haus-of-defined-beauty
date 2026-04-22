import React, { useState } from 'react';
import BookingForm from './BookingForm';
import BookingList from './BookingList';
import ProfilePanel from './ProfilePanel';
import './Customer.css';

const TABS = ['Book', 'My Bookings', 'Profile'];

function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('Book');

  const renderTab = () => {
    switch (activeTab) {
      case 'Book': return <BookingForm />;
      case 'My Bookings': return <BookingList />;
      case 'Profile': return <ProfilePanel />;
      default: return null;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>Haus of Defined Beauty</h2>
        <span className="role-badge customer">Customer</span>
      </header>
      <nav className="dashboard-nav">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <main className="dashboard-content">
        {renderTab()}
      </main>
    </div>
  );
}

export default CustomerDashboard;
