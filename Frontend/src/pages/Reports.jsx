import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { FaChartBar, FaRupeeSign, FaChartLine, FaWallet, FaCalculator } from 'react-icons/fa';
import api from '../services/api';

const StatCard = ({ icon, label, value, color }) => (
  <Paper sx={{ p: 3, borderLeft: `4px solid ${color}` }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 2, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: 24 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Typography color="text.secondary" fontSize={13}>{label}</Typography>
      </Box>
    </Box>
  </Paper>
);

const Reports = () => {
  const [report, setReport] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user.role !== 'admin') {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" fontWeight={700}>Access Denied</Typography>
        <Typography color="text.secondary">Only Admins can view Reports.</Typography>
      </Box>
    );
  }

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [salesRes, expenseRes, productsRes] = await Promise.all([
        api.get(`/dashboard/sales-report${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
        api.get(`/expenses/summary`),
        api.get('/products')
      ]);
      setReport({
        ...salesRes.data.report,
        totalExpenses: expenseRes.data.totalExpenses || 0
      });
      setProducts(productsRes.data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;
  const netProfit = (report.totalProfit || 0) - (report.totalExpenses || 0);

  // Margins
  const grossMargin = report.totalSales ? ((report.totalProfit / report.totalSales) * 100).toFixed(1) : 0;
  const netMargin = report.totalSales ? ((netProfit / report.totalSales) * 100).toFixed(1) : 0;

  // Calculate totals from the products list directly for reliability
  const totalStockCost = products.reduce((sum, p) => sum + ((Number(p.buyPrice) || 0) * (Number(p.stock) || 0)), 0);
  const totalStockRevenue = products.reduce((sum, p) => sum + ((Number(p.sellPrice) || 0) * (Number(p.stock) || 0)), 0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}><FaChartBar style={{ marginRight: 10 }} /> Reports</Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label="Start Date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <TextField type="date" size="small" label="End Date" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button variant="contained" onClick={fetchReport}>Generate Report</Button>
        </Box>
      </Paper>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4} md={3}>
          <StatCard icon={<FaRupeeSign />} label="Total Revenue" value={formatPKR(report.totalSales)} color="#2563eb" />
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <StatCard icon={<FaChartLine />} label="Gross Profit" value={formatPKR(report.totalProfit)} color="#10b981" />
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <StatCard icon={<FaCalculator />} label="Net Profit" value={formatPKR(netProfit)} color={netProfit >= 0 ? '#10b981' : '#ef4444'} />
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <StatCard icon={<FaWallet />} label="Total Expenses" value={formatPKR(report.totalExpenses)} color="#ef4444" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Financial Analysis</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography>Total Cost of Goods</Typography>
                <Typography fontWeight={700}>{formatPKR(report.totalCost)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography>Total Discounts Given</Typography>
                <Typography fontWeight={700} color="error.main">{formatPKR(report.totalDiscount)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <Typography fontWeight={600}>Gross Margin</Typography>
                <Typography fontWeight={700} color="success.main">{grossMargin}%</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                <Typography fontWeight={600}>Net Profit Margin</Typography>
                <Typography fontWeight={700} color="primary.main">{netMargin}%</Typography>
              </Box>
            </Box>
          </Paper>


        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>Payment Methods</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {report.paymentSummary?.map((pm) => (
                <Paper variant="outlined" key={pm._id} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, borderLeft: '4px solid #3b82f6' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography fontWeight={600} variant="h6">{pm._id}</Typography>
                    <Typography fontSize={13} color="text.secondary">{pm.count} orders</Typography>
                  </Box>

                  {pm._id === 'Khata' ? (
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box>
                        <Typography fontSize={12} color="text.secondary">Total Sales</Typography>
                        <Typography fontWeight={700}>{formatPKR(pm.total)}</Typography>
                      </Box>
                      <Box>
                        <Typography fontSize={12} color="success.main">Received</Typography>
                        <Typography fontWeight={700} color="success.main">{formatPKR(pm.paid || 0)}</Typography>
                      </Box>
                      <Box>
                        <Typography fontSize={12} color="error.main">Total Market Credit</Typography>
                        <Typography fontWeight={700} color="error.main">{formatPKR(report.totalKhataOutstanding || 0)}</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Typography fontWeight={700} fontSize={18} color="primary.main">{formatPKR(pm.total)}</Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Stock Value Details (All Products)</Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Paper variant="outlined" sx={{ p: 2, minWidth: 200, bgcolor: '#fff7ed', borderColor: '#ffedd5', borderLeft: '4px solid #f97316' }}>
              <Typography color="text.secondary" fontWeight={600} mb={1}>Total Cost</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.dark">{formatPKR(totalStockCost)}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, minWidth: 200, bgcolor: '#ecfccb', borderColor: '#d9f99d', borderLeft: '4px solid #65a30d' }}>
              <Typography color="text.secondary" fontWeight={600} mb={1}>Total Revenue</Typography>
              <Typography variant="h5" fontWeight={700} color="success.dark">{formatPKR(totalStockRevenue)}</Typography>
            </Paper>
          </Box>
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>Sold (Today)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'warning.main' }}>Sold (Week)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Sold (Month)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'secondary.main' }}>Sold (Year)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Total Cost Value</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Total Sell Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const performance = report.productPerformance?.find(p => String(p._id) === String(product._id)) || { day: 0, week: 0, month: 0, year: 0 };
                return (
                  <TableRow key={product._id} hover>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <span style={{ color: product.stock <= product.minStock ? 'red' : 'inherit', fontWeight: product.stock <= product.minStock ? 'bold' : 'normal' }}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{performance.day || 0}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'warning.main' }}>{performance.week || 0}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{performance.month}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }}>{performance.year}</TableCell>
                    <TableCell sx={{ color: 'warning.dark', fontWeight: 500 }}>{formatPKR(product.stock * product.buyPrice)}</TableCell>
                    <TableCell sx={{ color: 'success.dark', fontWeight: 600 }}>{formatPKR(product.stock * product.sellPrice)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Reports;