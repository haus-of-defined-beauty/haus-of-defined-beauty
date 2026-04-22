import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './Dashboards/Admin';
import CustomerDashboard from './Dashboards/Customer';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
