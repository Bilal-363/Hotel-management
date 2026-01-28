import api from './api';

export const getDashboardStats = async () => {
  const res = await api.get('/dashboard/stats');
  return res.data;
};

export const getRecentSales = async () => {
  const res = await api.get('/dashboard/recent-sales');
  return res.data;
};

export const getLowStockAlert = async () => {
  const res = await api.get('/dashboard/low-stock');
  return res.data;
};

export const getSalesReport = async (params = {}) => {
  const res = await api.get('/dashboard/sales-report', { params });
  return res.data;
};