const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/dashboard/sales-report',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Payment Summary from API:', JSON.stringify(json.report.paymentSummary, null, 2));
        } catch (e) {
            console.log('Raw Data:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error fetching API:', error.message);
});

req.end();
