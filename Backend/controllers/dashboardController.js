const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Product = require('../models/Product');

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Filter: If Super Admin, see all. If Admin/Staff, see only owner's data.
    let ownerId = req.user.ownerId || req.user._id;
    let query, productQuery, expenseQuery;

    if (req.user.role === 'superadmin') {
      query = {};
      productQuery = { isActive: true };
      expenseQuery = {};
    } else {
      query = { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
      productQuery = { isActive: true, $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
      expenseQuery = { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
    }

    const [
      todaySales,
      todayExpenses,
      totalProducts,
      lowStockProducts,
      inventoryValue,
      potentialProfit,
      monthlyRevenueAgg,
      totalSalesAgg,
      pendingPaymentsAgg
    ] = await Promise.all([
      Sale.find({ ...query, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' }),
      Expense.find({ ...expenseQuery, date: { $gte: today, $lt: tomorrow } }),
      Product.countDocuments(productQuery),
      Product.countDocuments({ ...productQuery, $expr: { $lte: ['$stock', '$minStock'] } }),
      Product.aggregate([
        { $match: productQuery },
        { $group: { _id: null, total: { $sum: { $multiply: ['$buyPrice', '$stock'] } } } }
      ]),
      Product.aggregate([
        { $match: productQuery },
        { $group: { _id: null, total: { $sum: { $multiply: [{ $subtract: ['$sellPrice', '$buyPrice'] }, '$stock'] } } } }
      ]),
      Sale.aggregate([
        { $match: { ...query, createdAt: { $gte: startOfMonth }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Sale.aggregate([
        { $match: { ...query, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      require('../models/Khata').aggregate([
        { $match: { status: 'open', ...query } },
        { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
      ])
    ]);

    const totalTodaySales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = todaySales.reduce((sum, sale) => sum + sale.totalProfit, 0);
    const totalTodayExpenses = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalProfit - totalTodayExpenses;

    res.status(200).json({
      success: true,
      stats: {
        todaySales: totalTodaySales,
        todayProfit: totalProfit,
        todayExpenses: totalTodayExpenses,
        netProfit,
        totalInvoices: todaySales.length,
        totalProducts,
        lowStockProducts, // Keep for backward compatibility if needed
        lowStockCount: lowStockProducts, // For Dashboard.jsx
        inventoryValue: inventoryValue[0]?.total || 0,
        potentialProfit: potentialProfit[0]?.total || 0,
        monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
        totalSales: totalSalesAgg[0]?.total || 0,
        pendingPayments: pendingPaymentsAgg[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecentSales = async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id;
    let query = { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
    if (req.user.role === 'superadmin') {
      query = {};
    }
    const sales = await Sale.find(query).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ success: true, sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLowStockAlert = async (req, res) => {
  try {
    const ownerId = req.user.ownerId || req.user._id;
    let query = { isActive: true, $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] };
    if (req.user.role === 'superadmin') {
      query = { isActive: true };
    }
    
    const products = await Product.find({
      ...query,
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 }).limit(10);

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    console.log('Generating Sales Report with params:', req.query); // Force reload logic

    const ownerId = req.user.ownerId || req.user._id;
    let query = { status: 'completed', ...(req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] }) };
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

    // --- Graph Data Aggregation (Daily) ---
    let salesPipeline = [{ $match: query }];

    if (category && category !== 'All') {
      salesPipeline.push(
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        { $match: { 'productInfo.category': category } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            sales: { $sum: "$items.itemTotal" },
            profit: { $sum: "$items.itemProfit" }
          }
        }
      );
    } else {
      salesPipeline.push({
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$total" },
          profit: { $sum: "$totalProfit" }
        }
      });
    }
    salesPipeline.push({ $sort: { _id: 1 } });

    const salesTrend = await Sale.aggregate(salesPipeline);

    let expenseQuery = {};
    if (startDate && endDate) {
      expenseQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'All') {
      expenseQuery.category = category;
    }
    if (req.user.role !== 'superadmin') {
      expenseQuery.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const expensesTrend = await Expense.aggregate([
      { $match: expenseQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          expense: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Merge Sales and Expenses for Graph
    const trendMap = {};
    salesTrend.forEach(item => {
      trendMap[item._id] = { date: item._id, sales: item.sales, profit: item.profit, expense: 0, netProfit: item.profit };
    });
    expensesTrend.forEach(item => {
      if (!trendMap[item._id]) {
        trendMap[item._id] = { date: item._id, sales: 0, profit: 0, expense: 0, netProfit: 0 };
      }
      trendMap[item._id].expense = item.expense;
      trendMap[item._id].netProfit = (trendMap[item._id].profit || 0) - item.expense;
    });

    const graphData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
    // --------------------------------------

    res.status(200).json({
      success: true,
      report: {
        totalInvoices: sales.length,
        totalSales,
        totalProfit,
        totalCost,
        totalDiscount,
        graphData, // Added graph data
        paymentSummary,
        // Note: Khata aggregation below is simplified; for full multi-tenancy Khata needs owner field too.
        // Assuming Khata model will be updated similarly.
        totalKhataOutstanding: (await require('../models/Khata').aggregate([
          { $match: { status: 'open', ...(req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] }) } },
          { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
        ]))[0]?.total || 0,
        inventoryAnalysis: {
          totalStockCost: (await Product.aggregate([
            { $match: { isActive: true, ...(req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] }) } },
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
            { $match: { isActive: true, ...(req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] }) } },
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
                ...(req.user.role === 'superadmin' ? {} : { $or: [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }] }),
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