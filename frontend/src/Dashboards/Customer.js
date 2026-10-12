import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BookingList from './BookingList';
import ProfilePanel from './ProfilePanel';
import logo from '../assets/logo.jpeg';
import './Customer.css';

const TABS = ['Book', 'My Bookings', 'Profile'];

function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('My Bookings');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'My Bookings': return <BookingList />;
      case 'Profile': return <ProfilePanel />;
      default: return null;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <img src={logo} alt="Haus of Defined Beauty" className="dashboard-logo" />
        <div className="header-right">
          <span className="role-badge customer">Customer</span>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <nav className="dashboard-nav">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => tab === 'Book' ? navigate('/customer/book') : setActiveTab(tab)}
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
