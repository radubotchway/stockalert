import { api } from '../../api/client';

export const fetchPurchaseOrders = (params) => api.get('/purchase-orders', { params }).then((res) => res.data);
export const fetchPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`).then((res) => res.data);
export const createPurchaseOrder = (payload) => api.post('/purchase-orders', payload).then((res) => res.data);
export const updatePurchaseOrderStatus = (id, status) =>
  api.patch(`/purchase-orders/${id}/status`, { status }).then((res) => res.data);
export const deletePurchaseOrder = (id) => api.delete(`/purchase-orders/${id}`);
export const generateSuggestedOrders = () => api.post('/purchase-orders/suggested').then((res) => res.data);
export const receivePurchaseOrder = (id, receipts) =>
  api.post(`/purchase-orders/${id}/receive`, { receipts }).then((res) => res.data);
