import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Button, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import { FaUsers, FaTrash, FaBan, FaCheckCircle, FaChartLine, FaSignInAlt, FaPlus, FaRecycle, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { exportToXLSX, pagePrintStyle } from '../utils/exportUtils';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' });
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const tableRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
    pageStyle: pagePrintStyle
  });

  useEffect(() => {
    fetchUsers();
    const handleOnline = () => {
      toast.success('Back Online!');
      fetchUsers();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const fetchUsers = async () => {
    if (!navigator.onLine) {
        const cached = localStorage.getItem('users_cache');
        if (cached) {
            setUsers(JSON.parse(cached));
            toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-users' });
        }
        setLoading(false);
        return;
    }
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.users || []);
      localStorage.setItem('users_cache', JSON.stringify(res.data.users || []));
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      // Using delete endpoint with action query for deactivation as implemented in backend
      if (action === 'deactivate') {
        await api.delete(`/auth/users/${user._id}?action=deactivate`);
      } else {
        // For activation, we can use update if available, or re-implement logic. 
        // Assuming update endpoint exists or we use a specific flow. 
        // Since backend deleteUser only handles deactivate, we might need to use updateUser for activation.
        await api.put(`/auth/users/${user._id}`, { isActive: true });
      }
      toast.success(`User ${action}d`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleLoginAs = async (user) => {
    if (!window.confirm(`Login as ${user.name}? You will be logged out of your Super Admin account.`)) return;
    
    try {
      const res = await api.post(`/auth/users/${user._id}/login-as`);
      // Save Super Admin token to switch back later
      // Only save if we aren't already impersonating someone else (nested login prevention)
      if (!localStorage.getItem('superAdminToken')) {
        localStorage.setItem('superAdminToken', localStorage.getItem('token'));
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success(`Logged in as ${user.name}`);
      window.location.href = '/'; // Full reload to reset app state
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to login as user');
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/auth/users', formData);
      toast.success('User created successfully');
      setOpen(false);
      setFormData({ name: '', email: '', password: '', phone: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleResetData = async (user) => {
    if (!window.confirm(`DANGER: Are you sure you want to RESET ALL DATA for ${user.name}? This will delete all their products, sales, etc. This cannot be undone.`)) return;
    
    const loadingToast = toast.loading('Resetting user data...');
    try {
      await api.delete(`/auth/users/${user._id}/reset-data`);
      toast.success(`Data reset for ${user.name}. Reloading page...`, { id: loadingToast });
      // Clear all known local storage caches to force a full refresh
      Object.keys(localStorage).forEach(key => {
        if (key.includes('_cache') || key.startsWith('khata_detail_')) {
          localStorage.removeItem(key);
        }
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset data', { id: loadingToast });
    }
  };

  const filteredUsers = users.filter(user => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return user.isActive;
    if (statusFilter === 'inactive') return !user.isActive;
    return true;
  });

  if (loading) return <Box p={3}>Loading...</Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaUsers /> User Management
          </Typography>
          <TextField select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 120, bgcolor: 'white' }}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Box>
        <Box>
          <Button variant="contained" color="error" startIcon={<FaFilePdf />} onClick={handlePrint} sx={{ mr: 1 }}>PDF</Button>
          <Button variant="contained" color="success" startIcon={<FaFileExcel />} onClick={() => {
              const columns = ['Name', 'Email', 'Role', 'Phone', 'Status', 'Last Login', 'Joined'];
              const rows = filteredUsers.map(u => [u.name, u.email, u.role, u.phone, u.isActive ? 'Active' : 'Inactive', u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never', new Date(u.createdAt).toLocaleDateString()]);
              exportToXLSX('users_list', columns, rows);
          }} sx={{ mr: 1 }}>Excel</Button>
          <Button variant="contained" startIcon={<FaPlus />} onClick={() => setOpen(true)}>
            Add User
          </Button>
        </Box>
      </Box>

      <Paper ref={tableRef}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                {currentUser.role === 'superadmin' && <TableCell>Owner ID</TableCell>}
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell fontWeight={600}>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip label={user.role} color={user.role === 'superadmin' ? 'secondary' : user.role === 'admin' ? 'primary' : 'default'} size="small" />
                  </TableCell>
                  {currentUser.role === 'superadmin' && <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>{user.ownerId ? String(user.ownerId) : 'N/A'}</TableCell>}
                  <TableCell>
                    <Chip label={user.isActive ? 'Active' : 'Inactive'} color={user.isActive ? 'success' : 'error'} size="small" />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: '#64748b' }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    {user._id !== currentUser.id && (
                      <>
                        {currentUser.role === 'superadmin' && (
                          <>
                            <Tooltip title="Login as User">
                              <IconButton size="small" color="primary" onClick={() => handleLoginAs(user)}>
                                <FaSignInAlt />
                              </IconButton>
                            </Tooltip>
                            {user.role === 'admin' && (
                              <Tooltip title="Reset User Data">
                                <IconButton size="small" color="secondary" onClick={() => handleResetData(user)}><FaRecycle /></IconButton>
                              </Tooltip>
                            )}
                          </>
                        )}
                        <Tooltip title={user.isActive ? "Deactivate" : "Activate"}>
                          <IconButton size="small" color={user.isActive ? "warning" : "success"} onClick={() => handleToggleStatus(user)}>
                            {user.isActive ? <FaBan /> : <FaCheckCircle />}
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" color="error" onClick={() => handleDelete(user._id)}><FaTrash /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <TextField label="Email" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label="Password" type="password" fullWidth value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            <TextField label="Phone" fullWidth value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            {currentUser.role === 'superadmin' && (
              <TextField select label="Role" fullWidth value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;