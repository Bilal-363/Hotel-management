import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Checkbox } from '@mui/material';
import { FaReceipt, FaEye, FaCalendar, FaTrash, FaWhatsapp, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetDatabase } from '../db';
import { useReactToPrint } from 'react-to-print';
import { exportToCSV, exportToXLSX, pagePrintStyle } from '../utils/exportUtils';

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
  const tableRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
    pageStyle: pagePrintStyle
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

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

  // SESSION CHECK
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

  const fetchSales = async () => {
    try {
      // 1. PUSH: Send pending offline sales to server first
      if (navigator.onLine) {
        const pendingSales = await db.sales.where('syncStatus').equals('pending').toArray();
        for (const sale of pendingSales) {
          try {
            const { id, syncStatus, invoiceNumber, items, ...rest } = sale;
            const apiItems = items.map(i => ({ productId: i.productId || i._id, quantity: i.quantity, price: i.price }));
            
            const res = await api.post('/sales', { ...rest, items: apiItems });
            
            await db.sales.update(id, { 
              syncStatus: 'synced',
              invoiceNumber: res.data.sale.invoiceNumber,
              _id: res.data.sale._id
            });
          } catch (err) { console.error("Sync failed for sale", sale.invoiceNumber); }
        }
      }

      // 2. PULL: Fetch latest data from server
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

  const handleWhatsApp = (sale) => {
    const itemsList = sale.items.map(i => `${i.productName} x${Number(i.quantity).toFixed(3).replace(/\.?0+$/, '')} - ${formatPKR(i.itemTotal || (i.sellPrice * i.quantity))}`).join('%0A');
    const message = `*Haji Waris Ali Hotel*%0AInvoice: ${sale.invoiceNumber}%0ADate: ${new Date(sale.createdAt).toLocaleDateString()}%0A%0A*Items:*%0A${itemsList}%0A%0A*Total: ${formatPKR(sale.total)}*%0A%0AThank you for shopping!`;
    
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);



  const handleDelete = async () => {
    if (!selectedSale) return;
    if (!window.confirm(`Delete Invoice #${selectedSale.invoiceNumber}?`)) {
      return;
    }

    try {
      // If it has a server ID, delete from server
      if (selectedSale._id) {
        await api.delete(`/sales/${selectedSale._id}`);
      }
      
      // Remove from local DB
      // We use the local 'id' which is always present
      if (selectedSale.id) {
        await db.sales.delete(selectedSale.id);
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
      setSelectedSales(sales.map(s => s.id)); // Use Local ID
    } else {
      setSelectedSales([]);
    }
  };

  const handleSelectSale = (localId) => {
    if (selectedSales.includes(localId)) {
      setSelectedSales(selectedSales.filter(id => id !== localId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedSales, localId];
      setSelectedSales(newSelected);
      if (newSelected.length === sales.length) {
        setSelectAll(true);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSales.length === 0) return;

    if (window.confirm(`Delete ${selectedSales.length} selected invoices?`)) {
      try {
        // Filter sales to find which ones need API calls
        const salesToDelete = sales.filter(s => selectedSales.includes(s.id));
        
        const apiDeletes = salesToDelete
          .filter(s => s._id) // Only those with server ID
          .map(s => api.delete(`/sales/${s._id}`));
          
        await Promise.all(apiDeletes);
        
        // Delete all from local DB
        await db.sales.bulkDelete(selectedSales);
        
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
          <Button variant="contained" color="error" startIcon={<FaFilePdf />} onClick={handlePrint}>PDF</Button>
          <Button variant="contained" color="success" startIcon={<FaFileExcel />} onClick={() => {
             const columns = ['Invoice', 'Date', 'Customer', 'Items', 'Total', 'Payment Method'];
             const rows = sales.map(s => [
               s.invoiceNumber,
               new Date(s.createdAt).toLocaleDateString(),
               s.customerName,
               s.items.map(i => `${i.productName} (${i.quantity})`).join(', '),
               s.total,
               s.paymentMethod
             ]);
             exportToXLSX('sales_history', columns, rows);
          }}>Excel</Button>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 3 }}>
            <Box><Typography variant="body2" color="text.secondary">Total Sales</Typography><Typography fontWeight={700} color="primary">{formatPKR(totalSales)}</Typography></Box>
            {isAdmin && <Box><Typography variant="body2" color="text.secondary">Total Profit</Typography><Typography fontWeight={700} color="success.main">{formatPKR(totalProfit)}</Typography></Box>}
          </Box>
        </Box>
      </Paper>



      {/* Bulk Actions Toolbar */}
      {
        isAdmin && selectedSales.length > 0 && (
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

      <Paper ref={tableRef}>
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
                {isAdmin && <TableCell>Profit</TableCell>}
                <TableCell>Payment</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} selected={selectedSales.includes(sale.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedSales.includes(sale.id)}
                      onChange={() => handleSelectSale(sale.id)}
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
                  {isAdmin && <TableCell sx={{ color: '#10b981', fontWeight: 600 }}>{formatPKR(sale.totalProfit)}</TableCell>}
                  <TableCell><Chip label={sale.paymentMethod} size="small" color="primary" /></TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => viewSale(sale)}><FaEye /></IconButton>
                    <IconButton size="small" color="success" onClick={() => handleWhatsApp(sale)}><FaWhatsapp /></IconButton>
                    {isAdmin && <IconButton size="small" color="error" onClick={() => {
                      setSelectedSale(sale);
                      // We use a timeout to let state update or just open a separate confirm
                      // But since we use the modal for details, we can also put a delete button INSIDE the modal
                      // Or just trigger it here directly.
                      if (window.confirm(`Delete Invoice #${sale.invoiceNumber}?`)) {
                         const promise = sale._id ? api.delete(`/sales/${sale._id}`) : Promise.resolve();
                         promise.then(async () => {
                           await db.sales.delete(sale.id);
                           fetchSales();
                           toast.success('Deleted');
                         }).catch(e => toast.error('Failed to delete'));
                      }
                    }}><FaTrash size={14} /></IconButton>}
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
          {isAdmin && <Button color="error" onClick={handleDelete} startIcon={<FaTrash />}>Delete Invoice</Button>}
          <Button variant="outlined" color="success" startIcon={<FaWhatsapp />} onClick={() => handleWhatsApp(selectedSale)}>WhatsApp</Button>
          <Button onClick={() => setDetailModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
};

export default Sales;