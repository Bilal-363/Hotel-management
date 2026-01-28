import { useState, useEffect } from 'react';
import { Box, Grid, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { FaMoneyBillWave, FaShoppingCart, FaChartLine, FaExclamationTriangle, FaBoxes, FaReceipt } from 'react-icons/fa';
import api from '../services/api';

const StatCard = ({ icon, label, value, color }) => (
  <Paper sx={{ p: 3, borderLeft: `4px solid ${color}` }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{
        width: 50,
        height: 50,
        borderRadius: 2,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
        fontSize: 24
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Typography color="text.secondary" fontSize={13}>{label}</Typography>
      </Box>
    </Box>
  </Paper>
);

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, salesRes, stockRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-sales'),
        api.get('/dashboard/low-stock')
      ]);
      setStats(statsRes.data.stats || {});
      setRecentSales(salesRes.data.sales || []);
      setLowStock(stockRes.data.products || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPKR = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Dashboard</Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<FaMoneyBillWave />}
            label="Today's Sales"
            value={formatPKR(stats?.todaySales || 0)}
            color="#10b981"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<FaShoppingCart />}
            label="Total Products"
            value={stats?.totalProducts || 0}
            color="#3b82f6"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<FaChartLine />}
            label="Monthly Revenue"
            value={formatPKR(stats?.monthlyRevenue || 0)}
            color="#8b5cf6"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<FaReceipt />}
            label="Total Sales"
            value={stats?.totalSales || 0}
            color="#f59e0b"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<FaBoxes />}
            label="Low Stock Items"
            value={stats?.lowStockCount || 0}
            color="#ef4444"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            icon={<FaMoneyBillWave />}
            label="Pending Payments"
            value={formatPKR(stats?.pendingPayments || 0)}
            color="#ec4899"
          />
        </Grid>

        {/* Recent Sales */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              <FaReceipt style={{ marginRight: 8, color: '#3b82f6' }} /> Recent Sales
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Payment</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentSales.slice(0, 5).map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell>#{sale.invoiceNumber}</TableCell>
                      <TableCell>{sale.customerName}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#10b981' }}>
                        {formatPKR(sale.total)}
                      </TableCell>
                      <TableCell>
                        <Chip label={sale.paymentMethod} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Low Stock Alert */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              <FaExclamationTriangle style={{ marginRight: 8, color: '#ef4444' }} /> Low Stock Alert
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Stock</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowStock.slice(0, 5).map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        {item.name} {item.size && `(${item.size})`}
                      </TableCell>
                      <TableCell>
                        <Chip label={item.stock} size="small" color="error" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;