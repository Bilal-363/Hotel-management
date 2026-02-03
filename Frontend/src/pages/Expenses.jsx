import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip, Checkbox } from '@mui/material';
import { FaPlus, FaEdit, FaTrash, FaWallet, FaTags, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useReactToPrint } from 'react-to-print';
import { exportToCSV, exportToXLSX, pagePrintStyle } from '../utils/exportUtils';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ category: '', description: '', amount: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '', icon: '💰' });
  const tableRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
    pageStyle: pagePrintStyle
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!['admin', 'superadmin'].includes(user.role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" fontWeight={700}>Access Denied</Typography>
        <Typography color="text.secondary">Only Admins can manage Expenses.</Typography>
      </Box>
    );
  }

  // Select All State
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const icons = ['💰', '🏠', '💡', '👨‍💼', '🚗', '🔧', '📝', '🛒', '🎁', '☕', '🍪', '🧹', '📱', '💊', '🎓', '✈️', '🍔', '⛽', '🔌', '📺'];

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
      const cExp = localStorage.getItem('expenses_cache');
      const cCat = localStorage.getItem('expense_cats_cache');
      if (cExp) setExpenses(JSON.parse(cExp));
      if (cCat) setCategories(JSON.parse(cCat));
      
      if (cExp || cCat) {
        toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-exp' });
      } else {
        toast.error('Offline and no cache found');
      }
      setLoading(false);
      return;
    }
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/categories/expense')
      ]);
      setExpenses(expensesRes.data.expenses || []);
      setCategories(categoriesRes.data.categories || []);
      localStorage.setItem('expenses_cache', JSON.stringify(expensesRes.data.expenses || []));
      localStorage.setItem('expense_cats_cache', JSON.stringify(categoriesRes.data.categories || []));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Select All Handler
  const handleSelectAll = (e) => {
    setSelectAll(e.target.checked);
    if (e.target.checked) {
      setSelectedExpenses(expenses.map(exp => exp._id));
    } else {
      setSelectedExpenses([]);
    }
  };

  // Individual Select Handler
  const handleSelectExpense = (expenseId) => {
    if (selectedExpenses.includes(expenseId)) {
      setSelectedExpenses(selectedExpenses.filter(id => id !== expenseId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedExpenses, expenseId];
      setSelectedExpenses(newSelected);
      if (newSelected.length === expenses.length) {
        setSelectAll(true);
      }
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    if (selectedExpenses.length === 0) {
      toast.error('Please select expenses to delete');
      return;
    }

    if (window.confirm(`Delete ${selectedExpenses.length} selected expenses?`)) {
      try {
        await Promise.all(selectedExpenses.map(id => api.delete(`/expenses/${id}`)));
        toast.success(`${selectedExpenses.length} expenses deleted!`);
        setSelectedExpenses([]);
        setSelectAll(false);
        fetchData();
      } catch (err) {
        toast.error('Error deleting expenses');
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (expense = null) => {
    if (expense) {
      setEditId(expense._id);
      setFormData({ category: expense.category, description: expense.description, amount: expense.amount });
    } else {
      setEditId(null);
      setFormData({ category: categories[0]?.name || '', description: '', amount: '' });
    }
    setModal(true);
  };

  const openCategoryModal = () => {
    setCategoryFormData({ name: '', icon: '💰' });
    setCategoryModal(true);
  };

  const handleSubmit = async () => {
    if (!navigator.onLine) return toast.error('Cannot save while offline');
    try {
      if (editId) {
        await api.put(`/expenses/${editId}`, formData);
        toast.success('Expense updated!');
      } else {
        await api.post('/expenses', formData);
        toast.success('Expense added!');
      }
      fetchData();
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving expense');
    }
  };

  const handleCategorySubmit = async () => {
    if (!navigator.onLine) return toast.error('Cannot save while offline');
    try {
      await api.post('/categories', { ...categoryFormData, type: 'expense' });
      toast.success('Category created!');
      fetchData();
      setCategoryModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating category');
    }
  };

  const handleDelete = async (id) => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    if (window.confirm('Delete this expense?')) {
      try {
        await api.delete(`/expenses/${id}`);
        toast.success('Expense deleted!');
        fetchData();
      } catch (err) {
        toast.error('Error deleting expense');
      }
    }
  };

  const formatPKR = (amount) => `₨ ${(amount || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK', { dateStyle: 'medium' });
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  if (loading) return <Box p={4}>Loading...</Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}><FaWallet style={{ marginRight: 10 }} /> Expenses</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
            <Typography fontWeight={700} color="error">{formatPKR(totalExpenses)}</Typography>
          </Box>
          <Button variant="outlined" startIcon={<FaTags />} onClick={openCategoryModal}>Add Category</Button>
          <Button variant="contained" color="error" startIcon={<FaFilePdf />} onClick={handlePrint}>PDF</Button>
          <Button variant="contained" color="success" startIcon={<FaFileExcel />} onClick={() => {
             const columns = ['Date', 'Category', 'Description', 'Amount'];
             const rows = expenses.map(e => [
               new Date(e.createdAt).toLocaleDateString(),
               e.category,
               e.description,
               e.amount
             ]);
             exportToXLSX('expenses', columns, rows);
          }}>Excel</Button>
          <Button variant="contained" startIcon={<FaPlus />} onClick={() => openModal()}>Add Expense</Button>
        </Box>
      </Box>

      {/* Bulk Actions Toolbar */}
      {selectedExpenses.length > 0 && (
        <Paper sx={{ mb: 2, p: 2.5, bgcolor: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#1e40af', fontWeight: 600, fontSize: 16 }}>
              {selectedExpenses.length} expense{selectedExpenses.length > 1 ? 's' : ''} selected
            </Typography>
            <Button 
              variant="contained" 
              color="error" 
              size="large"
              startIcon={<FaTrash />}
              onClick={handleBulkDelete}
              sx={{ 
                px: 3, 
                py: 1.2,
                fontWeight: 600,
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 4
                }
              }}
            >
              Delete Selected
            </Button>
          </Box>
        </Paper>
      )}

      <Paper ref={tableRef}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    indeterminate={selectedExpenses.length > 0 && selectedExpenses.length < expenses.length}
                  />
                </TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow 
                  key={expense._id}
                  selected={selectedExpenses.includes(expense._id)}
                  sx={{ 
                    '&.Mui-selected': { 
                      bgcolor: '#f0f9ff !important' 
                    } 
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedExpenses.includes(expense._id)}
                      onChange={() => handleSelectExpense(expense._id)}
                    />
                  </TableCell>
                  <TableCell>{formatDate(expense.createdAt)}</TableCell>
                  <TableCell><Chip label={expense.category} size="small" /></TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#ef4444' }}>{formatPKR(expense.amount)}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openModal(expense)}><FaEdit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(expense._id)}><FaTrash /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Expense Modal */}
      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth select label="Category" name="category" value={formData.category} onChange={handleChange} required>
              {categories.map((cat) => <MenuItem key={cat._id} value={cat.name}>{cat.icon} {cat.name}</MenuItem>)}
            </TextField>
            <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} required multiline rows={2} />
            <TextField fullWidth label="Amount (₨)" name="amount" type="number" value={formData.amount} onChange={handleChange} required />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={categoryModal} onClose={() => setCategoryModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Expense Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Typography fontSize={14} mb={1}>Select Icon:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {icons.map((icon) => (
                <Box
                  key={icon}
                  onClick={() => setCategoryFormData({ ...categoryFormData, icon })}
                  sx={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: categoryFormData.icon === icon ? '#2563eb' : '#f1f5f9',
                    border: categoryFormData.icon === icon ? '2px solid #2563eb' : '2px solid transparent'
                  }}
                >
                  {icon}
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCategorySubmit}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
