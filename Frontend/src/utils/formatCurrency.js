export const formatPKR = (amount) => {
  return 'Rs. ' + (amount || 0).toLocaleString('en-PK');
};

export const formatNumber = (number) => {
  return (number || 0).toLocaleString('en-PK');
};

export const parseCurrency = (value) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;
};

export const calculateProfit = (buyPrice, sellPrice, quantity = 1) => {
  return (sellPrice - buyPrice) * quantity;
};

export const calculateProfitPercentage = (buyPrice, sellPrice) => {
  if (buyPrice === 0) return 0;
  return ((sellPrice - buyPrice) / buyPrice * 100).toFixed(2);
};