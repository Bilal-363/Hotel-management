const Expense = require('../models/Expense');

exports.getAllExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    if (category) {
      query.category = category;
    }

    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const expenses = await Expense.find(query).sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.status(200).json({ success: true, count: expenses.length, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpense = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const expense = await Expense.findOne(query);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.status(200).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      createdBy: req.user ? req.user.id : null,
      owner: req.user.ownerId || req.user._id
    });
    res.status(201).json({ success: true, message: 'Expense added', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const expense = await Expense.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.status(200).json({ success: true, message: 'Expense updated', expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const expense = await Expense.findOneAndDelete(query);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.status(200).json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTodayExpenses = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = { date: { $gte: today, $lt: tomorrow } };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const expenses = await Expense.find(query).sort({ createdAt: -1 });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.status(200).json({
      success: true,
      count: expenses.length,
      totalExpenses,
      expenses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    let matchStage = {};
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      matchStage.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const summary = await Expense.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const totalExpenses = summary.reduce((sum, cat) => sum + cat.total, 0);

    res.status(200).json({ success: true, totalExpenses, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};