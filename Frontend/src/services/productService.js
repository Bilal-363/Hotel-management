import api from './api';

export const getAllProducts = async (params = {}) => {
  const res = await api.get('/products', { params });
  return res.data;
};

export const getProduct = async (id) => {
  const res = await api.get(`/products/${id}`);
  return res.data;
};

export const createProduct = async (productData) => {
  const res = await api.post('/products', productData);
  return res.data;
};

export const updateProduct = async (id, productData) => {
  const res = await api.put(`/products/${id}`, productData);
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await api.delete(`/products/${id}`);
  return res.data;
};

export const updateStock = async (id, quantity) => {
  const res = await api.put(`/products/${id}/stock`, { quantity });
  return res.data;
};

export const getLowStockProducts = async () => {
  const res = await api.get('/products/low-stock');
  return res.data;
};