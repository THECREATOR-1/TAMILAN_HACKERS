import axios from 'axios';
import { API_URL } from '../utils/constants';

const API = axios.create({
  baseURL: API_URL,
});

// Add token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const authService = {
  login: async (email, password) => {
    const response = await API.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await API.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await API.get('/auth/me');
    return response.data;
  },

  resetPassword: async (userId, newPassword) => {
    const response = await API.post(`/users/${userId}/reset-password`, { newPassword });
    return response.data;
  },
};

export default authService;