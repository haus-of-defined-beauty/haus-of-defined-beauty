import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

// Local dev uses the CRA proxy (relative /api); a deployed frontend points at the hosted API.
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

const token = localStorage.getItem('token');
if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
