import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Avatar, Menu, MenuItem, Divider } from '@mui/material';
import { FaBell, FaUserCircle, FaUser, FaCog, FaSignOutAlt, FaBars } from 'react-icons/fa';
import { useState } from 'react';
import toast from 'react-hot-toast';

const Navbar = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    toast.success('Logged out successfully!');
    navigate('/login');
    handleClose();
  };

  return (
    <Box sx={{ height: 65, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onToggleSidebar}>
          <FaBars />
        </IconButton>
        <Typography variant="h6" fontWeight={600} color="text.primary">
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton>
          <FaBell size={18} />
        </IconButton>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={handleMenu}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#2563eb' }}>
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography fontSize={14} fontWeight={600}>{user.name || 'Admin'}</Typography>
            <Typography fontSize={11} color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user.role || 'admin'}</Typography>
          </Box>
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
          <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
            <FaUser style={{ marginRight: 10 }} /> My Profile
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); handleClose(); }}>
            <FaCog style={{ marginRight: 10 }} /> Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <FaSignOutAlt style={{ marginRight: 10 }} /> Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default Navbar;
