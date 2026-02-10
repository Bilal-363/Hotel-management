const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Khata = require('../models/Khata');
const KhataTransaction = require('../models/KhataTransaction');

exports.getAllSales = async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
      
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (req.query.khataId) {
      query.khataId = req.query.khataId;
    }

    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    let salesQuery = Sale.find(query).sort({ createdAt: -1 });

    if (req.query.limit) {
      salesQuery = salesQuery.limit(parseInt(req.query.limit));
    }

    const sales = await salesQuery.populate('createdBy', 'name');
    res.status(200).json({ success: true, count: sales.length, sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const sale = await Sale.findOne(query).populate('createdBy', 'name');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    res.status(200).json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSale = async (req, res) => {
  try {
    const { items, discount, paymentMethod, customerName, customerPhone, khataId, paidAmount } = req.body;

    // Allow empty items ONLY if it's a Khata payment (paying off debt)
    if (!items || items.length === 0) {
      if (paymentMethod !== 'Khata' || !paidAmount || Number(paidAmount) <= 0) {
        return res.status(400).json({ success: false, message: 'No items in cart' });
      }
    }

    let subtotal = 0;
    let totalProfit = 0;
    let totalCost = 0;
    const saleItems = [];

    if (items && items.length > 0) {
      for (const item of items) {
        const productQuery = { _id: item.productId };
        if (req.user.role !== 'superadmin') {
          const ownerId = req.user.ownerId || req.user._id;
          productQuery.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
        }
        const product = await Product.findOne(productQuery);

        if (!product) {
          return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        }

        // Use custom price if provided, otherwise default to product's sellPrice
        const sellPrice = (item.price !== undefined && item.price !== null) ? Number(item.price) : product.sellPrice;

        const itemTotal = sellPrice * item.quantity;
        const itemProfit = (sellPrice - product.buyPrice) * item.quantity;
        const itemCost = product.buyPrice * item.quantity;

        saleItems.push({
          product: product._id,
          productName: product.name,
          productSize: product.size,
          quantity: item.quantity,
          buyPrice: product.buyPrice,
          sellPrice: sellPrice,
          itemTotal,
          itemProfit
        });

        subtotal += itemTotal;
        totalProfit += itemProfit;
        totalCost += itemCost;

        product.stock -= item.quantity;
        await product.save();
      }
    }

    const total = subtotal - (discount || 0);

    // Prepare Khata calculations if applicable
    let khataRemainingAfterSale = 0;
    let khataToUpdate = null;

    if (paymentMethod === 'Khata' && khataId) {
      const khataQuery = { _id: khataId };
      if (req.user.role !== 'superadmin') {
        const ownerId = req.user.ownerId || req.user._id;
        khataQuery.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
      }
      khataToUpdate = await Khata.findOne(khataQuery);
      if (khataToUpdate) {
        // Calculate what the new balance WILL be
        let currentRemaining = khataToUpdate.remainingAmount;
        let chargeAmount = total;
        let paymentAmount = Number(paidAmount) || 0;

        khataRemainingAfterSale = currentRemaining + chargeAmount - paymentAmount;
        if (khataRemainingAfterSale < 0) khataRemainingAfterSale = 0; // consistent with previous logic
      }
    }

    // Retry logic for duplicate invoice number (Sale Creation ONLY)
    // REDUCED TIMEOUT: 3 retries, max ~500ms total delay
    let retries = 3;
    let sale = null;
    let finalInvoiceNumber = 0;

    while (retries > 0) {
      try {
        finalInvoiceNumber = await Sale.getNextInvoiceNumber(req.user.ownerId || req.user._id);

        sale = await Sale.create({
          invoiceNumber: finalInvoiceNumber,
          items: saleItems,
          subtotal,
          discount: discount || 0,
          total,
          totalProfit,
          totalCost,
          paidAmount: Number(paidAmount) || 0,
          khataRemainingAfterSale,
          paymentMethod,
          customerName,
          customerPhone,
          createdBy: req.user ? req.user._id : null,
          owner: req.user.ownerId || req.user._id,
          khataId: paymentMethod === 'Khata' ? khataId : undefined
        });

        // If successful, break loop
        break;

      } catch (error) {
        // If duplicate key error (E11000) on invoiceNumber, retry
        if (error.code === 11000 || error.message?.includes('duplicate key')) {
          console.log(`Duplicate invoice number ${finalInvoiceNumber} detected. Retrying... Attempts left: ${retries - 1}`);
          retries--;
          if (retries === 0) {
            console.error('Max retries exceeded for invoice number generation');
            return res.status(500).json({ success: false, message: 'System busy, please try again (Invoice ID conflict)' });
          }
          // Random delay 50-100ms
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        } else {
          throw error; // Rethrow other errors immediately
        }
      }
    }

    // After successful Sale creation, perform Khata updates (Side Effects)
    if (paymentMethod === 'Khata' && khataToUpdate && sale) {
      try {
        let chargeAmount = total;
        let paymentAmount = Number(paidAmount) || 0;

        // 1. Add Charge
        if (chargeAmount > 0) {
          khataToUpdate.totalAmount += chargeAmount;
          khataToUpdate.remainingAmount += chargeAmount;
          await KhataTransaction.create({
            khata: khataToUpdate._id,
            customer: khataToUpdate.customer,
            amount: chargeAmount,
            type: 'charge',
            note: `POS Sale Invoice #${finalInvoiceNumber}`,
            createdBy: req.user ? req.user._id : null,
            owner: req.user.ownerId || req.user._id
          });
        }

        // 2. Add Payment (if any)
        if (paymentAmount > 0) {
          khataToUpdate.remainingAmount -= paymentAmount;
          if (khataToUpdate.remainingAmount < 0) khataToUpdate.remainingAmount = 0;
          await KhataTransaction.create({
            khata: khataToUpdate._id,
            customer: khataToUpdate.customer,
            amount: paymentAmount,
            type: 'payment',
            note: `Down Payment for Invoice #${finalInvoiceNumber}`,
            createdBy: req.user ? req.user._id : null,
            owner: req.user.ownerId || req.user._id
          });
        }

        await khataToUpdate.save();

      } catch (khataError) {
        console.error('Khata Update Failed, rolling back sale:', khataError);
        // ROLLBACK: Delete the sale we just created so we don't have inconsistency
        await Sale.deleteOne({ _id: sale._id });
        return res.status(500).json({ success: false, message: `Khata update failed: ${khataError.message}` });
      }
    }

    res.status(201).json({ success: true, message: 'Sale completed', sale });
  } catch (error) {
    console.error('Create Sale Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTodaySales = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = { createdAt: { $gte: today, $lt: tomorrow } };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 });

    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);

    res.status(200).json({
      success: true,
      count: sales.length,
      totalSales,
      totalProfit,
      sales
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSaleByInvoice = async (req, res) => {
  try {
    const query = { invoiceNumber: req.params.invoiceNumber };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const sale = await Sale.findOne(query);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.refundSale = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    if (sale.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Sale already refunded' });
    }

    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    sale.status = 'refunded';
    await sale.save();

    res.status(200).json({ success: true, message: 'Sale refunded', sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    // 1. Restore Stock
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        if (!item.product) continue;
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    // 2. Revert Khata Transaction (if applicable)
    if (sale.paymentMethod === 'Khata' && sale.khataId) {
      const khata = await Khata.findById(sale.khataId);
      if (khata) {
        // Find the specific transactions linked to this sale
        // We look for the exact notes generated during creation
        const chargeTx = await KhataTransaction.findOne({
          khata: khata._id,
          note: { $regex: new RegExp(`POS Sale Invoice #${sale.invoiceNumber}`, 'i') },
          type: 'charge'
        });

        const paymentTx = await KhataTransaction.findOne({
          khata: khata._id,
          note: { $regex: new RegExp(`Down Payment for Invoice #${sale.invoiceNumber}`, 'i') },
          type: 'payment'
        });

        // Revert Charge Balance
        if (chargeTx) {
          khata.totalAmount = Math.max(0, khata.totalAmount - chargeTx.amount);
          khata.remainingAmount = Math.max(0, khata.remainingAmount - chargeTx.amount);

          await KhataTransaction.findByIdAndDelete(chargeTx._id);
        }

        // Revert Down Payment Balance (If they paid, debt goes back up if we just delete the payment record... 
        // BUT wait, we are deleting the *Sale*.
        // If we delete the Sale, the "Charge" (Debt) is gone.
        // If we delete the "Down Payment", that means we are acting as if the payment never happened.
        // BUT, if we returned the money to the customer (Refunding the down payment), then debt shouldn't change relative to the pre-sale state?
        // Let's trace:
        // Initial Debt: 0.
        // Sale: 1000. Debt becomes 1000. (Charge Tx)
        // Down Payment: 200. Debt becomes 800. (Payment Tx)
        // User deletes Sale.
        // We want Debt to go back to 0.
        // 1. Revert Charge: Debt 800 -> -200. (totalAmount also reduces).
        // 2. Revert Payment: Debt -200 -> 0. (Because deleting a payment increases the debt/reverts component).

        // YES. Deleting a payment transaction means "This payment never happened, so you still owe me that money".
        // So we ADD the payment amount back to remaining which was subtracted.

        if (paymentTx) {
          khata.remainingAmount += paymentTx.amount;
          await KhataTransaction.findByIdAndDelete(paymentTx._id);
        }

        await khata.save();
      }
    }

    await Sale.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('deleteSale error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};