import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox } from '@mui/material';
import { FaReceipt, FaEye, FaCalendar, FaTrash } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const Sales = () => {
  // const [sales, setSales] = useState([]); // Removed local state
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk Selection State
  const [selectedSales, setSelectedSales] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Live Query: Reads from local DB (includes offline sales)
  const allSales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray()) || [];

  // Filter logic applied to local data
  const sales = allSales.filter(s => {
    if (!startDate || !endDate) return true;
    const sDate = new Date(s.createdAt).toISOString().split('T')[0];
    return sDate >= startDate && sDate <= endDate;
  });

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      let url = '/sales';
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      
      if (res.data.sales) {
        await db.transaction('rw', db.sales, async () => {
          // Only delete synced sales, keep pending ones so we don't lose them
          await db.sales.where('syncStatus').equals('synced').delete();
          
          const salesToCache = res.data.sales.map(s => ({ ...s, syncStatus: 'synced' }));
          await db.sales.bulkAdd(salesToCache);
        });
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewSale = (sale) => {
    setSelectedSale(sale);
    setDetailModal(true);
  };

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);



  const handleDelete = async () => {
    if (!selectedSale?._id) return;
    if (!window.confirm(`Are you sure you want to delete Invoice #${selectedSale.invoiceNumber}? This will revert stock and any Khata transactions.`)) {
      return;
    }

    try {
      await api.delete(`/sales/${selectedSale._id}`);
      
      // Remove from local DB
      const localSale = await db.sales.where('invoiceNumber').equals(selectedSale.invoiceNumber).first();
      if (localSale) {
        await db.sales.delete(localSale.id);
      }

      setDetailModal(false);
      fetchSales(); // Refresh list
      toast.success('Invoice deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete sale');
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    setSelectAll(e.target.checked);
    if (e.target.checked) {
      setSelectedSales(sales.map(s => s._id));
    } else {
      setSelectedSales([]);
    }
  };

  const handleSelectSale = (saleId) => {
    if (selectedSales.includes(saleId)) {
      setSelectedSales(selectedSales.filter(id => id !== saleId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedSales, saleId];
      setSelectedSales(newSelected);
      if (newSelected.length === sales.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSales.length === 0) return;

    if (window.confirm(`Are you sure you want to delete ${selectedSales.length} selected invoices? This prevents stock/khata reversal for ALL selected items.`)) {
      try {
        await Promise.all(selectedSales.map(id => api.delete(`/sales/${id}`)));
        toast.success(`${selectedSales.length} invoices deleted successfully`);
        setSelectedSales([]);
        setSelectAll(false);
        fetchSales();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete some invoices');
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}><FaReceipt style={{ marginRight: 10 }} /> Sales History</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label="Start Date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField type="date" size="small" label="End Date" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button variant="contained" onClick={fetchSales}>Filter</Button>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 3 }}>
            <Box><Typography variant="body2" color="text.secondary">Total Sales</Typography><Typography fontWeight={700} color="primary">{formatPKR(totalSales)}</Typography></Box>
            <Box><Typography variant="body2" color="text.secondary">Total Profit</Typography><Typography fontWeight={700} color="success.main">{formatPKR(totalProfit)}</Typography></Box>
          </Box>
        </Box>
      </Paper>



      {/* Bulk Actions Toolbar */}
      {
        selectedSales.length > 0 && (
          <Paper sx={{ mb: 2, p: 2, bgcolor: '#eff6ff', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography color="primary" fontWeight={600}>{selectedSales.length} invoices selected</Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<FaTrash />}
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          </Paper>
        )
      }

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    indeterminate={selectedSales.length > 0 && selectedSales.length < sales.length}
                  />
                </TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Profit</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale._id} selected={selectedSales.includes(sale._id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedSales.includes(sale._id)}
                      onChange={() => handleSelectSale(sale._id)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    #{sale.invoiceNumber}
                    {sale.syncStatus === 'pending' && (
                      <Chip label="Pending" size="small" color="warning" sx={{ ml: 1, height: 20, fontSize: 10 }} />
                    )}
                  </TableCell>
                  <TableCell>{formatDate(sale.createdAt)}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell>{sale.items?.length} items</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{formatPKR(sale.total)}</TableCell>
                  <TableCell sx={{ color: '#10b981', fontWeight: 600 }}>{formatPKR(sale.totalProfit)}</TableCell>
                  <TableCell><Chip label={sale.paymentMethod} size="small" color="primary" /></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => viewSale(sale)}><FaEye /></IconButton>
                    <IconButton size="small" color="error" onClick={() => {
                      setSelectedSale(sale);
                      // We use a timeout to let state update or just open a separate confirm
                      // But since we use the modal for details, we can also put a delete button INSIDE the modal
                      // Or just trigger it here directly.
                      if (window.confirm(`Are you sure you want to delete Invoice #${sale.invoiceNumber}?`)) {
                        api.delete(`/sales/${sale._id}`).then(() => fetchSales()).catch(e => alert(e.response?.data?.message || e.message));
                      }
                    }}><FaTrash size={14} /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={detailModal} onClose={() => setDetailModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Invoice #{selectedSale?.invoiceNumber}</span>
          <Chip label={selectedSale?.paymentMethod} color="primary" size="small" />
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Typography color="text.secondary" mb={2}>{formatDate(selectedSale.createdAt)} | {selectedSale.customerName}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSale.items?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatPKR(item.sellPrice)}</TableCell>
                        <TableCell>{formatPKR(item.itemTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Subtotal:</Typography><Typography>{formatPKR(selectedSale.subtotal)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Discount:</Typography><Typography>{formatPKR(selectedSale.discount)}</Typography></Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}><Typography fontWeight={700}>Total:</Typography><Typography fontWeight={700} color="primary">{formatPKR(selectedSale.total)}</Typography></Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={handleDelete} startIcon={<FaTrash />}>Delete Invoice</Button>
          <Button onClick={() => setDetailModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default Sales;