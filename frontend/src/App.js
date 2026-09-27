import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Site/Home';
import About from './Site/About';
import Services from './Site/Services';
import Masterclasses from './Site/Masterclasses';
import Login from './Login';
import AdminDashboard from './Dashboards/Admin';
import CustomerDashboard from './Dashboards/Customer';
import BookingWizard from './Pages/BookingWizard';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/masterclasses" element={<Masterclasses />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        {/* Calendar is now the "Calendar" tab inside /admin (see Admin.js) —
            this keeps any old bookmarks/links working. */}
        <Route path="/admin/calendar" element={<Navigate to="/admin" replace />} />
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/customer/book" element={<BookingWizard />} />
      </Routes>
    </Router>
  );
}

export default App;
