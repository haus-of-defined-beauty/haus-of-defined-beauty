import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BookingList from './BookingList';
import Reports from './Reports';
import ProfilePanel from './ProfilePanel';
import logo from '../assets/logo.jpeg';
import './Admin.css';

const TABS = ['Bookings', 'Calendar', 'Reports', 'Profile'];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Bookings');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    navigate('/login');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'Bookings': return <BookingList isAdmin />;
      case 'Reports': return <Reports />;
      case 'Profile': return <ProfilePanel isAdmin />;
      default: return null;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <img src={logo} alt="Haus of Defined Beauty" className="dashboard-logo" />
        <div className="header-right">
          <span className="role-badge">Admin</span>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <nav className="dashboard-nav">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => tab === 'Calendar' ? navigate('/admin/calendar') : setActiveTab(tab)}
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

export default AdminDashboard;
