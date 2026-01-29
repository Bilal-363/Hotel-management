import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, TextField, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material';
import { FaPlus, FaMinus, FaTrash, FaShoppingCart, FaMoneyBillWave, FaMobileAlt, FaCreditCard, FaPrint, FaBook, FaSync } from 'react-icons/fa';
import api from '../services/api';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetDatabase } from '../db';
import toast from 'react-hot-toast';

import { getKhatas, createCustomer, createKhata, getKhata } from '../services/khataService';

const POS = () => {
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [receiptModal, setReceiptModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Khata States
  const [selectedKhata, setSelectedKhata] = useState(null); // Customer's Khata ID
  const [paidAmount, setPaidAmount] = useState(''); // Amount paid NOW
  const [khataHistory, setKhataHistory] = useState([]); // Transactions for receipt

  const [createKhataModal, setCreateKhataModal] = useState(false);
  const [newKhataData, setNewKhataData] = useState({ name: '', phone: '' });

  const [historyModal, setHistoryModal] = useState(false);
  const [khataValues, setKhataValues] = useState({ paid: 0, remaining: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Live Queries
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const dbCategories = useLiveQuery(() => db.categories.where('type').equals('product').toArray()) || [];
  const khatas = useLiveQuery(() => db.khatas.toArray()) || [];

  const categories = ['All', ...dbCategories.map(c => c.name)];

  const paymentMethods = [
    { name: 'Khata', icon: <FaBook /> },
    { name: 'Cash', icon: <FaMoneyBillWave /> },
    { name: 'JazzCash', icon: <FaMobileAlt /> },
    { name: 'EasyPaisa', icon: <FaMobileAlt /> },
    { name: 'Card', icon: <FaCreditCard /> }
  ];

  const fetchKhataHistory = async (id) => {
    try {
      if (!id) return;
      setHistoryLoading(true); // START LOADING
      const res = await getKhata(id);
      setKhataHistory(res?.transactions?.slice(0, 5) || []);
    } catch (err) {
      console.error('Failed to fetch khata history', err);
      setKhataHistory([]); // Safe fallback
    } finally {
      setHistoryLoading(false); // STOP LOADING
    }
  };

  useEffect(() => {
    if (paymentMethod === 'Khata') {
      loadKhatas();
      setDiscount(0);
    }
  }, [paymentMethod]);

  const loadKhatas = async () => {
    try {
      const res = await getKhatas();
      
      // Filter to ensure only one Khata per customer is shown
      const uniqueKhatas = [];
      const seenCustomers = new Set();

      if (res.khatas && Array.isArray(res.khatas)) {
        res.khatas.forEach(k => {
          // Ensure we have a customer object
          if (k.customer && k.customer._id) {
            if (!seenCustomers.has(k.customer._id)) {
              seenCustomers.add(k.customer._id);
              uniqueKhatas.push(k);
            }
          }
        });
      }
      
      await db.khatas.clear();
      await db.khatas.bulkAdd(uniqueKhatas);
    } catch (err) {
      console.error('Failed to load khatas', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    loadKhatas();
  }, []);

  useEffect(() => {
    if (paymentMethod === 'Khata') {
      loadKhatas();
      setDiscount(0);
    }
  }, [paymentMethod]);

  // SYNC LOGIC FOR SALES
  const syncSales = async () => {
    if (!navigator.onLine) return;
    
    const pendingSales = await db.sales.where('syncStatus').equals('pending').toArray();
    
    for (const sale of pendingSales) {
      try {
        // Remove local ID and sync status before sending
        const { id, syncStatus, invoiceNumber, items, ...rest } = sale;
        
        // Map items to API format (clean up extra offline fields)
        const apiItems = items.map(i => ({
          productId: i.productId || i._id,
          quantity: i.quantity
        }));

        const res = await api.post('/sales', { ...rest, items: apiItems });
        
        // Update local status AND replace temp ID/Invoice with Server's
        await db.sales.update(id, { 
          syncStatus: 'synced',
          invoiceNumber: res.data.sale.invoiceNumber,
          _id: res.data.sale._id
        });
        
        // Optional: Delete synced sales from local DB to save space, 
        // or keep them for offline history viewing.
        // await db.sales.delete(id); 
        
      } catch (err) {
        console.error("Failed to sync sale", sale.invoiceNumber, err);
      }
    }
  };

  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) syncSales();
    };
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    if (navigator.onLine) syncSales();
    return () => { window.removeEventListener('online', handleStatus); window.removeEventListener('offline', handleStatus); };
  }, []);

  // SESSION CHECK: Clear DB if user changes
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      const lastToken = localStorage.getItem('db_token');
      
      if (token && lastToken && token !== lastToken) {
        await resetDatabase();
        localStorage.setItem('db_token', token);
        window.location.reload();
      } else if (token) {
        localStorage.setItem('db_token', token);
      }
    };
    checkSession();
  }, []);

  const handleManualReset = async () => {
    if (window.confirm('Reload data from server? This will clear local cache.')) {
      await resetDatabase();
      window.location.reload();
    }
  };

  const handleCreateKhata = async () => {
    try {
      if (!newKhataData.name) return alert('Name is required');

      // 1. Create Customer
      const customerRes = await createCustomer({
        name: newKhataData.name,
        phone: newKhataData.phone
      });

      const customer = customerRes.customer;

      // 2. Create Khata for Customer
      const khataRes = await createKhata({
        customerId: customer._id,
        title: `${customer.name}'s Khata`,
        totalAmount: 0
      });

      const newKhata = khataRes.khata;

      // 3. Refresh List & Select New Khata
      await loadKhatas();

      // We need to find the full object from the refreshed list to ensure structure matches
      // But for immediate UI feedback we can construct it or just reload.
      // Let's reload and filter.
      const res = await getKhatas();
      const createdKhata = res.khatas.find(k => k._id === newKhata._id);

      if (createdKhata) {
        setSelectedKhata(createdKhata);
        setCustomerName(createdKhata.customer.name);
      }

      setCreateKhataModal(false);
      setNewKhataData({ name: '', phone: '' });

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create khata');
    }
  };

  const handleViewHistory = async () => {
    if (!selectedKhata) return;
    try {
      // Fetch sales linked to this khata
      const res = await api.get(`/sales?khataId=${selectedKhata._id}`);
      setKhataHistory(res.data.sales || []);
      setHistoryModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load history');
    }
  };



  const fetchProducts = async () => {
    try {
      const [res, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories/product')
      ]);
      
      let fetchedProducts = res.data.products || [];

      // CRITICAL: Adjust fetched stock by subtracting pending offline sales
      // This prevents the server's old stock count from overwriting your local sales
      const pendingSales = await db.sales.where('syncStatus').equals('pending').toArray();
      const pendingQtyMap = {};
      pendingSales.forEach(sale => {
        sale.items.forEach(item => {
          pendingQtyMap[item.productId] = (pendingQtyMap[item.productId] || 0) + item.quantity;
        });
      });

      fetchedProducts = fetchedProducts.map(p => ({
        ...p,
        stock: p.stock - (pendingQtyMap[p._id] || 0)
      }));

      await db.products.clear();
      await db.products.bulkAdd(fetchedProducts);
      
      // Categories are handled by LiveQuery from db.categories

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCategory = category === 'All' || (p.category && p.category.toLowerCase() === category.toLowerCase());
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch && p.stock > 0;
  });

  const addToCart = (product) => {
    const exists = cart.find(item => item._id === product._id);
    if (exists) {
      if (exists.quantity < product.stock) {
        setCart(cart.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.stock) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const setCartQuantity = (id, val) => {
    const newQty = parseInt(val) || 1; // Default to 1 if empty/invalid
    setCart(cart.map(item => {
      if (item._id === id) {
        if (newQty >= 1 && newQty <= item.stock) {
          return { ...item, quantity: newQty };
        }
        if (newQty > item.stock) return { ...item, quantity: item.stock };
        if (newQty < 1) return { ...item, quantity: 1 };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item._id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerName('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sellPrice * item.quantity), 0);
  const total = subtotal - discount;

  const handleCheckout = async () => {
    // Allow if cart has items OR if it's a Khata payment with an amount (debt repayment)
    const isKhataPayment = paymentMethod === 'Khata' && Number(paidAmount) > 0;
    if (cart.length === 0 && !isKhataPayment) return;

    if (paymentMethod === 'Khata' && !selectedKhata) {
      alert('Please select a Khata account');
      return;
    }
    try {
      const saleData = {
        items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
        discount,
        paymentMethod,
        customerName: paymentMethod === 'Khata' ? (selectedKhata?.customer?.name || selectedKhata?.title) : (customerName || 'Walk-in Customer'),
        khataId: paymentMethod === 'Khata' ? selectedKhata?._id : undefined,
        paidAmount: paymentMethod === 'Khata' ? Number(paidAmount) : 0
      };

      let saleResult;

      if (navigator.onLine) {
        const res = await api.post('/sales', saleData);
        saleResult = res.data.sale;
        
        // Ensure items have names for receipt/local DB (in case backend doesn't populate immediately)
        if (saleResult.items && saleResult.items.length > 0 && !saleResult.items[0].productName) {
           saleResult.items = saleResult.items.map((item, idx) => ({
             ...item,
             productName: cart[idx]?.name || 'Item'
           }));
        }

        // Save to DB as synced for history
        await db.sales.add({ ...saleResult, syncStatus: 'synced' });
      } else {
        // OFFLINE MODE
        saleResult = {
          ...saleData,
          invoiceNumber: `OFF-${Date.now().toString().slice(-6)}`,
          total: total,
          subtotal: subtotal,
          createdAt: new Date().toISOString(),
          items: cart.map(item => ({ 
            ...item, 
            productId: item._id, // Critical for stock calculation
            productName: item.name, 
            itemTotal: item.sellPrice * item.quantity 
          })),
          syncStatus: 'pending'
        };
        
        // Transaction to save sale AND update local stock immediately
        await db.transaction('rw', db.sales, db.products, db.khatas, async () => {
          // 1. Update Stock
          for (const item of cart) {
            const product = await db.products.get({ _id: item._id });
            if (product) {
              await db.products.update(product.id, { stock: product.stock - item.quantity });
            }
          }

          // 2. Update Khata Balance Locally (So next receipt shows correct balance)
          if (paymentMethod === 'Khata' && selectedKhata?._id) {
            const khata = await db.khatas.get({ _id: selectedKhata._id });
            if (khata) {
              const change = total - (Number(paidAmount) || 0);
              const newRemaining = (khata.remainingAmount || 0) + change;
              
              await db.khatas.update(khata.id, { remainingAmount: newRemaining });
              saleResult.khataRemainingAfterSale = newRemaining; // For Receipt
            }
          }

          // 3. Save Sale
          await db.sales.add(saleResult);
        });
        
        toast.success('Saved Offline (Will sync when online)');
      }

      setLastSale(saleResult);

      setReceiptModal(true); // SHOW RECEIPT IMMEDIATELY

      // Fetch history in background (don't await fully to block UI)
      if (paymentMethod === 'Khata' && (selectedKhata?._id || res.data.sale.khataId)) {
        fetchKhataHistory(res.data.sale.khataId || selectedKhata._id);
      } else {
        setKhataHistory([]);
      }
      if (paymentMethod === 'Khata') {
        setSelectedKhata(null);
        setKhataValues({ paid: 0, remaining: 0 });
        setCustomerName('');
        loadKhatas();
      }
      clearCart();
      if (navigator.onLine) fetchProducts(); // Only fetch if online
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Checkout failed';
      alert(`Error: ${msg}`);
    }
  };

  const formatPKR = (amount) => `Rs. ${(Number(amount) || 0).toLocaleString()}`;


  const handlePrint = () => {
    window.print();
  };



  return (
    <Box>
      <style>
        {`
          .no-spin::-webkit-inner-spin-button, 
          .no-spin::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
          }
          .no-spin {
            -moz-appearance: textfield;
          }
        `}
      </style>
      {/* PRINT-ONLY RECEIPT */}
      <Box sx={{ display: 'none', '@media print': { display: 'block !important' } }}>
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              #receipt-content, #receipt-content * { visibility: visible; }
              #receipt-content {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                top: 0;
                width: 76mm;
                background-color: white;
                font-family: 'Arial', 'Helvetica', sans-serif;
              }
              @page { size: 80mm auto; margin: 0; }
              .dashed-line { border-top: 2px dashed black; margin: 8px 0; width: 100%; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .text-left { text-align: left; }
              .bold { fontWeight: 900 !important; }
              .row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-bottom: 4px; }
              .small-text { font-size: 14px; font-weight: 900; }
              table { width: 100%; font-size: 16px; border-collapse: collapse; font-weight: 900; table-layout: fixed; }
              th, td { padding: 4px 0; vertical-align: top; }
            }
          `}
        </style>
        <Box id="receipt-content">
          {/* Header */}
          <Box className="text-center" sx={{ mb: 1.5 }}>
            <Typography fontWeight={900} fontSize={32} sx={{ textTransform: 'uppercase', letterSpacing: '-1px', whiteSpace: 'nowrap', textAlign: 'center' }}>HAJI WARIS ALI</Typography>
            <Typography fontWeight={900} fontSize={18} sx={{ mt: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' }}>Haji waris hotel & traders</Typography>
            <Typography fontWeight={900} fontSize={18} sx={{ mt: 0.5, whiteSpace: 'nowrap', textAlign: 'center' }}>Haji waris hotel Renala Khurd</Typography>
          </Box>

          <div className="dashed-line"></div>

          {/* Metadata */}
          <Box sx={{ fontSize: '16px', mb: 1, fontWeight: '900' }}>
            <div className="row">
              <span>Inv #: {lastSale?.invoiceNumber}</span>
              <span>Time: {new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="row">
              <span>Date: {new Date().toLocaleDateString('en-PK')}</span>
            </div>
            <div className="row">
              <span>Cust: {lastSale?.customerName || 'Walk-in'}</span>
            </div>
          </Box>

          <div className="dashed-line"></div>

          {/* Items Table */}
          <table style={{ width: '100%', fontSize: '16px', borderCollapse: 'collapse', fontWeight: '900' }}>
            <thead>
              <tr>
                <th className="text-left" style={{ width: '55%', paddingBottom: '5px' }}>Item</th>
                <th className="text-center" style={{ width: '10%', paddingBottom: '5px' }}>Qty</th>
                <th className="text-right" style={{ width: '15%', paddingBottom: '5px' }}>Price</th>
                <th className="text-right" style={{ width: '20%', paddingBottom: '5px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lastSale?.items?.map((item, i) => (
                <tr key={i}>
                  <td className="text-left" style={{ padding: '4px 0', wordBreak: 'break-word' }}>{item.productName}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{item.sellPrice}</td>
                  <td className="text-right">{item.itemTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dashed-line"></div>

          {/* Totals */}
          <Box sx={{ fontSize: '18px', mb: 1, fontWeight: '900' }}>
            <div className="row" style={{ fontSize: '18px' }}>
              <span>Subtotal:</span>
              <span>{lastSale?.subtotal}</span>
            </div>
            {lastSale?.discount > 0 && (
              <div className="row" style={{ fontSize: '18px' }}>
                <span>Discount:</span>
                <span>-{lastSale?.discount}</span>
              </div>
            )}
            <div className="dashed-line"></div>
            <div className="row" style={{ fontSize: '24px', fontWeight: '900', marginTop: '5px' }}>
              <span>Total:</span>
              <span>{lastSale?.total}</span>
            </div>
            {lastSale?.paymentMethod === 'Khata' && (
              <>
                <div className="dashed-line"></div>
                <div className="row" style={{ fontSize: '18px' }}>
                  <span>Paid:</span>
                  <span>{lastSale?.paidAmount || 0}</span>
                </div>
                <div className="row" style={{ fontSize: '18px' }}>
                  <span>Remaining (Udhaar):</span>
                  <span>{lastSale?.khataRemainingAfterSale || 0}</span>
                </div>

                <div className="dashed-line"></div>
                {historyLoading ? (
                  <Typography fontSize={12} textAlign="center" sx={{ mt: 1 }}>Loading previous history...</Typography>
                ) : khataHistory.length > 0 ? (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography fontSize={14} fontWeight="900" textAlign="center" sx={{ textTransform: 'uppercase', mb: 0.5 }}>Last 5 Transactions</Typography>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', fontWeight: '900' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px dashed black' }}>
                          <th className="text-left">Date</th>
                          <th className="text-center">Type</th>
                          <th className="text-right">Amount</th>
                          <th className="text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          try {
                            // SAFEGUARD: Ensure khataHistory is an array
                            if (!Array.isArray(khataHistory)) return null;

                            let currentBalance = lastSale?.khataRemainingAfterSale || 0;
                            const rows = [];
                            let tempBal = currentBalance;

                            for (let i = 0; i < khataHistory.length; i++) {
                              const tx = khataHistory[i];
                              if (!tx) continue;

                              const amount = Number(tx.amount) || 0;
                              rows.push({ ...tx, balance: tempBal });

                              if (tx.type === 'charge') {
                                tempBal = tempBal - amount;
                              } else if (tx.type === 'payment') {
                                tempBal = tempBal + amount;
                              }
                            }

                            return rows.map((tx, i) => (
                              <tr key={i}>
                                <td className="text-left">{new Date(tx.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                <td className="text-center">{tx.type === 'charge' ? 'Bill' : 'Pay'}</td>
                                <td className="text-right">{formatPKR(Number(tx.amount))}</td>
                                <td className="text-right">{formatPKR(tx.balance)}</td>
                              </tr>
                            ));
                          } catch (e) {
                            console.error('Receipt rendering error', e);
                            return <tr><td colSpan="4">Error loading history</td></tr>;
                          }
                        })()}
                      </tbody>
                    </table>
                  </Box>
                ) : (
                  <Typography fontSize={12} textAlign="center" sx={{ mt: 1 }}>No previous history found.</Typography>
                )}
              </>
            )}
          </Box>

          <div className="dashed-line"></div>

          {/* Footer */}
          <Box className="text-center" sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography fontSize={14} fontWeight="900" sx={{ whiteSpace: 'nowrap', textAlign: 'center', width: '100%' }}>*** Thank You! Please Come Again ***</Typography>
            <Box sx={{ mt: 1, textAlign: 'center', width: '100%' }}>
              <Typography fontSize={17} fontWeight="900">Software by:</Typography>
              <Typography fontSize={14} fontWeight="900" sx={{ whiteSpace: 'nowrap' }}>Devugo Tech Solution | 0302-6662609</Typography>
            </Box>

            {/* Barcode Placeholder if needed, implied by reference image having one, but not strictly requested yet. 
                Reference image shows a simple barcode. I'll stick to text for now unless asked. 
            */}
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
              {/* Simple visual mimic of barcode lines if we wanted, but better to leave clean for now */}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* NORMAL UI */}
      <Box sx={{ '@media print': { display: 'none' } }}>
        <Typography variant="h4" fontWeight={700} mb={3} sx={{ display: 'flex', alignItems: 'center' }}>
          Point of Sale
          <IconButton onClick={handleManualReset} sx={{ ml: 2 }} title="Reset Data" color="primary"><FaSync /></IconButton>
          {!isOnline && <Chip label="OFFLINE MODE" color="error" sx={{ ml: 2 }} />}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <Chip key={cat} label={cat} onClick={() => setCategory(cat)} color={category === cat ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
                ))}
              </Box>
              <TextField fullWidth size="small" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2, maxHeight: '60vh', overflowY: 'auto' }}>
              {filteredProducts.map(product => (
                <Paper key={product._id} onClick={() => addToCart(product)} sx={{ p: 2, textAlign: 'center', cursor: 'pointer', border: product.stock <= product.minStock ? '2px solid #f59e0b' : '2px solid transparent', '&:hover': { borderColor: '#2563eb' } }}>
                  <Typography fontWeight={600} fontSize={14}>{product.name}</Typography>
                  <Typography color="text.secondary" fontSize={12}>{product.size}</Typography>
                  <Typography color="primary" fontWeight={700} fontSize={18} mt={1}>{formatPKR(product.sellPrice)}</Typography>
                  <Typography fontSize={11} color={product.stock <= product.minStock ? 'error' : 'text.secondary'}>Stock: {product.stock}</Typography>
                </Paper>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ height: '100%' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography fontWeight={600}><FaShoppingCart style={{ marginRight: 8 }} /> Cart ({cart.length})</Typography>
                {cart.length > 0 && <Button size="small" color="error" onClick={clearCart}>Clear</Button>}
              </Box>

              <Box sx={{ maxHeight: 280, overflowY: 'auto', p: 1 }}>
                {cart.map(item => (
                  <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, mb: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Box>
                      <Typography fontSize={14} fontWeight={500}>{item.name}</Typography>
                      <Typography fontSize={12} color="text.secondary">{formatPKR(item.sellPrice)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item._id, -1)}><FaMinus size={12} /></IconButton>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => setCartQuantity(item._id, e.target.value)}
                        className="no-spin"
                        style={{ width: '80px', textAlign: 'center', padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', outline: 'none' }}
                      />
                      <IconButton size="small" onClick={() => updateQuantity(item._id, 1)}><FaPlus size={12} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => removeFromCart(item._id)}><FaTrash size={12} /></IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                {paymentMethod === 'Khata' && (
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Autocomplete
                        fullWidth
                        options={khatas}
                        getOptionLabel={(option) => `${option.customer?.name} (${option.title})`}
                        value={selectedKhata}
                        onChange={(event, newValue) => {
                          setSelectedKhata(newValue);
                          if (newValue) {
                            setCustomerName(newValue.customer?.name);
                            setKhataValues({
                              remaining: newValue.remainingAmount,
                              paid: newValue.totalAmount - newValue.remainingAmount
                            });
                          }
                        }}
                        renderInput={(params) => <TextField {...params} label="Select Khata" size="small" />}
                      />
                      <Button variant="contained" sx={{ minWidth: 50, px: 0 }} onClick={() => setCreateKhataModal(true)}>
                        <FaPlus />
                      </Button>
                    </Box>

                    {selectedKhata && (
                      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                            Khata Balance:
                          </Typography>
                          <Button size="small" sx={{ minWidth: 'auto', p: 0.5 }} onClick={handleViewHistory}>
                            View Details
                          </Button>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography fontSize={13} color="text.secondary">Total Paid:</Typography>
                          <Typography fontSize={13} fontWeight={700} color="success.main">
                            {formatPKR(khataValues.paid)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography fontSize={13} color="text.secondary">Remaining (Udhaar):</Typography>
                          <Typography fontSize={13} fontWeight={700} color="error.main">
                            {formatPKR(selectedKhata.remainingAmount)}
                          </Typography>
                        </Box>
                      </Paper>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                      <TextField
                        label="Paid Now (Optional)"
                        size="small"
                        type="number"
                        fullWidth
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                      />
                      <Box sx={{ minWidth: 150 }}>
                        {(total - (Number(paidAmount) || 0)) > 0 ? (
                          <>
                            <Typography fontSize={11} color="text.secondary">Added to Udhaar:</Typography>
                            <Typography fontWeight={700} color="error">{formatPKR(total - (Number(paidAmount) || 0))}</Typography>
                          </>
                        ) : (total - (Number(paidAmount) || 0)) < 0 ? (
                          <>
                            <Typography fontSize={11} color="text.secondary">Udhaar Reduced by:</Typography>
                            <Typography fontWeight={700} color="success.main">{formatPKR(Math.abs(total - (Number(paidAmount) || 0)))}</Typography>
                          </>
                        ) : (
                          <Typography fontWeight={700} color="success.main" sx={{ mt: 1 }}>Fully Paid</Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {paymentMethods.map(pm => (
                    <Button key={pm.name} size="small" variant={paymentMethod === pm.name ? 'contained' : 'outlined'} onClick={() => setPaymentMethod(pm.name)} startIcon={pm.icon} sx={{ flex: 1 }}>
                      {pm.name}
                    </Button>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal:</Typography>
                  <Typography fontWeight={600}>{formatPKR(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography>Discount:</Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={discount}
                    disabled={paymentMethod === 'Khata'}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    sx={{ width: 100 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '2px dashed #e2e8f0' }}>
                  <Typography variant="h6" fontWeight={700}>Total:</Typography>
                  <Typography variant="h6" fontWeight={700} color="success.main">{formatPKR(total)}</Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 && (paymentMethod !== 'Khata' || !Number(paidAmount))}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  {cart.length === 0 && paymentMethod === 'Khata' && Number(paidAmount) > 0 ? 'Receive Payment' : 'Complete Sale'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Dialog open={receiptModal} onClose={() => setReceiptModal(false)} maxWidth="sm">
          <DialogTitle>Sale Complete!</DialogTitle>
          <DialogContent>
            {lastSale && (
              <Box sx={{ fontFamily: 'monospace', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                {console.log('RECEIPT DEBUG:', {
                  method: lastSale.paymentMethod,
                  isKhata: lastSale.paymentMethod === 'Khata',
                  historyLen: khataHistory.length,
                  historyLoading
                })}
                <Typography textAlign="center" fontWeight={700} mb={2}>Invoice #{lastSale.invoiceNumber}</Typography>
                <Typography textAlign="center" mb={1}>Haji Waris Ali Hotel & General Store</Typography>
                {lastSale.items?.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography fontSize={14}>{item.productName} x{item.quantity}</Typography>
                    <Typography fontSize={14}>{formatPKR(item.itemTotal)}</Typography>
                  </Box>
                ))}
                <Box sx={{ borderTop: '1px dashed #ccc', mt: 2, pt: 2 }}>
                  <Typography fontWeight={700} fontSize={18} textAlign="right">Total: {formatPKR(lastSale.total)}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReceiptModal(false)}>Close</Button>
            <Button variant="contained" startIcon={<FaPrint />} onClick={handlePrint}>Print Receipt</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={createKhataModal} onClose={() => setCreateKhataModal(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Create New Khata</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Customer Name"
                fullWidth
                value={newKhataData.name}
                onChange={(e) => setNewKhataData({ ...newKhataData, name: e.target.value })}
              />
              <TextField
                label="Phone Number"
                fullWidth
                value={newKhataData.phone}
                onChange={(e) => setNewKhataData({ ...newKhataData, phone: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateKhataModal(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateKhata}>Create</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={historyModal} onClose={() => setHistoryModal(false)} maxWidth="md" fullWidth>
          <DialogTitle>Purchase History - {selectedKhata?.customer?.name}</DialogTitle>
          <DialogContent>
            {khataHistory.length === 0 ? (
              <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No purchase history found.</Typography>
            ) : (
              <Box>
                {khataHistory?.map(sale => (
                  <Box key={sale._id} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, bgcolor: '#f8fafc', p: 1, borderRadius: 1 }}>
                      <Typography fontWeight={600}>Invoice #{sale.invoiceNumber}</Typography>
                      <Typography fontSize={12} color="text.secondary">{new Date(sale.createdAt).toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ pl: 1 }}>
                      {sale.items?.map((item, idx) => (
                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography fontSize={13}>{item.productName} <span style={{ color: '#64748b' }}>x{item.quantity}</span></Typography>
                          <Typography fontSize={13}>{formatPKR(item.itemTotal)}</Typography>
                        </Box>
                      ))}
                      <Box sx={{ borderTop: '1px dashed #ddd', mt: 1, pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography fontSize={13}>Total: <b>{formatPKR(sale.total)}</b></Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHistoryModal(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default POS;
