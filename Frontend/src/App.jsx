import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import Sidebar from '@/components/common/Sidebar';
import Navbar from '@/components/common/Navbar';

import Dashboard from '@/pages/Dashboard';
import POS from '@/pages/POS';
import Products from '@/pages/Products';
import Sales from '@/pages/Sales';
import Expenses from '@/pages/Expenses';
import Reports from '@/pages/Reports';
import KhataCustomers from '@/pages/KhataCustomers';
import KhataList from '@/pages/KhataList';
import KhataDetail from '@/pages/KhataDetail';
import DailyLog from '@/pages/DailyLog';
import Settings from '@/pages/Settings';
import Suppliers from '@/pages/Suppliers';
import Purchases from '@/pages/Purchases';
import Profile from '@/pages/Profile';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const tokenExpiry = localStorage.getItem('tokenExpiry');
  if (tokenExpiry && new Date().getTime() > parseInt(tokenExpiry)) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    return <Navigate to="/login" replace />;
  }

  return children;
};

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar onToggleSidebar={() => setCollapsed(v => !v)} />
        <Box sx={{ flex: 1, p: 3, bgcolor: '#f8fafc', overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

// Component to update page title based on route
const PageTitleUpdater = () => {
  const location = useLocation();

  React.useEffect(() => {
    const path = location.pathname;
    const baseTitle = 'Haji Waris Ali Hotel';

    const routeTitles = {
      '/': 'Dashboard',
      '/pos': 'POS',
      '/products': 'Products',
      '/sales': 'Sales History',
      '/expenses': 'Expenses',
      '/reports': 'Reports',
      '/khata': 'Khata Customers',
      '/khatas': 'Khata Management',
      '/daily-log': 'Daily Log',
      '/suppliers': 'Suppliers',
      '/purchases': 'Purchases',
      '/settings': 'Settings',
      '/profile': 'Profile',
      '/login': 'Login',
      '/signup': 'Signup'
    };

    let title = routeTitles[path];

    // Handle dynamic routes
    if (!title) {
      if (path.startsWith('/khata/')) title = 'Khata Details';
    }

    document.title = title ? `${title} - ${baseTitle}` : baseTitle;
  }, [location]);

  return null;
};

function App() {
  return (
    <>
      <PageTitleUpdater />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/" element={
          <PrivateRoute>
            <Layout><Dashboard /></Layout>
          </PrivateRoute>
        } />

        <Route path="/pos" element={
          <PrivateRoute>
            <Layout><POS /></Layout>
          </PrivateRoute>
        } />

        <Route path="/products" element={
          <PrivateRoute>
            <Layout><Products /></Layout>
          </PrivateRoute>
        } />

        <Route path="/sales" element={
          <PrivateRoute>
            <Layout><Sales /></Layout>
          </PrivateRoute>
        } />

        <Route path="/expenses" element={
          <PrivateRoute>
            <Layout><Expenses /></Layout>
          </PrivateRoute>
        } />

        <Route path="/reports" element={
          <PrivateRoute>
            <Layout><Reports /></Layout>
          </PrivateRoute>
        } />

        <Route path="/khata" element={
          <PrivateRoute>
            <Layout><KhataCustomers /></Layout>
          </PrivateRoute>
        } />
        <Route path="/khatas" element={
          <PrivateRoute>
            <Layout><KhataList /></Layout>
          </PrivateRoute>
        } />
        <Route path="/khata/:id" element={
          <PrivateRoute>
            <Layout><KhataDetail /></Layout>
          </PrivateRoute>
        } />

        <Route path="/daily-log" element={
          <PrivateRoute>
            <Layout><DailyLog /></Layout>
          </PrivateRoute>
        } />

        <Route path="/suppliers" element={
          <PrivateRoute>
            <Layout><Suppliers /></Layout>
          </PrivateRoute>
        } />

        <Route path="/purchases" element={
          <PrivateRoute>
            <Layout><Purchases /></Layout>
          </PrivateRoute>
        } />

        <Route path="/settings" element={
          <PrivateRoute>
            <Layout><Settings /></Layout>
          </PrivateRoute>
        } />

        <Route path="/profile" element={
          <PrivateRoute>
            <Layout><Profile /></Layout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
