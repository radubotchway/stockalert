import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockalert_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getErrorMessage = (error) => {
  if (error.response?.data?.details?.length) {
    return error.response.data.details.join('; ');
  }
  return error.response?.data?.error || error.message || 'Something went wrong';
};
