import { api } from '../../api/client';

export const fetchDashboard = () => api.get('/dashboard').then((res) => res.data);
