const mongoose = require('mongoose');
const Sale = require('./models/Sale');
require('dotenv').config({ path: './.env' });

const inspectKhata = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('--- Inspecting Khata Sales with Total=0 ---');
        // Find Khata sales where total is 0 or missing
        const sales = await Sale.find({
            paymentMethod: 'Khata',
            total: 0
        }).limit(5).lean();

        console.log(`Found ${sales.length} such sales.`);

        sales.forEach(s => {
            console.log(`\nInvoice: ${s.invoiceNumber}`);
            console.log(`Total: ${s.total}, Paid: ${s.paidAmount}`);
            console.log(`Items count: ${s.items.length}`);
            s.items.forEach(i => {
                console.log(` - Product: ${i.productName}, Qty: ${i.quantity}, Price: ${i.sellPrice}, ItemTotal: ${i.itemTotal}`);
            });
            // Calculate what total SHOULD be
            const calcTotal = s.items.reduce((sum, i) => sum + (i.itemTotal || 0), 0);
            console.log(`>> Calculated Total from Items: ${calcTotal}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspectKhata();
