import React, { createContext, useState, useContext, useEffect } from 'react';
import { getToken, setToken, removeToken, getUserData, setUserData, removeUserData, clearAuth } from '../utils/auth';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    // Check localStorage for user data
    const token = getToken();
    const userData = getUserData();
    
    if (token && userData) {
      try {
        setUser({
          ...userData,
          token
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        clearAuth();
      }
    }
    
    setLoading(false);
  }, []);

  // New function to fetch unread notification count
  const fetchUnreadNotificationCount = async () => {
    const token = getToken();
    if (token) {
      try {
        const response = await axios.get(`${API_BASE_URL}/notifications/count/unread`);
        setUnreadNotificationCount(response.data.count);
      } catch (err) {
        console.error('Error fetching unread notification count in AuthContext:', err);
        setUnreadNotificationCount(0); // Reset on error
      }
    } else {
      setUnreadNotificationCount(0); // Reset if no token
    }
  };

  // Fetch count when user logs in or context initializes with a user
  useEffect(() => {
    if (user) {
      fetchUnreadNotificationCount();
    } else {
      setUnreadNotificationCount(0); // Reset if user logs out
    }
  }, [user]);

  const login = (responseData) => {
    console.log('Login function called with:', responseData);

    const userToStore = {
      id: responseData.user.id,
      name: responseData.user.name,
      email: responseData.user.email,
      role: responseData.user.role
    };

    // Update state
    setUser({
      ...userToStore,
      token: responseData.token
    });

    // Store in localStorage
    setToken(responseData.token);
    setUserData(userToStore);

    console.log('Login successful, user data stored:', userToStore);

    // Fetch unread count after successful login
    fetchUnreadNotificationCount();
  };

  const logout = () => {
    setUser(null);
    clearAuth();
    // Reset unread count on logout
    setUnreadNotificationCount(0);
  };

  const updateUser = (userData) => {
    const updatedUser = {
      ...user,
      ...userData
    };
    setUser(updatedUser);
    setUserData(updatedUser);

    // If user data relevant to notifications changes, refetch count (optional, depending on what updateUser does)
    // fetchUnreadNotificationCount(); 
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
    unreadNotificationCount,
    fetchUnreadNotificationCount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 