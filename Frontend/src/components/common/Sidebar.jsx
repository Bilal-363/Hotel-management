import { NavLink, useNavigate } from 'react-router-dom';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, Button } from '@mui/material';
import { FaHome, FaCashRegister, FaBoxes, FaReceipt, FaWallet, FaChartBar, FaCog, FaSignOutAlt, FaStore, FaBook, FaCalendar, FaTruck, FaShoppingCart, FaUsers, FaUserSecret } from 'react-icons/fa';
import toast from 'react-hot-toast';

const menuItems = [
  { path: '/', name: 'Dashboard', icon: <FaHome /> },
  { path: '/pos', name: 'POS', icon: <FaCashRegister /> },
  { path: '/products', name: 'Products', icon: <FaBoxes /> },
  { path: '/sales', name: 'Sales', icon: <FaReceipt /> },
  { path: '/expenses', name: 'Expenses', icon: <FaWallet /> },
  { path: '/reports', name: 'Reports', icon: <FaChartBar /> },
  { path: '/khata', name: 'Khata', icon: <FaBook /> },
  { path: '/daily-log', name: 'Daily Log', icon: <FaCalendar /> },
  { path: '/suppliers', name: 'Suppliers', icon: <FaTruck /> },
  { path: '/purchases', name: 'Purchases', icon: <FaShoppingCart /> },
  { path: '/users', name: 'Users', icon: <FaUsers />, roles: ['superadmin'] },
  { path: '/settings', name: 'Settings', icon: <FaCog /> },
];

const Sidebar = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const superAdminToken = localStorage.getItem('superAdminToken');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('superAdminToken');
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  const handleSwitchBack = () => {
    if (superAdminToken) {
      localStorage.setItem('token', superAdminToken);
      localStorage.removeItem('superAdminToken');
      
      // Clear the impersonated user data so the app fetches the real superadmin user on reload
      localStorage.removeItem('user');
      
      // We need to fetch the superadmin user details again or store them. 
      // For simplicity, let's just reload which will fetch 'me' or redirect.
      window.location.href = '/';
    } else {
      handleLogout();
    }
  };

  return (
    <Box sx={{ width: collapsed ? 80 : 260, bgcolor: '#1e293b', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 45, height: 45, borderRadius: 2, bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FaStore size={24} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography fontWeight={700} fontSize={16}>Haji Waris Ali</Typography>
            <Typography fontSize={11} sx={{ opacity: 0.7 }}>Hotel & General Store</Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ flex: 1, px: 2, py: 2 }}>
        {menuItems.filter(item => !item.roles || item.roles.includes(user.role)).map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <NavLink to={item.path} style={{ textDecoration: 'none', width: '100%' }}>
              {({ isActive }) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 2, px: collapsed ? 1.5 : 2, py: 1.5, borderRadius: 2, bgcolor: isActive ? '#2563eb' : 'transparent', color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', transition: 'all 0.2s', '&:hover': { bgcolor: isActive ? '#2563eb' : 'rgba(255,255,255,0.1)' } }}>
                  <ListItemIcon sx={{ minWidth: 'auto', color: 'inherit' }}>{item.icon}</ListItemIcon>
                  {!collapsed && <ListItemText primary={item.name} primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }} />}
                </Box>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>

      <Box sx={{ p: 2 }}>
        {superAdminToken && (
          <Button fullWidth variant="contained" color="warning" startIcon={<FaUserSecret />} onClick={handleSwitchBack} sx={{ mb: 1, py: 1.2 }}>
            {collapsed ? '' : 'Back to Super Admin'}
          </Button>
        )}
        <Button fullWidth variant="contained" color="error" startIcon={<FaSignOutAlt />} onClick={handleLogout} sx={{ py: 1.2 }}>
          {collapsed ? '' : 'Logout'}
        </Button>
      </Box>
    </Box>
  );
};

export default Sidebar;
