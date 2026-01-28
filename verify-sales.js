const Sale = require('./models/Sale');
require('dotenv').config({ path: './.env' });

const verifyAggregation = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        console.log('Start of Month:', startOfMonth);
        console.log('Start of Year:', startOfYear);

        const salesPreview = await Sale.find({ status: 'completed' }).limit(3);
        console.log('Sales Preview:', JSON.stringify(salesPreview, null, 2));

        const aggregation = await Sale.aggregate([
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
                    month: {
                        $sum: {
                            $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$items.quantity', 0]
                        }
                    },
                    year: { $sum: '$items.quantity' }
                }
            }
        ]);

        console.log('Aggregation Result:', JSON.stringify(aggregation, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

verifyAggregation();
