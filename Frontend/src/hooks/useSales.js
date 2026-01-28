import { useState, useEffect } from 'react';
import api from '../services/api';

export const useSales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSales = async (params = {}) => {
    try {
      setLoading(true);
      const res = await api.get('/sales', { params });
      setSales(res.data.sales || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return { sales, loading, error, fetchSales };
};