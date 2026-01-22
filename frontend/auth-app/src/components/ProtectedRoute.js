import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // User's role doesn't match required role, redirect to home page
    return <Navigate to="/" />;
  }

  // Authorized, render component
  return children;
};

export default ProtectedRoute; 