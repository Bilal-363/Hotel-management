const mongoose = require('mongoose');
const Sale = require('./Backend/models/Sale');
require('dotenv').config({ path: './Backend/.env' });

const debugSales = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const totalSales = await Sale.countDocuments();
        const completedSales = await Sale.countDocuments({ status: 'completed' });

        // Check date ranges
        const firstSale = await Sale.findOne().sort({ createdAt: 1 });
        const lastSale = await Sale.findOne().sort({ createdAt: -1 });

        console.log('Total Sales:', totalSales);
        console.log('Completed Sales:', completedSales);
        console.log('First Sale Date:', firstSale?.createdAt);
        console.log('Last Sale Date:', lastSale?.createdAt);

        // Check specific aggregation for 2026
        const now = new Date(); // 2026-01-24 based on system time
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        console.log('Filtering for dates >=', startOfYear);

        const matchCount = await Sale.countDocuments({
            status: 'completed',
            createdAt: { $gte: startOfYear }
        });
        console.log('Sales found for this year:', matchCount);

        if (matchCount > 0) {
            // Run the aggregation
            const agg = await Sale.aggregate([
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
                        month: { $sum: 1 }, // Simple count first to verify grouping
                        quantity: { $sum: '$items.quantity' }
                    }
                },
                { $limit: 5 }
            ]);
            console.log('Aggregation Sample:', JSON.stringify(agg, null, 2));
        } else {
            console.log('NO SALES found for the current year. That explains the 0s.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugSales();
