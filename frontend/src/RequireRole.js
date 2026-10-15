import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Keeps each side of the system to the people it belongs to.
//
// Every dashboard route used to be reachable by anyone who typed the address,
// whatever they were signed in as — so an artist could open the customer
// booking pages, and a booking made there was filed against their admin id as
// though it were a customer's.
//
// Someone signed in as the wrong role is sent to their own dashboard rather
// than shown an error: they aren't doing anything wrong, they're just in the
// wrong place.
export default function RequireRole({ role, children }) {
  const location = useLocation();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }

  const token = localStorage.getItem('token');
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/customer'} replace />;
  }

  return children;
}
