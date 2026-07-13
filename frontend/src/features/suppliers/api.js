import { api } from '../../api/client';

export const fetchSuppliers = () => api.get('/suppliers').then((res) => res.data);
export const fetchSupplier = (id) => api.get(`/suppliers/${id}`).then((res) => res.data);
export const createSupplier = (payload) => api.post('/suppliers', payload).then((res) => res.data);
export const updateSupplier = (id, payload) => api.patch(`/suppliers/${id}`, payload).then((res) => res.data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);
