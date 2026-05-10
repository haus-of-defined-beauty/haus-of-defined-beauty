import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './Dashboards/Admin';
import CustomerDashboard from './Dashboards/Customer';
import BookingWizard from './Pages/BookingWizard';
import AdminCalendar from './Pages/AdminCalendar';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/calendar" element={<AdminCalendar />} />
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/customer/book" element={<BookingWizard />} />
      </Routes>
    </Router>
  );
}

export default App;
