import api from './api';
import toast from 'react-hot-toast';

const QUEUE_KEY = 'offline_khata_queue';

export const addToQueue = (action) => {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ ...action, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const processQueue = async () => {
  if (!navigator.onLine) return;
  
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (queue.length === 0) return;

  const remaining = [];
  const idMap = {}; // Map tempId -> realId
  let processedCount = 0;

  for (const item of queue) {
    try {
      // Resolve IDs if they were temporary
      let currentData = { ...item.data };
      
      if (item.customerId && idMap[item.customerId]) {
        item.customerId = idMap[item.customerId];
      }
      if (currentData.customerId && idMap[currentData.customerId]) {
        currentData.customerId = idMap[currentData.customerId];
      }
      
      if (item.khataId && idMap[item.khataId]) {
        item.khataId = idMap[item.khataId];
      }

      let res;
      switch (item.type) {
        case 'create_customer':
          res = await api.post('/customers', currentData);
          if (item.tempId && res.data.customer) {
            idMap[item.tempId] = res.data.customer._id;
          }
          break;

        case 'create_khata':
          const cId = item.customerId || currentData.customerId;
          if (!cId) throw new Error('Missing Customer ID for Khata');
          
          res = await api.post('/khatas', { ...currentData, customerId: cId });
          if (item.tempId && res.data.khata) {
            idMap[item.tempId] = res.data.khata._id;
          }
          break;

        case 'add_charge':
           if (!item.khataId) throw new Error('Missing Khata ID for Charge');
           await api.post(`/khatas/${item.khataId}/charge`, currentData);
           break;

        case 'pay_installment':
           if (!item.installmentId) throw new Error('Missing Installment ID');
           await api.put(`/khatas/installments/${item.installmentId}/pay`, currentData);
           break;

        case 'add_installments':
           if (!item.khataId) throw new Error('Missing Khata ID for Installments');
           await api.post(`/khatas/${item.khataId}/installments`, currentData);
           break;
      }
      processedCount++;
    } catch (err) {
      console.error("Failed to process offline item", item, err);
      if (!err.response) {
         remaining.push(item); 
      }
    }
  }
  
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  if (processedCount > 0) {
    toast.success(`Synced ${processedCount} offline actions`);
  }
};