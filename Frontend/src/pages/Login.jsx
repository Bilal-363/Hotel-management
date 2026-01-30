import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, Alert, Slider } from '@mui/material';
import { FaStore, FaLock, FaEnvelope, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [sessionHours, setSessionHours] = useState(24);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const expiryTime = new Date().getTime() + (sessionHours * 60 * 60 * 1000);
      localStorage.setItem('tokenExpiry', expiryTime.toString());

      toast.success(`Welcome back, ${res.data.user.name}!`);
      if (res.data.user.role === 'admin') {
        navigate('/');
      } else {
        navigate('/pos');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      toast.error('Login failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
      <Paper sx={{ p: 5, maxWidth: 420, width: '100%', borderRadius: 4, mx: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FaStore size={30} color="#fff" />
          </Box>
          <Typography variant="h5" fontWeight={700}>Haji Waris Ali Hotel</Typography>
          <Typography color="text.secondary" fontSize={14}>POS System Login</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <FaEnvelope style={{ marginRight: 10, color: '#64748b' }} /> }}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
            InputProps={{ startAdornment: <FaLock style={{ marginRight: 10, color: '#64748b' }} /> }}
          />

          <Box sx={{ mb: 3, px: 1 }}>
            <Typography fontSize={14} color="text.secondary" mb={1} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FaClock /> Session Duration: {sessionHours} hours
            </Typography>
            <Slider
              value={sessionHours}
              onChange={(e, v) => setSessionHours(v)}
              min={1}
              max={72}
              marks={[
                { value: 1, label: '1h' },
                { value: 24, label: '24h' },
                { value: 48, label: '48h' },
                { value: 72, label: '72h' }
              ]}
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontSize: 16, mb: 2 }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>

          <Typography textAlign="center" fontSize={14} color="text.secondary">
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
              Sign up here
            </Link>
          </Typography>
        </form>


      </Paper>
    </Box>
  );
};

export default Login;