const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Product = require('../models/Product');

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.find({ createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' });
    const todayExpenses = await Expense.find({ date: { $gte: today, $lt: tomorrow } });

    const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = todaySales.reduce((sum, sale) => sum + sale.totalProfit, 0);
    const totalExpenses = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfit - totalExpenses;

    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    });

    const inventoryValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$buyPrice', '$stock'] } } } }
    ]);

    const potentialProfit = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: [{ $subtract: ['$sellPrice', '$buyPrice'] }, '$stock'] } } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        todaySales: totalSales,
        todayProfit: totalProfit,
        todayExpenses: totalExpenses,
        netProfit,
        totalInvoices: todaySales.length,
        totalProducts,
        lowStockProducts,
        inventoryValue: inventoryValue[0]?.total || 0,
        potentialProfit: potentialProfit[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecentSales = async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ success: true, sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLowStockAlert = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 }).limit(10);

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Generating Sales Report with params:', req.query); // Force reload logic

    let query = { status: 'completed' };
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const sales = await Sale.find(query);

    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);
    const totalCost = sales.reduce((sum, sale) => sum + sale.totalCost, 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);

    const paymentSummary = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$total' },
          paid: { $sum: '$paidAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      report: {
        totalInvoices: sales.length,
        totalSales,
        totalProfit,
        totalCost,
        totalDiscount,
        paymentSummary,
        totalKhataOutstanding: (await require('../models/Khata').aggregate([
          { $match: { status: 'open' } },
          { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
        ]))[0]?.total || 0,
        inventoryAnalysis: {
          totalStockCost: (await Product.aggregate([
            { $match: { isActive: true } },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $multiply: [
                      { $convert: { input: '$buyPrice', to: 'double', onError: 0, onNull: 0 } },
                      { $convert: { input: '$stock', to: 'double', onError: 0, onNull: 0 } }
                    ]
                  }
                }
              }
            }
          ]))[0]?.total || 0,
          totalStockRevenue: (await Product.aggregate([
            { $match: { isActive: true } },
            {
              $group: {
                _id: null,
                total: {
                  $sum: {
                    $multiply: [
                      { $convert: { input: '$sellPrice', to: 'double', onError: 0, onNull: 0 } },
                      { $convert: { input: '$stock', to: 'double', onError: 0, onNull: 0 } }
                    ]
                  }
                }
              }
            }
          ]))[0]?.total || 0
        },
        productPerformance: await (async () => {
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfYear = new Date(now.getFullYear(), 0, 1);

          return await Sale.aggregate([
            {
              $match: {
                status: 'completed',
                createdAt: { $gte: startOfYear }
              }
            },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                day: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', startOfDay] }, '$items.quantity', 0]
                  }
                },
                week: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$items.quantity', 0]
                  }
                },
                month: {
                  $sum: {
                    $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$items.quantity', 0]
                  }
                },
                year: { $sum: '$items.quantity' }
              }
            },
            {
              $addFields: {
                _id: { $toString: '$_id' }
              }
            }
          ]);
        })()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};