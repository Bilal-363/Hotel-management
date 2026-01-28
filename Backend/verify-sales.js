const mongoose = require('mongoose');
const Sale = require('./models/Sale');
require('dotenv').config({ path: './.env' });

const verifyAggregation = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Payment Summary Aggregation
        console.log('--- Testing Payment Summary ---');
        const paymentSummary = await Sale.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$total' },
                    paid: { $sum: '$paidAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('Payment Summary Result:', JSON.stringify(paymentSummary, null, 2));

        // 2. Product Performance Aggregation
        console.log('--- Testing Product Performance ---');
        const now = new Date(); // 2026-01-24
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const productPerformance = await Sale.aggregate([
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
                    year: { $sum: '$items.quantity' }
                }
            },
            {
                $addFields: {
                    _id: { $toString: '$_id' }
                }
            },
            { $limit: 3 }
        ]);
        console.log('Product Performance Sample:', JSON.stringify(productPerformance, null, 2));

        if (productPerformance.length > 0) {
            const pId = productPerformance[0]._id;
            const Product = require('./models/Product');
            try {
                const product = await Product.findById(pId);
                console.log('Product Found via String ID?', product ? product.name : 'NO');
            } catch (e) {
                console.log('Error looking up product by string ID:', e.message);
            }
        }

        console.log('--- Checking Field Types ---');
        const sampleSales = await Sale.find({ status: 'completed' }).limit(3).lean();
        sampleSales.forEach(s => {
            console.log(`Sale ${s.invoiceNumber}: Total is ${typeof s.total} (${s.total}), Paid is ${typeof s.paidAmount} (${s.paidAmount})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verifyAggregation();
