import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Button, TextField, IconButton, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress } from '@mui/material';
import { FaPlus, FaEdit, FaTrash, FaCog, FaTags, FaRuler, FaWallet, FaRecycle, FaUndo, FaDownload, FaUpload, FaGoogleDrive, FaCloudDownloadAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Settings = () => {
  const [tab, setTab] = useState(1);
  const [productCategories, setProductCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [modal, setModal] = useState({ open: false, type: '', data: null });
  const [formData, setFormData] = useState({ name: '', icon: '📦', type: 'product' });
  const [sizeForm, setSizeForm] = useState({ name: '' });
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fileInputRef = useRef(null);

  // Backup/Restore states
  const [lastBackup, setLastBackup] = useState(localStorage.getItem('lastBackupTime'));
  const [driveRestoreModal, setDriveRestoreModal] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');

  if (!['admin', 'superadmin'].includes(user.role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" fontWeight={700}>Access Denied</Typography>
        <Typography color="text.secondary">Only Admins can access Settings.</Typography>
      </Box>
    );
  }

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
       const cProd = localStorage.getItem('settings_prod_cats');
       const cExp = localStorage.getItem('settings_exp_cats');
       if (cProd) setProductCategories(JSON.parse(cProd));
       if (cExp) setExpenseCategories(JSON.parse(cExp));
       
       const savedSizes = JSON.parse(localStorage.getItem('customSizes') || '[]');
       setSizes(savedSizes);
       
       if (cProd || cExp) toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-settings' });
       setLoading(false);
       return;
    }

    try {
      const [prodCatRes, expCatRes] = await Promise.all([
        api.get('/categories/product'),
        api.get('/categories/expense')
      ]);
      setProductCategories(prodCatRes.data.categories || []);
      setExpenseCategories(expCatRes.data.categories || []);
      
      localStorage.setItem('settings_prod_cats', JSON.stringify(prodCatRes.data.categories || []));
      localStorage.setItem('settings_exp_cats', JSON.stringify(expCatRes.data.categories || []));
      
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

  // --- Backup & Restore Functions ---
  const handleBackup = async () => {
    try {
      setShowProgress(true);
      setProgressLabel('Downloading Backup...');
      setProgress(0);
      const res = await api.get('/auth/backup', {
        onDownloadProgress: (progressEvent) => {
          const total = progressEvent.total || progressEvent.loaded;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setProgress(percent);
        }
      });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.setAttribute('download', `backup-${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackup(now);
      toast.success('Backup downloaded successfully');
    } catch (err) {
      toast.error('Failed to download backup');
    } finally {
      setShowProgress(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current.click();
  };

  const handleFileRestore = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        if (!window.confirm('⚠️ WARNING: This will DELETE all current data and replace it with the backup. Are you sure?')) return;

        setShowProgress(true);
        setProgressLabel('Restoring Data...');
        setProgress(0);

        await api.post('/backup/restore', backupData, {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        });
        
        toast.success('Data restored successfully! Reloading...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        toast.error('Failed to restore backup. Invalid file.');
      } finally {
        setShowProgress(false);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const handleDriveBackup = async () => {
    setShowProgress(true);
    setProgressLabel('Uploading to Google Drive...');
    setProgress(0); // Indeterminate
    try {
      await api.post('/backup/drive');
      toast.success('Backup uploaded to Google Drive!');
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackup(now);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setShowProgress(false);
    }
  };

  const fetchDriveBackups = async () => {
    setShowProgress(true);
    setProgressLabel('Fetching Drive backups...');
    setProgress(0);
    try {
      const res = await api.get('/backup/drive/list');
      setDriveFiles(res.data.files || []);
      setDriveRestoreModal(true);
    } catch (err) {
      toast.error('Failed to fetch backups');
    } finally {
      setShowProgress(false);
    }
  };

  const handleDriveRestore = async (fileId) => {
    if (!window.confirm('⚠️ WARNING: This will DELETE all current data and replace it with the backup from Drive. Are you sure?')) return;
    setShowProgress(true);
    setProgressLabel('Restoring from Drive...');
    setProgress(0); // Indeterminate
    try {
      await api.post(`/backup/drive/restore/${fileId}`);
      toast.success('Restored successfully! Reloading...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error('Restore failed');
    } finally {
      setShowProgress(false);
    }
  };

  const handleFixOwnership = async () => {
    const loadingToast = toast.loading('Fixing data ownership...');
    try {
      const res = await api.post('/auth/fix-data-ownership');
      toast.dismiss(loadingToast);
      alert(res.data.message);
      Object.keys(localStorage).forEach(key => {
        if (key.includes('_cache') || key.startsWith('khata_detail_')) localStorage.removeItem(key);
      });
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fix ownership', { id: loadingToast });
    }
  };

  const handleEmergencyRecover = async () => {
    if (!window.confirm('Attempt emergency data recovery? This will scan for deleted items and force-assign all found data to Ali Hamza.')) return;
    const loadingToast = toast.loading('Attempting recovery...');
    try {
      const res = await api.post('/auth/emergency-recover');
      toast.dismiss(loadingToast);
      alert(res.data.message);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recovery failed', { id: loadingToast });
    }
  };

  const handleResetAllAccounts = async () => {
    if (!window.confirm('DANGER ZONE: This will delete ALL data for EVERY user (including Super Admin) except the protected account (alihamza.baba73@gmail.com). This action is irreversible. Are you absolutely sure?')) return;
    if (!window.confirm('SECOND CONFIRMATION: Please confirm again that you want to reset all other accounts. This cannot be undone.')) return;

    const loadingToast = toast.loading('Resetting all accounts...');
    try {
      await api.post('/auth/reset-all-other-accounts');
      toast.success('All other accounts have been reset. Reloading...', { id: loadingToast });
      Object.keys(localStorage).forEach(key => {
        if (key.includes('_cache') || key.startsWith('khata_detail_')) localStorage.removeItem(key);
      });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset accounts', { id: loadingToast });
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
        <Tabs value={tab} onChange={(e, v) => setTab(v)} scrollButtons="auto" variant="scrollable">
          <Tab label="General" icon={<FaCog />} iconPosition="start" />
          <Tab label="Product Categories" icon={<FaTags />} iconPosition="start" />
          <Tab label="Expense Categories" icon={<FaWallet />} iconPosition="start" />
          <Tab label="Sizes" icon={<FaRuler />} iconPosition="start" />
          <Tab label="Backup & Restore" icon={<FaRecycle />} iconPosition="start" />
        </Tabs>
      </Paper>

      {tab === 1 && (
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

      {tab === 2 && (
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

      {tab === 3 && (
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

      {tab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Backup & Restore</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Last Backup: {lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button fullWidth variant="contained" startIcon={<FaDownload />} onClick={handleBackup}>Download Backup</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileRestore} accept=".json" />
              <Button fullWidth variant="outlined" startIcon={<FaUpload />} onClick={handleRestoreClick}>Restore from File</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button fullWidth variant="contained" color="secondary" startIcon={<FaGoogleDrive />} onClick={handleDriveBackup}>Backup to Drive</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button fullWidth variant="outlined" color="secondary" startIcon={<FaCloudDownloadAlt />} onClick={fetchDriveBackups}>Restore from Drive</Button>
            </Grid>
          </Grid>

          {user.role === 'superadmin' && (
            <Box mt={4} p={3} border="2px solid" borderColor="error.main" borderRadius={2}>
              <Typography variant="h6" fontWeight={600} mb={2} color="error.main">Danger Zone</Typography>
              <Typography variant="body2" mb={2}>
                This will permanently delete all data for every admin account (including Super Admin) except for `alihamza.baba73@gmail.com`. This action is irreversible.
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={handleResetAllAccounts}
              >
                Reset All Other Accounts (Fresh Start)
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Drive Restore Modal */}
      <Dialog open={driveRestoreModal} onClose={() => setDriveRestoreModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Restore from Google Drive</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {driveFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{file.name}</TableCell>
                    <TableCell>{new Date(file.createdTime).toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Button variant="contained" size="small" onClick={() => handleDriveRestore(file.id)}>Restore</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDriveRestoreModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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

      {/* Progress Dialog */}
      <Dialog open={showProgress} disableEscapeKeyDown>
        <DialogTitle>{progressLabel}</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress variant={progress > 0 ? "determinate" : "indeterminate"} value={progress} />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{progress > 0 ? `${Math.round(progress)}%` : ''}</Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Settings;