import { useState, useEffect } from 'react';
import api from '../services/api';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExpenses = async (params = {}) => {
    try {
      setLoading(true);
      const res = await api.get('/expenses', { params });
      setExpenses(res.data.expenses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return { expenses, loading, error, fetchExpenses };
};