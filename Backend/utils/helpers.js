const formatPKR = (amount) => {
  return 'Rs. ' + amount.toLocaleString('en-PK');
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calculateProfit = (buyPrice, sellPrice, quantity = 1) => {
  return (sellPrice - buyPrice) * quantity;
};

const calculateProfitPercentage = (buyPrice, sellPrice) => {
  if (buyPrice === 0) return 0;
  return ((sellPrice - buyPrice) / buyPrice * 100).toFixed(2);
};

const generateInvoiceNumber = (lastNumber) => {
  return lastNumber ? lastNumber + 1 : 1001;
};

const isLowStock = (stock, minStock) => {
  return stock <= minStock;
};

module.exports = {
  formatPKR,
  formatDate,
  formatDateTime,
  calculateProfit,
  calculateProfitPercentage,
  generateInvoiceNumber,
  isLowStock
};