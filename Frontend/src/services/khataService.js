import api from './api';

// ==================== CUSTOMER OPERATIONS ====================

/**
 * Get all customers
 */
export const getCustomers = async () => {
  try {
    const response = await api.get('/khata/customers');
    return response.data;
  } catch (error) {
    console.error('getCustomers error:', error);
    throw error;
  }
};

/**
 * Create a new customer
 * @param {Object} data - Customer data { name, phone, address, notes }
 */
export const createCustomer = async (data) => {
  try {
    const response = await api.post('/khata/customers', data);
    return response.data;
  } catch (error) {
    console.error('createCustomer error:', error);
    throw error;
  }
};

/**
 * Update customer by ID
 * @param {string} id - Customer ID
 * @param {Object} data - Updated customer data
 */
export const updateCustomer = async (id, data) => {
  try {
    const response = await api.put(`/khata/customers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('updateCustomer error:', error);
    throw error;
  }
};

/**
 * Delete customer by ID
 * @param {string} id - Customer ID
 */
export const deleteCustomer = async (id) => {
  try {
    const response = await api.delete(`/khata/customers/${id}`);
    return response.data;
  } catch (error) {
    console.error('deleteCustomer error:', error);
    throw error;
  }
};

/**
 * Get customer history (khatas and transactions)
 * @param {string} customerId - Customer ID
 */
export const getCustomerHistory = async (customerId) => {
  try {
    const response = await api.get(`/khata/customers/${customerId}/history`);
    return response.data;
  } catch (error) {
    console.error('getCustomerHistory error:', error);
    throw error;
  }
};

// ==================== KHATA OPERATIONS ====================

/**
 * Create a new khata
 * @param {Object} data - Khata data { customerId, title, totalAmount }
 */
export const createKhata = async (data) => {
  try {
    const response = await api.post('/khata', data);
    return response.data;
  } catch (error) {
    console.error('createKhata error:', error);
    throw error;
  }
};

/**
 * Get all khatas
 */
export const getKhatas = async () => {
  try {
    const response = await api.get('/khata');
    return response.data;
  } catch (error) {
    console.error('getKhatas error:', error);
    throw error;
  }
};

/**
 * Get single khata by ID with transactions
 * @param {string} id - Khata ID
 */
export const getKhata = async (id) => {
  try {
    const response = await api.get(`/khata/${id}`);
    return response.data;
  } catch (error) {
    console.error('getKhata error:', error);
    throw error;
  }
};

/**
 * Update khata
 * @param {string} id - Khata ID
 * @param {Object} data - Updated data { title, status }
 */
export const updateKhata = async (id, data) => {
  try {
    const response = await api.put(`/khata/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('updateKhata error:', error);
    throw error;
  }
};

/**
 * Delete khata by ID
 * @param {string} id - Khata ID
 */
export const deleteKhata = async (id) => {
  try {
    const response = await api.delete(`/khata/${id}`);
    return response.data;
  } catch (error) {
    console.error('deleteKhata error:', error);
    throw error;
  }
};

// ==================== CHARGE OPERATIONS ====================

/**
 * Add additional charge to khata
 * @param {string} id - Khata ID
 * @param {Object} data - Charge data { amount, note }
 */
export const addCharge = async (id, data) => {
  try {
    const response = await api.post(`/khata/${id}/charge`, data);
    return response.data;
  } catch (error) {
    console.error('addCharge error:', error);
    throw error;
  }
};

// ==================== INSTALLMENT OPERATIONS ====================

/**
 * Add installments to khata
 * @param {string} id - Khata ID
 * @param {Array} installments - Array of { amount, dueDate, note }
 */
export const addInstallments = async (id, installments) => {
  try {
    const response = await api.post(`/khata/${id}/installments`, { installments });
    return response.data;
  } catch (error) {
    console.error('addInstallments error:', error);
    throw error;
  }
};

/**
 * Pay installment
 * @param {string} installmentId - Installment ID
 * @param {Object} payload - Payment data { amount, note }
 */
export const payInstallment = async (installmentId, payload) => {
  try {
    const response = await api.put(`/khata/installments/${installmentId}/pay`, payload);
    return response.data;
  } catch (error) {
    console.error('payInstallment error:', error);
    throw error;
  }
};

/**
 * Get all due installments
 */
export const getDueInstallments = async () => {
  try {
    const response = await api.get('/khata/due-installments/list');
    return response.data;
  } catch (error) {
    console.error('getDueInstallments error:', error);
    throw error;
  }
};


/**
 * Delete transaction by ID
 * @param {string} id - Transaction ID
 */
export const deleteTransaction = async (id) => {
  try {
    const response = await api.delete(`/khata/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error('deleteTransaction error:', error);
    throw error;
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Search khatas by customer name, phone, or title
 * @param {string} query - Search query
 */
export const searchKhatas = async (query) => {
  try {
    const response = await api.get('/khata', {
      params: { search: query }
    });
    return response.data;
  } catch (error) {
    console.error('searchKhatas error:', error);
    throw error;
  }
};

/**
 * Get khata statistics
 */
export const getKhataStats = async () => {
  try {
    const [customersRes, khatasRes, dueRes] = await Promise.all([
      api.get('/khata/customers'),
      api.get('/khata'),
      api.get('/khata/due-installments/list')
    ]);

    const customers = customersRes.data.customers || [];
    const khatas = khatasRes.data.khatas || [];
    const dueInstallments = dueRes.data.due || [];

    const totalKhatas = khatas.length;
    const openKhatas = khatas.filter(k => k.status === 'open').length;
    const closedKhatas = khatas.filter(k => k.status === 'closed').length;
    const totalAmount = khatas.reduce((sum, k) => sum + (k.totalAmount || 0), 0);
    const totalRemaining = khatas.reduce((sum, k) => sum + (k.remainingAmount || 0), 0);
    const totalPaid = totalAmount - totalRemaining;

    return {
      success: true,
      stats: {
        totalCustomers: customers.length,
        totalKhatas,
        openKhatas,
        closedKhatas,
        totalAmount,
        totalPaid,
        totalRemaining,
        dueInstallmentsCount: dueInstallments.length
      }
    };
  } catch (error) {
    console.error('getKhataStats error:', error);
    throw error;
  }
};

/**
 * Export khata data for a specific customer
 * @param {string} customerId - Customer ID
 */
export const exportCustomerData = async (customerId) => {
  try {
    const history = await getCustomerHistory(customerId);
    return {
      success: true,
      data: history
    };
  } catch (error) {
    console.error('exportCustomerData error:', error);
    throw error;
  }
};

// Export all functions as named exports (already done above)
// Also export as default object for convenience
export default {
  // Customer operations
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,

  // Khata operations
  createKhata,
  getKhatas,
  getKhata,
  updateKhata,
  deleteKhata,
  deleteTransaction,

  // Charge operations
  addCharge,

  // Installment operations
  addInstallments,
  payInstallment,
  getDueInstallments,

  // Utility functions
  searchKhatas,
  getKhataStats,
  exportCustomerData
};