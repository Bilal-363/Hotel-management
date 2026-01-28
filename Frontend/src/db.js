import Dexie from 'dexie';

export const db = new Dexie('HajiWarisAliDB');

db.version(1).stores({
  // ++id = auto-incrementing local ID
  // serverId = the ID from your MongoDB (backend)
  dailylogs: '++id, date, note, syncStatus, serverId'
});

db.version(2).stores({
  dailylogs: '++id, date, note, syncStatus, serverId',
  products: '++id, _id, name, category, stock', // Cache for POS
  categories: '++id, _id, name, type',
  sales: '++id, invoiceNumber, createdAt, syncStatus', // syncStatus: 'pending', 'synced'
  khatas: '++id, _id, title, customerId' // Cache for POS Khata selection
});