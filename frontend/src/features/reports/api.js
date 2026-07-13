import { api } from '../../api/client';

export const fetchExpiryReport = () => api.get('/reports/expiry').then((res) => res.data);
export const fetchLowStockReport = () => api.get('/reports/low-stock').then((res) => res.data);
export const fetchMovementsReport = (params) => api.get('/reports/movements', { params }).then((res) => res.data);

export const downloadCsv = async (path, params, filename) => {
  const res = await api.get(path, { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
