import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, MenuItem, Grid, IconButton, Autocomplete } from '@mui/material';
import { FaShoppingCart, FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Purchases = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  
  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState('');

  // Item Input State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('All');

  useEffect(() => {
    fetchData();
    const handleOnline = () => {
      toast.success('Back Online!');
      fetchData();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const fetchData = async () => {
    if (!navigator.onLine) {
      loadFromCache();
      return;
    }
    try {
      const [supRes, prodRes, purRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products'),
        api.get('/purchases')
      ]);
      setSuppliers(supRes.data.suppliers || []);
      setProducts(prodRes.data.products || []);
      setPurchases(purRes.data.purchases || []);
      
      // Cache Data
      localStorage.setItem('suppliers_cache', JSON.stringify(supRes.data.suppliers || []));
      localStorage.setItem('products_cache', JSON.stringify(prodRes.data.products || []));
      localStorage.setItem('purchases_cache', JSON.stringify(purRes.data.purchases || []));
    } catch (err) {
      console.error(err);
      loadFromCache();
    }
  };

  const loadFromCache = () => {
    const cSup = localStorage.getItem('suppliers_cache');
    const cProd = localStorage.getItem('products_cache');
    const cPur = localStorage.getItem('purchases_cache');
    if (cSup) setSuppliers(JSON.parse(cSup));
    if (cProd) setProducts(JSON.parse(cProd));
    if (cPur) setPurchases(JSON.parse(cPur));
    if (cSup || cProd || cPur) toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-pur' });
  };

  const addItem = () => {
    if (!selectedProduct || !qty || !cost) return;
    const newItem = {
      product: selectedProduct._id,
      productName: selectedProduct.name,
      quantity: Number(qty),
      buyPrice: Number(cost),
      total: Number(qty) * Number(cost)
    };
    setItems([...items, newItem]);
    setSelectedProduct(null);
    setQty('');
    setCost('');
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async () => {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot save purchase right now.');
      return;
    }
    if (!supplierId || items.length === 0) {
      toast.error('Select supplier and add items');
      return;
    }
    try {
      await api.post('/purchases', {
        supplierId,
        invoiceNumber,
        date,
        items,
        totalAmount,
        paidAmount: Number(paidAmount)
      });
      toast.success('Purchase recorded & Stock updated!');
      // Reset Form
      setItems([]);
      setSupplierId('');
      setInvoiceNumber('');
      setPaidAmount('');
      fetchData();
    } catch (err) {
      toast.error('Failed to save purchase');
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    if (!window.confirm('Delete this purchase? Stock and Supplier Balance will be reversed.')) return;
    try {
      await api.delete(`/purchases/${id}`);
      toast.success('Purchase deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FaShoppingCart /> Purchase Orders
      </Typography>

      <Grid container spacing={3}>
        {/* New Purchase Form */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>New Purchase</Typography>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6}>
                <TextField select label="Supplier" fullWidth size="small" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  {suppliers.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Date" type="date" fullWidth size="small" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Invoice Number (Optional)" fullWidth size="small" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </Grid>
            </Grid>

            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>Add Item</Typography>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name}
                value={selectedProduct}
                onChange={(e, v) => setSelectedProduct(v)}
                renderInput={(params) => <TextField {...params} label="Select Product" size="small" sx={{ mb: 1 }} />}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="Qty" type="number" size="small" value={qty} onChange={(e) => setQty(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Cost Price" type="number" size="small" value={cost} onChange={(e) => setCost(e.target.value)} sx={{ flex: 1 }} />
                <Button variant="contained" onClick={addItem}><FaPlus /></Button>
              </Box>
            </Box>

            <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
              {items.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: '1px solid #eee' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{item.productName}</Typography>
                    <Typography variant="caption">{item.quantity} x {item.buyPrice}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={600}>{formatPKR(item.total)}</Typography>
                    <IconButton size="small" color="error" onClick={() => removeItem(i)}><FaTrash size={12} /></IconButton>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography fontWeight={700}>Total Payable:</Typography>
              <Typography fontWeight={700} color="primary">{formatPKR(totalAmount)}</Typography>
            </Box>
            <TextField label="Paid Amount" type="number" fullWidth size="small" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} sx={{ mb: 2 }} />
            
            <Button variant="contained" fullWidth startIcon={<FaSave />} onClick={handleSubmit} disabled={items.length === 0}>
              Save Purchase
            </Button>
          </Paper>
        </Grid>

        {/* Recent Purchases List */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>Recent Purchases</Typography>
              <TextField
                select
                size="small"
                label="Filter Supplier"
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                sx={{ width: 180 }}
              >
                <MenuItem value="All">All Suppliers</MenuItem>
                {suppliers.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
              </TextField>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchases
                    .filter(p => filterSupplier === 'All' || p.supplier?._id === filterSupplier)
                    .map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                      <TableCell>{p.supplier?.name}</TableCell>
                      <TableCell>
                        {p.items?.map((item, idx) => (
                          <Typography key={idx} variant="body2" fontSize={12}>
                            {item.productName} <span style={{ color: '#64748b' }}>x{item.quantity}</span>
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell fontWeight={600}>{formatPKR(p.totalAmount)}</TableCell>
                      <TableCell sx={{ color: 'success.main' }}>{formatPKR(p.paidAmount)}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleDelete(p._id)}><FaTrash /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Purchases;