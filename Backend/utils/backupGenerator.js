const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const Khata = require('../models/Khata');
const KhataTransaction = require('../models/KhataTransaction');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const DailyLog = require('../models/DailyLog');
const Category = require('../models/Category');
const Setting = require('../models/Setting');
const User = require('../models/User');
const Trash = require('../models/Trash');

const generateBackupData = async (ownerId = null) => {
  const query = ownerId ? { owner: ownerId } : {};
  const userQuery = ownerId ? { ownerId: ownerId } : {};

  return {
    timestamp: new Date(),
    products: await Product.find(query),
    sales: await Sale.find(query),
    expenses: await Expense.find(query),
    customers: await Customer.find(query),
    khatas: await Khata.find(query),
    khataTransactions: await KhataTransaction.find(query),
    suppliers: await Supplier.find(query),
    purchases: await Purchase.find(query),
    dailyLogs: await DailyLog.find(query),
    categories: await Category.find(query),
    settings: await Setting.find(query),
    trash: await Trash.find(query),
    users: await User.find(userQuery).select('-password')
  };
};

module.exports = { generateBackupData };