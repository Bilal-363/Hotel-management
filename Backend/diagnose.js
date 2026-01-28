const http = require('http');

function request(method, path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function diagnose() {
    console.log('--- Starting Diagnosis ---');

    // 1. Check Root (Version)
    try {
        const rootRes = await request('GET', '/');
        console.log(`Root Status: ${rootRes.status}`);
        console.log(`Root Data: ${rootRes.data}`);
    } catch (e) {
        console.log('Root Request Failed:', e.message);
    }

    // 2. Check Delete Route (Expect 401 Unauthorized if route exists, 404 if not)
    try {
        const deleteRes = await request('DELETE', '/api/sales/123456789012345678901234');
        console.log(`Delete Status: ${deleteRes.status}`);
        // If 404: Route missing.
        // If 401: Route exists but needs auth. << SUCCESS
        // If 200/500: Route exists.
    } catch (e) {
        console.log('Delete Request Failed:', e.message);
    }
}

diagnose();
