import { useEffect, useMemo, useState, useRef } from 'react';
import { Box, Paper, Typography, Button, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton, Tooltip, InputAdornment, Checkbox } from '@mui/material';
import { FaUsers, FaPlus, FaBook, FaHistory, FaEdit, FaTrash, FaList, FaFilePdf, FaSearch, FaFileExcel, FaFileCsv, FaArrowLeft, FaEye, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getCustomers, createCustomer, createKhata, getCustomerHistory, updateCustomer, deleteCustomer, addInstallments, payInstallment, getKhata } from '../services/khataService';
import { useReactToPrint } from 'react-to-print';
import { exportToCSV, exportToXLSX, pagePrintStyle } from '../utils/exportUtils';
import { useNavigate } from 'react-router-dom';

const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;
const formatDate = (date) => new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });

const KhataCustomers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState({ khatas: [], transactions: [] });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '' });
  const [current, setCurrent] = useState(null);
  const tableRef = useRef(null);

  const [createKhataOpen, setCreateKhataOpen] = useState(false);
  const [khataForm, setKhataForm] = useState({ title: '', totalAmount: '' });

  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
    pageStyle: pagePrintStyle
  });

  useEffect(() => {
    load();
    const handleOnline = () => {
      toast.success('Back Online!');
      load();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const load = async () => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('customers_cache');
      if (cached) {
        setCustomers(JSON.parse(cached));
        toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-cust' });
      } else {
        toast.error('Offline and no cache found');
      }
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getCustomers();
      const list = (res.customers || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(list);
      localStorage.setItem('customers_cache', JSON.stringify(list));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load customers');
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return customers.filter(c => {
      const matchesSearch = (c.name || '').toLowerCase().includes(term) || (c.phone || '').includes(term);
      return matchesSearch;
    });
  }, [customers, search]);

  const handleCreate = async () => {
    if (!navigator.onLine) return toast.error('Cannot create while offline');
    try {
      if (!form.name) { toast.error('Name required'); return; }

      // 1. Create Customer
      const res = await createCustomer({ name: form.name, phone: form.phone, address: form.address });
      const newCustomer = res.customer;

      // 2. Create Khata (if details provided)
      if (form.totalAmount) {
        const title = form.itemName || `${newCustomer.name}'s Khata`;
        const total = Number(form.totalAmount);
        const paid = Number(form.paidAmount || 0);

        const khataRes = await createKhata({
          customerId: newCustomer._id,
          title: title,
          totalAmount: total
        });

        // 3. Handle Advance Payment (if any)
        if (paid > 0) {
          // Add installment for the paid amount (due today)
          await addInstallments(khataRes.khata._id, [{
            amount: paid,
            dueDate: new Date().toISOString().split('T')[0],
            note: 'Advance Payment'
          }]);

          // Fetch updated khata to get the installment ID
          const updatedKhataRes = await getKhata(khataRes.khata._id);
          const installment = updatedKhataRes.khata.installments.find(i => i.amount === paid && i.status !== 'paid');

          if (installment) {
            await payInstallment(installment._id, { amount: paid, note: 'Advance Payment' });
          }
        }
        toast.success('Customer and Khata created');
      } else {
        toast.success('Customer created');
      }

      setCreateOpen(false);
      setForm({ name: '', phone: '', address: '', itemName: '', totalAmount: '', paidAmount: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Create failed');
    }
  };

  const quickKhata = async (cust) => {
    setCurrent(cust);
    setKhataForm({ title: `Khata - ${cust.name}`, totalAmount: '' });
    setCreateKhataOpen(true);
  };

  const handleCreateKhata = async () => {
    if (!navigator.onLine) return toast.error('Cannot create while offline');
    try {
      const totalAmount = Number(khataForm.totalAmount || '0');
      if (!khataForm.title || !totalAmount || totalAmount <= 0) {
        toast.error('Enter title and amount');
        return;
      }
      await createKhata({ customerId: current._id, title: khataForm.title, totalAmount });
      toast.success('Khata created');
      setCreateKhataOpen(false);
      setCurrent(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create khata');
    }
  };

  const openEdit = (cust) => {
    setCurrent(cust);
    setEditForm({ name: cust.name || '', phone: cust.phone || '', address: cust.address || '' });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!navigator.onLine) return toast.error('Cannot edit while offline');
    try {
      if (!current?._id) return;
      await updateCustomer(current._id, editForm);
      toast.success('Customer updated');
      setEditOpen(false);
      setCurrent(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const confirmDelete = (cust) => {
    setCustomerToDelete(cust);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    try {
      if (!customerToDelete) return;
      await deleteCustomer(customerToDelete._id);
      toast.success('Customer deleted');
      setDeleteOpen(false);
      setCustomerToDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const openHistory = async (cust) => {
    try {
      const res = await getCustomerHistory(cust._id);
      setHistoryData({ khatas: res.khatas || [], transactions: res.transactions || [] });
      setHistoryOpen(true);
    } catch (err) {
      toast.error('Failed to fetch history');
    }
  };

  const handleViewDetails = async (cust) => {
    try {
      const res = await getCustomerHistory(cust._id);
      const khatas = res.khatas || [];
      if (khatas.length === 1) {
        navigate(`/khata/${khatas[0]._id}`);
      } else if (khatas.length > 1) {
        navigate(`/khatas?q=${cust.phone}`);
      } else {
        toast.error('No khata found for this customer');
      }
    } catch (err) {
      toast.error('Failed to fetch details');
    }
  };

  const handleWhatsApp = (c) => {
    if (!c.phone) return toast.error('No phone number found');
    let cleanPhone = c.phone.replace(/\D/g, '');

    // Format for Pakistan (03xx -> 923xx) if applicable
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }

    const balance = c.khataBalance || 0;
    
    const message = `Hello ${c.name}, your current Khata balance with Haji Waris Ali Hotel is ${formatPKR(balance)}.`;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Bulk Selection Logic
  const [selected, setSelected] = useState([]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = filtered.map((n) => n._id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    if (!window.confirm(`Are you sure you want to delete ${selected.length} customers?`)) return;

    try {
      await Promise.all(selected.map(id => deleteCustomer(id)));
      toast.success(`${selected.length} customers deleted`);
      setSelected([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete some customers');
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8fafc', color: '#1e293b' }}>
      <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/')} sx={{ color: '#1e293b', bgcolor: '#e2e8f0', '&:hover': { bgcolor: '#cbd5e1' } }}>
              <FaArrowLeft />
            </IconButton>
            <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#1e293b' }}>
              <FaUsers /> Customer Management
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<FaPlus />} onClick={() => setCreateOpen(true)} sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            New Customer
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters & Actions */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', color: '#1e293b', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <TextField
              size="small"
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><FaSearch color="#64748b" /></InputAdornment>
              }}
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              {selected.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<FaTrash />}
                  onClick={handleBulkDelete}
                  sx={{ animation: 'fadeIn 0.2s' }}
                >
                  Delete ({selected.length})
                </Button>
              )}
              <Button variant="outlined" startIcon={<FaList />} onClick={() => navigate('/khatas')} sx={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                All Khatas
              </Button>
              <Button variant="contained" sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }} startIcon={<FaFilePdf />} onClick={handlePrint}>
                PDF
              </Button>
              <Button variant="contained" sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }} startIcon={<FaFileExcel />} onClick={() => {
                const columns = ['Name', 'Phone', 'Address'];
                const rows = filtered.map(c => [c.name, c.phone, c.address]);
                exportToXLSX('customers', columns, rows);
              }}>Excel</Button>
            </Box>
          </Box>
        </Paper>

        {/* Table */}
        <Paper sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} ref={tableRef}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < filtered.length}
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>NAME</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>PHONE</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>ADDRESS</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600, textAlign: 'right' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#64748b', py: 3 }}>Loading customers...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: '#64748b', py: 3 }}>
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(c => {
                    const isSelected = selected.indexOf(c._id) !== -1;
                    return (
                      <TableRow
                        key={c._id}
                        hover
                        sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }}
                        selected={isSelected}
                        onClick={(event) => handleSelect(event, c._id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected} />
                        </TableCell>
                        <TableCell sx={{ color: '#1e293b', fontWeight: 500 }}>{c.name}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{c.phone}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{c.address}</TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Share Khata">
                            <IconButton size="small" onClick={() => handleWhatsApp(c)} sx={{ color: '#25D366', mr: 1 }}>
                              <FaWhatsapp />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Create Khata">
                            <IconButton size="small" onClick={() => quickKhata(c)} sx={{ color: '#3b82f6', mr: 1 }}>
                              <FaBook />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View History">
                            <IconButton size="small" onClick={() => openHistory(c)} sx={{ color: '#a855f7', mr: 1 }}>
                              <FaHistory />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewDetails(c)} sx={{ color: '#0ea5e9', mr: 1 }}>
                              <FaEye />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: '#fbbf24', mr: 1 }}>
                              <FaEdit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => confirmDelete(c)} sx={{ color: '#ef4444' }}>
                              <FaTrash />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Dialogs */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete customer <b>{customerToDelete?.name}</b>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>New Customer</DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" color="#3b82f6" sx={{ mt: 1, mb: 1, fontWeight: 600 }}>Personal Details</Typography>
            <TextField label="Name" fullWidth size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Phone" fullWidth size="small" sx={{ mt: 2 }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Address" fullWidth size="small" sx={{ mt: 2 }} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

            <Typography variant="subtitle2" color="#3b82f6" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>Initial Khata (Optional)</Typography>
            <TextField label="Item Name / Title" fullWidth size="small" value={form.itemName || ''} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="e.g. Mobile Phone" />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField label="Total Amount" type="number" fullWidth size="small" value={form.totalAmount || ''} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
              <TextField label="Paid (Advance)" type="number" fullWidth size="small" value={form.paidAmount || ''} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
            </Box>
            {form.totalAmount && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1, textAlign: 'right' }}>
                <Typography variant="caption" color="#64748b">Remaining Balance</Typography>
                <Typography variant="h6" fontWeight={600} color="#ef4444">
                  {formatPKR((Number(form.totalAmount) || 0) - (Number(form.paidAmount) || 0))}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button variant="contained" onClick={handleCreate}>Create</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>Customer History</DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={700} mt={1} mb={1}>Khatas</Typography>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#64748b' }}>TITLE</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>TOTAL</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>REMAINING</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.khatas.map(k => (
                    <TableRow key={k._id}>
                      <TableCell sx={{ color: '#1e293b' }}>{k.title}</TableCell>
                      <TableCell sx={{ color: '#1e293b' }}>{formatPKR(k.totalAmount)}</TableCell>
                      <TableCell sx={{ color: k.remainingAmount > 0 ? '#ef4444' : '#22c55e' }}>{formatPKR(k.remainingAmount)}</TableCell>
                      <TableCell>
                        <Chip label={k.status} size="small" sx={{ bgcolor: k.status === 'open' ? '#eff6ff' : '#f0fdf4', color: k.status === 'open' ? '#3b82f6' : '#22c55e' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" fontWeight={700} mb={1}>Transactions</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#64748b' }}>DATE</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>TYPE</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>AMOUNT</TableCell>
                    <TableCell sx={{ color: '#64748b' }}>NOTE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyData.transactions.map(tx => (
                    <TableRow key={tx._id}>
                      <TableCell sx={{ color: '#1e293b' }}>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell sx={{ color: '#1e293b' }}>{tx.type}</TableCell>
                      <TableCell sx={{ color: '#1e293b' }}>{formatPKR(tx.amount)}</TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{tx.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHistoryOpen(false)} sx={{ color: '#1e293b' }}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={createKhataOpen} onClose={() => setCreateKhataOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>Create Khata</DialogTitle>
          <DialogContent>
            <TextField label="Title" fullWidth sx={{ mt: 2 }} value={khataForm.title} onChange={(e) => setKhataForm({ ...khataForm, title: e.target.value })} />
            <TextField label="Total Amount" type="number" fullWidth sx={{ mt: 2 }} value={khataForm.totalAmount} onChange={(e) => setKhataForm({ ...khataForm, totalAmount: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateKhataOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button variant="contained" onClick={handleCreateKhata}>Create</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogContent>
            <TextField label="Name" fullWidth sx={{ mt: 2 }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <TextField label="Phone" fullWidth sx={{ mt: 2 }} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <TextField label="Address" fullWidth sx={{ mt: 2 }} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button variant="contained" onClick={handleEdit}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default KhataCustomers;