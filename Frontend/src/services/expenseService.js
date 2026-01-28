import api from './api';

export const getAllExpenses = async (params = {}) => {
  const res = await api.get('/expenses', { params });
  return res.data;
};

export const getExpense = async (id) => {
  const res = await api.get(`/expenses/${id}`);
  return res.data;
};

export const createExpense = async (expenseData) => {
  const res = await api.post('/expenses', expenseData);
  return res.data;
};

export const updateExpense = async (id, expenseData) => {
  const res = await api.put(`/expenses/${id}`, expenseData);
  return res.data;
};

export const deleteExpense = async (id) => {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
};

export const getTodayExpenses = async () => {
  const res = await api.get('/expenses/today');
  return res.data;
};

export const getExpenseSummary = async () => {
  const res = await api.get('/expenses/summary');
  return res.data;
};