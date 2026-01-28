import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, TextField, Grid, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { FaUser, FaEnvelope, FaPhone, FaUserTag, FaCalendar, FaEdit, FaLock, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Profile = () => {
  const [user, setUser] = useState({});
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setFormData({ name: res.data.user.name, phone: res.data.user.phone || '' });
    } catch (err) {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(storedUser);
      setFormData({ name: storedUser.name || '', phone: storedUser.phone || '' });
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const res = await api.put(`/auth/users/${user._id || user.id}`, formData);
      const updatedUser = { ...user, ...formData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters!');
      return;
    }
    
    setLoading(true);
    try {
      await api.put(`/auth/users/${user._id || user.id}`, { password: passwordData.newPassword });
      toast.success('Password changed successfully!');
      setPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PK', { dateStyle: 'long' });
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaUser /> My Profile
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Avatar sx={{ width: 120, height: 120, margin: '0 auto 20px', bgcolor: '#2563eb', fontSize: 48 }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Typography variant="h5" fontWeight={700}>{user.name}</Typography>
            <Typography color="text.secondary" sx={{ textTransform: 'capitalize', mb: 2 }}>{user.role}</Typography>
            <Divider sx={{ my: 2 }} />
            <Button variant="outlined" fullWidth startIcon={<FaLock />} onClick={() => setPasswordModal(true)}>
              Change Password
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Profile Details</Typography>
              {!editing ? (
                <Button variant="contained" startIcon={<FaEdit />} onClick={() => setEditing(true)}>Edit Profile</Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button variant="contained" startIcon={<FaSave />} onClick={handleUpdate} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ width: 45, height: 45, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <FaUser />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize={12} color="text.secondary">Full Name</Typography>
                    {editing ? (
                      <TextField size="small" fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    ) : (
                      <Typography fontWeight={600}>{user.name}</Typography>
                    )}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ width: 45, height: 45, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <FaEnvelope />
                  </Box>
                  <Box>
                    <Typography fontSize={12} color="text.secondary">Email Address</Typography>
                    <Typography fontWeight={600}>{user.email}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ width: 45, height: 45, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <FaPhone />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize={12} color="text.secondary">Phone Number</Typography>
                    {editing ? (
                      <TextField size="small" fullWidth value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    ) : (
                      <Typography fontWeight={600}>{user.phone || 'Not provided'}</Typography>
                    )}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Box sx={{ width: 45, height: 45, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <FaUserTag />
                  </Box>
                  <Box>
                    <Typography fontSize={12} color="text.secondary">Role</Typography>
                    <Typography fontWeight={600} sx={{ textTransform: 'capitalize' }}>{user.role}</Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 45, height: 45, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                    <FaCalendar />
                  </Box>
                  <Box>
                    <Typography fontSize={12} color="text.secondary">Member Since</Typography>
                    <Typography fontWeight={600}>{formatDate(user.createdAt)}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={passwordModal} onClose={() => setPasswordModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePasswordChange} disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;