import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { FaChartBar, FaRupeeSign, FaChartLine, FaWallet, FaCalculator, FaChartArea } from 'react-icons/fa';
import api from '../services/api';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import toast from 'react-hot-toast';

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

  if (!['admin', 'superadmin'].includes(user.role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" fontWeight={700}>Access Denied</Typography>
        <Typography color="text.secondary">Only Admins can view Reports.</Typography>
      </Box>
    );
  }

  // Live Query: Fetch all sales from local DB for accurate reporting
  const allSales = useLiveQuery(() => db.sales.toArray()) || [];

  // Calculate Product Performance Locally (Fixes "Sold" counts issue)
  const productPerformance = useMemo(() => {
    const stats = {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay()); // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    allSales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      
      sale.items.forEach(item => {
        // Handle different ID fields (server vs local)
        const pId = item.product || item.productId || item._id;
        if (!pId) return;

        if (!stats[pId]) stats[pId] = { day: 0, week: 0, month: 0, year: 0 };
        
        // Ensure quantity is treated as a number (handles fractions)
        const qty = Number(item.quantity) || 0;

        if (saleDate >= todayStart) stats[pId].day += qty;
        if (saleDate >= weekStart) stats[pId].week += qty;
        if (saleDate >= monthStart) stats[pId].month += qty;
        if (saleDate >= yearStart) stats[pId].year += qty;
      });
    });
    return stats;
  }, [allSales]);

  const fetchReport = async () => {
    setLoading(true);
    
    if (!navigator.onLine) {
      const cachedReport = localStorage.getItem('reports_data_cache');
      const cachedProducts = localStorage.getItem('reports_products_cache');
      
      if (cachedReport) setReport(JSON.parse(cachedReport));
      if (cachedProducts) setProducts(JSON.parse(cachedProducts));
      
      if (cachedReport) {
        toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-reports' });
      } else {
        toast.error('Offline and no report cached');
      }
      setLoading(false);
      return;
    }

    try {
      const [salesRes, expenseRes, productsRes] = await Promise.all([
        api.get(`/dashboard/sales-report${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
        api.get(`/expenses/summary`),
        api.get('/products')
      ]);
      const newReport = {
        ...salesRes.data.report,
        totalExpenses: expenseRes.data.totalExpenses || 0
      };
      setReport(newReport);
      setProducts(productsRes.data.products || []);

      // Only cache if it's the default view (no dates)
      if (!startDate && !endDate) {
        localStorage.setItem('reports_data_cache', JSON.stringify(newReport));
        localStorage.setItem('reports_products_cache', JSON.stringify(productsRes.data.products || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    const handleOnline = () => {
      toast.success('Back Online!');
      fetchReport();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;
  const netProfit = (report.totalProfit || 0) - (report.totalExpenses || 0);

  // Margins
  const grossMargin = report.totalSales ? ((report.totalProfit / report.totalSales) * 100).toFixed(1) : 0;
  const netMargin = report.totalSales ? ((netProfit / report.totalSales) * 100).toFixed(1) : 0;

  // Calculate totals from the products list directly for reliability
  const totalStockCost = products.reduce((sum, p) => sum + ((Number(p.buyPrice) || 0) * (Number(p.stock) || 0)), 0);
  const totalStockRevenue = products.reduce((sum, p) => sum + ((Number(p.sellPrice) || 0) * (Number(p.stock) || 0)), 0);

  // Simple SVG Line Chart Component
  const SimpleLineChart = ({ data }) => {
    if (!data || data.length === 0) return <Typography color="text.secondary" align="center" py={4}>No data for graph</Typography>;

    const height = 200;
    const width = 600; // Viewbox width
    const padding = 20;
    
    const maxVal = Math.max(...data.map(d => Math.max(d.sales, d.profit, d.expense)), 100);
    const minVal = 0;
    
    const getX = (index) => padding + (index * (width - 2 * padding)) / (data.length - 1 || 1);
    const getY = (val) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);

    const makePath = (key, color) => {
      const points = data.map((d, i) => `${getX(i)},${getY(d[key] || 0)}`).join(' ');
      return <polyline points={points} fill="none" stroke={color} strokeWidth="2" />;
    };

    return (
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '600px' }}>
          {/* Grid Lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e2e8f0" />
          
          {/* Paths */}
          {makePath('sales', '#3b82f6')}
          {makePath('profit', '#10b981')}
          {makePath('expense', '#ef4444')}

          {/* Points & Tooltips (Simplified) */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getY(d.sales)} r="3" fill="#3b82f6" />
              <text x={getX(i)} y={height - 5} fontSize="10" textAnchor="middle" fill="#64748b">{new Date(d.date).getDate()}</text>
            </g>
          ))}
        </svg>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#3b82f6', borderRadius: '50%' }} />
            <Typography variant="caption">Sales</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#10b981', borderRadius: '50%' }} />
            <Typography variant="caption">Profit</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: '#ef4444', borderRadius: '50%' }} />
            <Typography variant="caption">Expense</Typography>
          </Box>
        </Box>
      </Box>
    );
  };

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

      {/* Graph Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FaChartArea /> Profit & Loss Trend
        </Typography>
        <SimpleLineChart data={report.graphData} />
      </Paper>

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
                // Use local calculation instead of backend report
                const performance = productPerformance[product._id] || { day: 0, week: 0, month: 0, year: 0 };
                return (
                  <TableRow key={product._id} hover>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <span style={{ color: product.stock <= product.minStock ? 'red' : 'inherit', fontWeight: product.stock <= product.minStock ? 'bold' : 'normal' }}>
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{Number(performance.day || 0).toFixed(3).replace(/\.?0+$/, '')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'warning.main' }}>{Number(performance.week || 0).toFixed(3).replace(/\.?0+$/, '')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{Number(performance.month || 0).toFixed(3).replace(/\.?0+$/, '')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'secondary.main' }}>{Number(performance.year || 0).toFixed(3).replace(/\.?0+$/, '')}</TableCell>
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