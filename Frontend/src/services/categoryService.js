import api from './api';

export const getAllCategories = async (type = '') => {
  const res = await api.get('/categories', { params: { type } });
  return res.data;
};

export const getProductCategories = async () => {
  const res = await api.get('/categories/product');
  return res.data;
};

export const getExpenseCategories = async () => {
  const res = await api.get('/categories/expense');
  return res.data;
};

export const getCategory = async (id) => {
  const res = await api.get(`/categories/${id}`);
  return res.data;
};

export const createCategory = async (categoryData) => {
  const res = await api.post('/categories', categoryData);
  return res.data;
};

export const updateCategory = async (id, categoryData) => {
  const res = await api.put(`/categories/${id}`, categoryData);
  return res.data;
};

export const deleteCategory = async (id) => {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
};