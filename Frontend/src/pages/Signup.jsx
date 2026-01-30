import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { FaStore, FaUser, FaEnvelope, FaLock, FaPhone } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'staff',
    secretCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match!');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password too short!');
      setLoading(false);
      return;
    }

    const finalRole = formData.secretCode === 'HWH-ADMIN-2025' ? 'admin' : 'staff';

    try {
      await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: finalRole
      });
      
      toast.success('Account created successfully! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      toast.error(err.response?.data?.message || 'Registration failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', py: 4 }}>
      <Paper sx={{ p: 4, maxWidth: 450, width: '100%', borderRadius: 4, mx: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <FaStore size={26} color="#fff" />
          </Box>
          <Typography variant="h5" fontWeight={700}>Create Account</Typography>
          <Typography color="text.secondary" fontSize={14}>Haji Waris Ali Hotel - POS System</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Full Name" name="name" value={formData.name} onChange={handleChange} required sx={{ mb: 2 }} InputProps={{ startAdornment: <FaUser style={{ marginRight: 10, color: '#64748b' }} /> }} />
          <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required sx={{ mb: 2 }} InputProps={{ startAdornment: <FaEnvelope style={{ marginRight: 10, color: '#64748b' }} /> }} />
          <TextField fullWidth label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} sx={{ mb: 2 }} InputProps={{ startAdornment: <FaPhone style={{ marginRight: 10, color: '#64748b' }} /> }} />
          <TextField fullWidth label="Secret Code (For Admin)" name="secretCode" type="password" value={formData.secretCode} onChange={handleChange} sx={{ mb: 2 }} InputProps={{ startAdornment: <FaLock style={{ marginRight: 10, color: '#64748b' }} /> }} />
          <TextField fullWidth label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required sx={{ mb: 2 }} InputProps={{ startAdornment: <FaLock style={{ marginRight: 10, color: '#64748b' }} /> }} />
          <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required sx={{ mb: 3 }} InputProps={{ startAdornment: <FaLock style={{ marginRight: 10, color: '#64748b' }} /> }} />

          <Button type="submit" variant="contained" fullWidth size="large" disabled={loading} sx={{ py: 1.5, fontSize: 16, mb: 2 }}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>

          <Typography textAlign="center" fontSize={14} color="text.secondary">
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              Login here
            </Link>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
};

export default Signup;