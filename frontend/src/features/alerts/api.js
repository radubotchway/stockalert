import { api } from '../../api/client';

export const fetchAlerts = () => api.get('/alerts').then((res) => res.data);
