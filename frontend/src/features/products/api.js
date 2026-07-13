import { api } from '../../api/client';

export const fetchProducts = (params) => api.get('/products', { params }).then((res) => res.data);
export const fetchCategories = () => api.get('/products/categories').then((res) => res.data);
export const fetchProduct = (id) => api.get(`/products/${id}`).then((res) => res.data);
export const fetchProductByBarcode = (barcode) =>
  api.get(`/products/barcode/${barcode}`).then((res) => res.data);

export const createProduct = (payload) => api.post('/products', payload).then((res) => res.data);
export const updateProduct = (id, payload) => api.patch(`/products/${id}`, payload).then((res) => res.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const receiveBatch = (productId, payload) =>
  api.post(`/products/${productId}/batches`, payload).then((res) => res.data);
export const dispenseProduct = (productId, payload) =>
  api.post(`/products/${productId}/dispense`, payload).then((res) => res.data);
export const disposeBatch = (batchId, payload) =>
  api.patch(`/products/batches/${batchId}/dispose`, payload).then((res) => res.data);
export const adjustBatch = (batchId, payload) =>
  api.patch(`/products/batches/${batchId}/adjust`, payload).then((res) => res.data);
