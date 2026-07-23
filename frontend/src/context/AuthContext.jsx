import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set default axios authorization header
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const checkUserLoggedIn = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profile', err);
      // If token expired or invalid, log user out
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserLoggedIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/api/auth/login', { username, password });
      
      const userToken = res.data.token;
      const userData = res.data.user;
      
      localStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(userData);
      
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post('/api/auth/google', { idToken: googleToken });
      
      const userToken = res.data.token;
      const userData = res.data.user;
      
      localStorage.setItem('token', userToken);
      setToken(userToken);
      setUser(userData);
      
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Google Sign-In failed.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, logout, loginWithGoogle, checkUserLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};
