const Customer = require('../models/Customer');
const Khata = require('../models/Khata');
const KhataTransaction = require('../models/KhataTransaction');

// Helper to safely parse amounts (removes "Rs.", commas, etc.)
const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (val === null || val === undefined) return 0;
  const clean = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const customer = await Customer.create({
      name,
      phone,
      address,
      notes,
      createdBy: req.user?.id,
      owner: req.user.ownerId || req.user._id
    });
    res.status(201).json({ success: true, customer });
  } catch (error) {
    console.error('createCustomer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const customers = await Customer.find(query).sort({ name: 1 }).lean();
    const khatas = await Khata.find(query).sort({ createdAt: 1 }).lean();

    console.log(`[DEBUG] Processing ${customers.length} customers and ${khatas.length} khatas`);

    const statsMap = {};

    // Manually calculate totals to ensure accuracy across all data types
    for (const k of khatas) {
      if (!k.customer) continue;
      
      // Handle customer ID whether it is an Object or String
      let cId;
      if (typeof k.customer === 'object' && k.customer._id) {
        cId = k.customer._id.toString();
      } else {
        cId = k.customer.toString();
      }

      if (!statsMap[cId]) {
        statsMap[cId] = { totalRemaining: 0, totalAmount: 0, count: 0, lastKhataId: null };
      }

      // Safely parse numbers (handle strings like "3,060" or plain numbers)
      const rem = parseAmount(k.remainingAmount);
      const tot = parseAmount(k.totalAmount);

      statsMap[cId].totalRemaining += rem;
      statsMap[cId].totalAmount += tot;
      statsMap[cId].count += 1;
      statsMap[cId].lastKhataId = k._id; // Since we sorted by createdAt, this will end up being the latest
    }

    const customersWithKhata = customers.map(c => {
      const stats = statsMap[c._id.toString()];
      return {
        ...c,
        // [FIX] Construct a 'khata' object so frontend code using customer.khata.remainingAmount sees the TOTAL
        khata: stats ? {
          _id: stats.lastKhataId,
          remainingAmount: stats.totalRemaining,
          totalAmount: stats.totalAmount
        } : null,
        khataId: stats ? stats.lastKhataId : null,
        khataBalance: stats ? stats.totalRemaining : 0,
        khataTotal: stats ? stats.totalAmount : 0,
        khataCount: stats ? stats.count : 0
      };
    });

    res.status(200).json({ success: true, customers: customersWithKhata });
  } catch (error) {
    console.error('getCustomers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createKhata = async (req, res) => {
  try {
    const { customerId, title, totalAmount } = req.body;
    if (!customerId || !title || totalAmount == null) {
      return res.status(400).json({ success: false, message: 'customerId, title and totalAmount are required' });
    }
    const query = { _id: customerId };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const customer = await Customer.findOne(query);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // Check if Khata already exists for this customer
    const existingKhata = await Khata.findOne({ customer: customerId, owner: req.user.ownerId || req.user._id });
    if (existingKhata) {
      return res.status(400).json({ success: false, message: 'A Khata account already exists for this customer' });
    }

    const khata = await Khata.create({
      customer: customerId,
      title,
      totalAmount: parseAmount(totalAmount),
      remainingAmount: parseAmount(totalAmount),
      createdBy: req.user?.id,
      owner: req.user.ownerId || req.user._id
    });

    await KhataTransaction.create({
      khata: khata._id,
      customer: customerId,
      type: 'charge',
      amount: parseAmount(totalAmount),
      note: `Khata created: ${title}`,
      createdBy: req.user?.id,
      owner: req.user.ownerId || req.user._id
    });

    res.status(201).json({ success: true, khata });
  } catch (error) {
    console.error('createKhata error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getKhatas = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khatas = await Khata.find(query).populate('customer', 'name phone').lean();

    // Calculate totals per customer to show in management view
    const customerTotals = {};
    khatas.forEach(k => {
      if (k.customer && k.customer._id) {
        const cId = k.customer._id.toString();
        // Robust parsing
        customerTotals[cId] = (customerTotals[cId] || 0) + parseAmount(k.remainingAmount);
      }
    });

    const khatasWithTotal = khatas.map(k => {
      const cId = k.customer && k.customer._id ? k.customer._id.toString() : null;
      return {
        ...k,
        // [FIX] Overwrite remainingAmount with the Customer's TOTAL so the frontend displays the full debt
        // regardless of which specific khata entry is being viewed.
        remainingAmount: cId ? customerTotals[cId] : k.remainingAmount,
        customerTotalRemaining: cId ? customerTotals[cId] : 0,
        originalRemainingAmount: k.remainingAmount // Keep original just in case
      };
    });

    res.status(200).json({ success: true, khatas: khatasWithTotal });
  } catch (error) {
    console.error('getKhatas error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getKhata = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    // [FIX] Added .lean() so we can attach the total balance to the response
    const khata = await Khata.findOne(query).populate('customer', 'name phone').lean();
    if (!khata) return res.status(404).json({ success: false, message: 'Khata not found' });

    // [FIX] Calculate the Grand Total for this customer and attach it
    const allKhatas = await Khata.find({ customer: khata.customer._id, $or: [{ owner: khata.owner }, { owner: { $exists: false } }, { owner: null }] }).lean();
    const totalRemaining = allKhatas.reduce((sum, k) => sum + parseAmount(k.remainingAmount), 0);
    khata.customerTotalRemaining = totalRemaining;

    const transactions = await KhataTransaction.find({ khata: khata._id, $or: [{ owner: khata.owner }, { owner: { $exists: false } }, { owner: null }] }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, khata, transactions });
  } catch (error) {
    console.error('getKhata error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addInstallments = async (req, res) => {
  try {
    const { installments } = req.body;
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khata = await Khata.findOne(query);
    if (!khata) return res.status(404).json({ success: false, message: 'Khata not found' });
    if (!Array.isArray(installments) || installments.length === 0) {
      return res.status(400).json({ success: false, message: 'Installments required' });
    }
    for (const ins of installments) {
      khata.installments.push({ amount: ins.amount, dueDate: ins.dueDate, note: ins.note });
    }
    await khata.save();
    res.status(200).json({ success: true, khata });
  } catch (error) {
    console.error('addInstallments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.payInstallment = async (req, res) => {
  try {
    const { amount, note } = req.body;
    const query = { 'installments._id': req.params.installmentId };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khata = await Khata.findOne(query);
    if (!khata) return res.status(404).json({ success: false, message: 'Installment not found' });
    const installment = khata.installments.id(req.params.installmentId);
    if (!installment) return res.status(404).json({ success: false, message: 'Installment not found' });

    const payAmount = parseAmount(amount);
    installment.paidAmount += payAmount;
    installment.paidDate = new Date();
    installment.status = installment.paidAmount >= installment.amount ? 'paid' : 'partial';

    khata.remainingAmount = Math.max(0, parseAmount(khata.remainingAmount) - payAmount);
    if (khata.remainingAmount === 0) khata.status = 'closed';

    await khata.save();

    await KhataTransaction.create({
      khata: khata._id,
      customer: khata.customer,
      type: 'payment',
      amount: payAmount,
      note: note || 'Installment payment',
      createdBy: req.user?.id,
      owner: req.user.ownerId || req.user._id
    });

    res.status(200).json({ success: true, khata, installment });
  } catch (error) {
    console.error('payInstallment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateKhata = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khata = await Khata.findOne(query);
    if (!khata) return res.status(404).json({ success: false, message: 'Khata not found' });
    if (title != null) khata.title = title;
    if (status != null) khata.status = status;
    await khata.save();
    res.status(200).json({ success: true, khata });
  } catch (error) {
    console.error('updateKhata error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteKhata = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khata = await Khata.findOne(query);
    if (!khata) return res.status(404).json({ success: false, message: 'Khata not found' });
    await KhataTransaction.deleteMany({ khata: id });
    await Khata.deleteOne({ _id: id });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('deleteKhata error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khata = await Khata.findOne(query);
    if (!khata) return res.status(404).json({ success: false, message: 'Khata not found' });
    const chargeAmount = parseAmount(amount);
    khata.totalAmount = parseAmount(khata.totalAmount) + chargeAmount;
    khata.remainingAmount = parseAmount(khata.remainingAmount) + chargeAmount;
    await khata.save();
    await KhataTransaction.create({
      khata: khata._id,
      customer: khata.customer,
      type: 'charge',
      amount: chargeAmount,
      note: note || 'Additional charge',
      createdBy: req.user?.id,
      owner: req.user.ownerId || req.user._id
    });
    res.status(200).json({ success: true, khata });
  } catch (error) {
    console.error('addCharge error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDueInstallments = async (req, res) => {
  try {
    const today = new Date();
    const query = { 'installments.status': { $in: ['due', 'partial'] } };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const khatas = await Khata.find(query).populate('customer', 'name phone');
    const due = [];
    for (const k of khatas) {
      for (const ins of k.installments) {
        if (['due', 'partial'].includes(ins.status) && ins.dueDate <= today) {
          due.push({
            khataId: k._id,
            customer: k.customer,
            title: k.title,
            installmentId: ins._id,
            amount: ins.amount,
            paidAmount: ins.paidAmount,
            dueDate: ins.dueDate,
            status: ins.status
          });
        }
      }
    }
    res.status(200).json({ success: true, count: due.length, due });
  } catch (error) {
    console.error('getDueInstallments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomerHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const customer = await Customer.findOne(query);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const khatas = await Khata.find({ customer: id, $or: [{ owner: customer.owner }, { owner: { $exists: false } }, { owner: null }] }).sort({ createdAt: -1 });
    const transactions = await KhataTransaction.find({ customer: id, $or: [{ owner: customer.owner }, { owner: { $exists: false } }, { owner: null }] }).sort({ createdAt: -1 });

    const totalRemaining = khatas.reduce((sum, k) => sum + parseAmount(k.remainingAmount), 0);
    const totalCredit = khatas.reduce((sum, k) => sum + parseAmount(k.totalAmount), 0);

    res.status(200).json({ success: true, khatas, transactions, totalRemaining, totalCredit });
  } catch (error) {
    console.error('getCustomerHistory error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, notes } = req.body;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const customer = await Customer.findOne(query);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    if (name != null) customer.name = name;
    if (phone != null) customer.phone = phone;
    if (address != null) customer.address = address;
    if (notes != null) customer.notes = notes;
    await customer.save();
    res.status(200).json({ success: true, customer });
  } catch (error) {
    console.error('updateCustomer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const customer = await Customer.findOne(query);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    // 1. Find all Khatas for this customer
    const khatas = await Khata.find({ customer: id });
    const khataIds = khatas.map(k => k._id);

    // 2. Delete all transactions associated with these Khatas
    if (khataIds.length > 0) {
      await KhataTransaction.deleteMany({ khata: { $in: khataIds } });
    }

    // 3. Delete all Khatas for this customer
    await Khata.deleteMany({ customer: id });

    // 4. Finally, delete the customer
    await Customer.deleteOne({ _id: id });

    res.status(200).json({ success: true, message: 'Customer and all associated records deleted' });
  } catch (error) {
    console.error('deleteCustomer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const transaction = await KhataTransaction.findOne(query);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const khata = await Khata.findById(transaction.khata);
    if (khata) {
      const txAmount = parseAmount(transaction.amount);
      if (transaction.type === 'charge') {
        // Reversing a charge: Decrease total and remaining debt
        khata.totalAmount = parseAmount(khata.totalAmount) - txAmount;
        khata.remainingAmount = parseAmount(khata.remainingAmount) - txAmount;
      } else if (transaction.type === 'payment') {
        // Reversing a payment: Debt goes back up
        khata.remainingAmount = parseAmount(khata.remainingAmount) + txAmount;

        // If the Khata was closed, reopen it
        if (khata.remainingAmount > 0 && khata.status === 'closed') {
          khata.status = 'open'; // or 'partial', but 'open' is safer default
        }
      }
      await khata.save();
    }

    await KhataTransaction.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};