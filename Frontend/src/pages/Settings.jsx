import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, TextField, IconButton, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { FaPlus, FaEdit, FaTrash, FaCog, FaTags, FaRuler, FaWallet } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Settings = () => {
  const [tab, setTab] = useState(0);
  const [productCategories, setProductCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [modal, setModal] = useState({ open: false, type: '', data: null });
  const [formData, setFormData] = useState({ name: '', icon: '📦', type: 'product' });
  const [sizeForm, setSizeForm] = useState({ name: '' });
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user.role !== 'admin') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" fontWeight={700}>Access Denied</Typography>
        <Typography color="text.secondary">Only Admins can access Settings.</Typography>
      </Box>
    );
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodCatRes, expCatRes] = await Promise.all([
        api.get('/categories/product'),
        api.get('/categories/expense')
      ]);
      setProductCategories(prodCatRes.data.categories || []);
      setExpenseCategories(expCatRes.data.categories || []);
      
      const savedSizes = JSON.parse(localStorage.getItem('customSizes') || '[]');
      if (savedSizes.length === 0) {
        const defaultSizes = ['50ml', '200ml', '250ml', '300ml', '500ml', '750ml', '1L', '1.5L', '2L', '2.25L', 'Small', 'Medium', 'Large', 'Pack', 'Box'];
        localStorage.setItem('customSizes', JSON.stringify(defaultSizes));
        setSizes(defaultSizes);
      } else {
        setSizes(savedSizes);
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, data = null) => {
    if (type === 'size') {
      setSizeForm({ name: data || '' });
      setModal({ open: true, type, data });
    } else {
      setFormData({
        name: data?.name || '',
        icon: data?.icon || '📦',
        type: type === 'product' ? 'product' : 'expense'
      });
      setModal({ open: true, type, data });
    }
  };

  const closeModal = () => {
    setModal({ open: false, type: '', data: null });
    setFormData({ name: '', icon: '📦', type: 'product' });
    setSizeForm({ name: '' });
  };

  const handleCategorySubmit = async () => {
    try {
      if (modal.data) {
        await api.put(`/categories/${modal.data._id}`, formData);
        toast.success('Category updated!');
      } else {
        await api.post('/categories', formData);
        toast.success('Category created!');
      }
      fetchData();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Delete this category?')) {
      try {
        await api.delete(`/categories/${id}`);
        toast.success('Category deleted!');
        fetchData();
      } catch (err) {
        toast.error('Error deleting category');
      }
    }
  };

  const handleSizeSubmit = () => {
    if (!sizeForm.name.trim()) return;
    
    let updatedSizes;
    if (modal.data) {
      updatedSizes = sizes.map(s => s === modal.data ? sizeForm.name : s);
      toast.success('Size updated!');
    } else {
      if (sizes.includes(sizeForm.name)) {
        toast.error('Size already exists!');
        return;
      }
      updatedSizes = [...sizes, sizeForm.name];
      toast.success('Size added!');
    }
    
    setSizes(updatedSizes);
    localStorage.setItem('customSizes', JSON.stringify(updatedSizes));
    closeModal();
  };

  const handleDeleteSize = (size) => {
    if (window.confirm('Delete this size?')) {
      const updatedSizes = sizes.filter(s => s !== size);
      setSizes(updatedSizes);
      localStorage.setItem('customSizes', JSON.stringify(updatedSizes));
      toast.success('Size deleted!');
    }
  };

  const icons = ['📦', '🍾', '🚬', '🧃', '🍞', '💧', '🍿', '🍫', '🥛', '🧹', '🏠', '💡', '👨‍💼', '🚗', '🔧', '📝', '🛒', '🎁', '☕', '🍪'];

  if (loading) return <Box p={4}>Loading...</Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaCog /> Settings
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Product Categories" icon={<FaTags />} iconPosition="start" />
          <Tab label="Expense Categories" icon={<FaWallet />} iconPosition="start" />
          <Tab label="Sizes" icon={<FaRuler />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>Product Categories</Typography>
            <Button variant="contained" startIcon={<FaPlus />} onClick={() => openModal('product')}>Add Category</Button>
          </Box>
          <Grid container spacing={2}>
            {productCategories.map((cat) => (
              <Grid item xs={12} sm={6} md={4} key={cat._id}>
                <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontSize={24}>{cat.icon}</Typography>
                    <Typography fontWeight={600}>{cat.name}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openModal('product', cat)}><FaEdit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat._id)}><FaTrash /></IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>Expense Categories</Typography>
            <Button variant="contained" startIcon={<FaPlus />} onClick={() => openModal('expense')}>Add Category</Button>
          </Box>
          <Grid container spacing={2}>
            {expenseCategories.map((cat) => (
              <Grid item xs={12} sm={6} md={4} key={cat._id}>
                <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontSize={24}>{cat.icon}</Typography>
                    <Typography fontWeight={600}>{cat.name}</Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={() => openModal('expense', cat)}><FaEdit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteCategory(cat._id)}><FaTrash /></IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>Product Sizes</Typography>
            <Button variant="contained" startIcon={<FaPlus />} onClick={() => openModal('size')}>Add Size</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {sizes.map((size) => (
              <Chip
                key={size}
                label={size}
                onDelete={() => handleDeleteSize(size)}
                onClick={() => openModal('size', size)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Paper>
      )}

      <Dialog open={modal.open && modal.type !== 'size'} onClose={closeModal} maxWidth="xs" fullWidth>
        <DialogTitle>{modal.data ? 'Edit' : 'Add'} {modal.type === 'product' ? 'Product' : 'Expense'} Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Typography fontSize={14} mb={1}>Select Icon:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {icons.map((icon) => (
                <Box
                  key={icon}
                  onClick={() => setFormData({ ...formData, icon })}
                  sx={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: formData.icon === icon ? '#2563eb' : '#f1f5f9',
                    border: formData.icon === icon ? '2px solid #2563eb' : '2px solid transparent'
                  }}
                >
                  {icon}
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal}>Cancel</Button>
          <Button variant="contained" onClick={handleCategorySubmit}>{modal.data ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modal.open && modal.type === 'size'} onClose={closeModal} maxWidth="xs" fullWidth>
        <DialogTitle>{modal.data ? 'Edit' : 'Add'} Size</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Size Name"
              value={sizeForm.name}
              onChange={(e) => setSizeForm({ name: e.target.value })}
              placeholder="e.g., 500ml, Large, Pack of 6"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal}>Cancel</Button>
          <Button variant="contained" onClick={handleSizeSubmit}>{modal.data ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;