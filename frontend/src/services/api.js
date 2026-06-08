import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// Automatically add JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (data) => API.post('/auth/login', data);
export const resetPassword = (data) => API.post('/auth/reset-password', data);

// Users
export const getUsers = () => API.get('/users');
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deactivateUser = (id) => API.put(`/users/${id}/deactivate`);

// Tasks
export const getTasks = (params) => API.get('/tasks', { params });
export const createTask = (data) => API.post('/tasks', data);
export const updateTask = (id, data) => API.put(`/tasks/${id}`, data);
export const deleteTask = (id) => API.delete(`/tasks/${id}`);
export const addComment = (id, data) => API.post(`/tasks/${id}/comments`, data);