import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import { FaPlus, FaEdit, FaTrash, FaTruck, FaMoneyBillWave, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [editId, setEditId] = useState(null);
  
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    fetchSuppliers();
    const handleOnline = () => {
      toast.success('Back Online!');
      fetchSuppliers();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const fetchSuppliers = async () => {
    if (!navigator.onLine) {
      loadFromCache();
      return;
    }
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.suppliers || []);
      localStorage.setItem('suppliers_cache', JSON.stringify(res.data.suppliers || []));
    } catch (err) {
      loadFromCache();
    }
  };

  const loadFromCache = () => {
    const cached = localStorage.getItem('suppliers_cache');
    if (cached) {
      setSuppliers(JSON.parse(cached));
      toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-sup' });
    } else {
      toast.error('Failed to load suppliers');
    }
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await api.put(`/suppliers/${editId}`, formData);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier added');
      }
      setModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Supplier deleted');
      fetchSuppliers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const openModal = (s = null) => {
    if (s) {
      setEditId(s._id);
      setFormData({ name: s.name, phone: s.phone, address: s.address });
    } else {
      setEditId(null);
      setFormData({ name: '', phone: '', address: '' });
    }
    setModal(true);
  };

  const openPayModal = (s) => {
    setEditId(s._id); // Use editId to store selected supplier ID temporarily
    setPayAmount('');
    setPayModal(true);
  };

  const handlePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return toast.error('Enter valid amount');
    try {
      await api.post(`/suppliers/${editId}/payment`, { amount: payAmount });
      toast.success('Payment recorded');
      setPayModal(false);
      fetchSuppliers();
    } catch (err) {
      toast.error('Payment failed');
    }
  };

  const handleWhatsApp = (s) => {
    if (!s.phone) return toast.error('No phone number found');
    let cleanPhone = s.phone.replace(/\D/g, ''); // Remove non-digits

    // Format for Pakistan (03xx -> 923xx) if applicable
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }

    const status = s.balance > 0 ? 'Payable' : 'Receivable';
    const message = `Hello ${s.name}, your current balance with Haji Waris Ali Hotel is ${formatPKR(s.balance)} (${status}).`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FaTruck /> Suppliers
        </Typography>
        <Button variant="contained" startIcon={<FaPlus />} onClick={() => openModal()}>Add Supplier</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Balance (Payable)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s._id}>
                  <TableCell fontWeight={600}>{s.name}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  <TableCell>{s.address}</TableCell>
                  <TableCell sx={{ color: s.balance > 0 ? 'error.main' : 'success.main', fontWeight: 700 }}>
                    {formatPKR(s.balance)}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Share on WhatsApp">
                      <IconButton size="small" color="success" onClick={() => handleWhatsApp(s)}><FaWhatsapp /></IconButton>
                    </Tooltip>
                    <Tooltip title="Record Payment">
                      <IconButton size="small" color="success" onClick={() => openPayModal(s)}><FaMoneyBillWave /></IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => openModal(s)}><FaEdit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(s._id)}><FaTrash /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">No suppliers found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <TextField label="Phone" fullWidth value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <TextField label="Address" fullWidth value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={payModal} onClose={() => setPayModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Payment to Supplier</DialogTitle>
        <DialogContent>
          <TextField label="Amount" type="number" fullWidth sx={{ mt: 2 }} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayModal(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handlePayment}>Confirm Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Suppliers;