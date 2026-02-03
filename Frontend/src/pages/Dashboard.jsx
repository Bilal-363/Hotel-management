import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button } from '@mui/material';
import { FaMoneyBillWave, FaShoppingCart, FaChartLine, FaExclamationTriangle, FaBoxes, FaReceipt, FaTruck, FaCloudSun, FaHourglassHalf, FaSun, FaCloudRain, FaSnowflake, FaBolt, FaSmog, FaCloud, FaFire } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentSales, setRecentSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productCategories, setProductCategories] = useState([]);
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!['admin', 'superadmin'].includes(user.role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" fontWeight={700}>Access Denied</Typography>
        <Typography color="text.secondary">Only Admins can view the Dashboard.</Typography>
      </Box>
    );
  }

  useEffect(() => {
    fetchData();
    
    // Fetch Weather (Feature 2)
    const fetchWeather = async (lat, long, name = null) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current_weather=true`);
        const data = await res.json();
        setWeather(data.current_weather);
        
        if (name) {
          setLocationName(name);
        } else {
          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${long}&localityLanguage=en`);
            const geoData = await geoRes.json();
            setLocationName(geoData.city || geoData.locality || 'Current Location');
          } catch {
            setLocationName('Current Location');
          }
        }
      } catch (e) {
        console.error("Weather fetch failed", e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
        () => fetchWeather(30.8833, 73.6000, 'Renala Khurd') // Default: Renala Khurd if denied
      );
    } else {
      fetchWeather(30.8833, 73.6000, 'Renala Khurd'); // Default if no geo API
    }

    const handleOnline = () => {
      toast.success('Back Online!');
      fetchData();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const fetchData = async () => {
    if (!navigator.onLine) {
      const cachedStats = localStorage.getItem('dashboard_stats_cache');
      const cachedSales = localStorage.getItem('dashboard_sales_cache');
      const cachedStock = localStorage.getItem('dashboard_stock_cache');
      
      if (cachedStats) setStats(JSON.parse(cachedStats));
      if (cachedSales) setRecentSales(JSON.parse(cachedSales));
      if (cachedStock) setLowStock(JSON.parse(cachedStock));
      
      if (cachedStats || cachedSales || cachedStock) {
        toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-dash' });
      }
      setLoading(false);
      return;
    }
    try {
      const [statsRes, salesRes, stockRes, catsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-sales'),
        api.get('/dashboard/low-stock'),
        api.get('/categories/product')
      ]);
      setStats(statsRes.data.stats || {});
      setRecentSales(salesRes.data.sales || []);
      setLowStock(stockRes.data.products || []);
      setProductCategories(catsRes.data.categories || []);

      localStorage.setItem('dashboard_stats_cache', JSON.stringify(statsRes.data.stats || {}));
      localStorage.setItem('dashboard_sales_cache', JSON.stringify(salesRes.data.sales || []));
      localStorage.setItem('dashboard_stock_cache', JSON.stringify(stockRes.data.products || []));
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

  const getWeatherAdvice = (code) => {
    if (!code && code !== 0) return "Check forecast to plan stock.";
    
    const findRelevantCategory = (keywords) => {
      if (!productCategories || productCategories.length === 0) return null;
      const match = productCategories.find(c => 
        keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase()))
      );
      return match ? match.name : null;
    };

    // WMO Weather Codes
    if (code <= 3) {
      const cat = findRelevantCategory(['Cold', 'Juice', 'Beverage', 'Drink', 'Ice Cream', 'Shake', 'Smoothie', 'Water']);
      return cat ? `☀️ Sunny day! ${cat} sales will likely increase.` : "☀️ Sunny day! Great weather for cold refreshments.";
    }
    if (code >= 51 && code <= 67) {
      const cat = findRelevantCategory(['Tea', 'Chai', 'Coffee', 'Soup', 'Snack', 'Pakora', 'Samosa', 'Fries']);
      return cat ? `🌧️ Rainy! People will crave ${cat}.` : "🌧️ Rainy! Stock up on Tea & Snacks.";
    }
    if (code >= 71 && code <= 77) {
      const cat = findRelevantCategory(['Soup', 'Coffee', 'Tea', 'Hot', 'Chai']);
      return cat ? `❄️ Snowy! ${cat} will keep customers warm.` : "❄️ Snowy! Hot soups and warm food are winners.";
    }
    if (code >= 95) return "⛈️ Stormy! Expect delivery delays, check stock.";
    return "☁️ Cloudy. Good day for comfort food.";
  };

  const getWeatherGradient = (temp) => {
    if (temp >= 30) return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; // Hot (Red)
    if (temp >= 20) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // Warm (Orange)
    return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; // Cold (Blue)
  };

  const getWeatherIcon = (code) => {
    if (code === undefined || code === null) return <FaCloudSun size={40} />;
    if (code === 0) return <FaSun size={40} />; // Clear sky
    if (code <= 3) return <FaCloudSun size={40} />; // Partly cloudy
    if (code >= 45 && code <= 48) return <FaSmog size={40} />; // Fog
    if (code >= 51 && code <= 67) return <FaCloudRain size={40} />; // Drizzle/Rain
    if (code >= 71 && code <= 77) return <FaSnowflake size={40} />; // Snow
    if (code >= 80 && code <= 82) return <FaCloudRain size={40} />; // Showers
    if (code >= 85 && code <= 86) return <FaSnowflake size={40} />; // Snow showers
    if (code >= 95) return <FaBolt size={40} />; // Thunderstorm
    return <FaCloud size={40} />;
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" startIcon={<FaTruck />} onClick={() => navigate('/suppliers')} sx={{ bgcolor: '#475569' }}>
            Suppliers
          </Button>
          <Button variant="contained" startIcon={<FaShoppingCart />} onClick={() => navigate('/purchases')} sx={{ bgcolor: '#475569' }}>
            Purchases
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Weather Widget (Feature 2) */}
        {weather && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, background: getWeatherGradient(weather.temperature), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getWeatherIcon(weather.weathercode)}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ opacity: 0.9, lineHeight: 1.2 }}>
                    {locationName}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {weather.temperature}°C
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Wind: {weather.windspeed} km/h
                  </Typography>
                </Box>
              </Box>
              <Typography fontWeight={600} sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 1, borderRadius: 1 }}>
                💡 AI Insight: {getWeatherAdvice(weather.weathercode)}
              </Typography>
            </Paper>
          </Grid>
        )}

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

        {/* Top Selling Products */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              <FaFire style={{ marginRight: 8, color: '#f59e0b' }} /> Top Selling
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(stats?.topSellingProducts || []).map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{product.size}</Typography>
                      </TableCell>
                      <TableCell align="right">{formatPKR(product.sellPrice)}</TableCell>
                    </TableRow>
                  ))}
                  {(!stats?.topSellingProducts || stats.topSellingProducts.length === 0) && (
                    <TableRow><TableCell colSpan={2} align="center" sx={{ color: 'text.secondary' }}>No sales data yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Inventory Time Machine (Feature 4) */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FaHourglassHalf style={{ color: '#8b5cf6' }} /> Inventory Time Machine
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Current Stock</TableCell>
                    <TableCell>Daily Usage</TableCell>
                    <TableCell>Time Left</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(stats?.inventoryForecast || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>No urgent stockouts predicted.</TableCell></TableRow>
                  ) : (
                    (stats?.inventoryForecast || []).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.name} {item.size && `(${item.size})`}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>{item.dailyUsage.toFixed(1)} / day</TableCell>
                        <TableCell>
                          <Chip 
                            label={`${Math.round(item.daysLeft)} Days`} 
                            size="small" 
                            sx={{ 
                              bgcolor: item.daysLeft < 3 ? '#fef2f2' : '#fff7ed', 
                              color: item.daysLeft < 3 ? '#ef4444' : '#f97316',
                              fontWeight: 700 
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="primary" 
                            onClick={() => navigate('/purchases', { state: { restockProduct: item } })}
                          >
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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