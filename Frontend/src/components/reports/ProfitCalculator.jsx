import { Paper, Typography, Box, Grid } from '@mui/material';
import { FaCalculator } from 'react-icons/fa';

const ProfitCalculator = ({ totalSales = 0, totalCost = 0, totalExpenses = 0, grossProfit = 0, netProfit = 0 }) => {
  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaCalculator /> Profit Calculator
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography>Total Sales</Typography>
            <Typography fontWeight={700} color="primary">{formatPKR(totalSales)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography>Total Cost</Typography>
            <Typography fontWeight={700}>{formatPKR(totalCost)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography>Gross Profit</Typography>
            <Typography fontWeight={700} color="success.main">{formatPKR(grossProfit)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography>Total Expenses</Typography>
            <Typography fontWeight={700} color="error">{formatPKR(totalExpenses)}</Typography>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: netProfit >= 0 ? '#d1fae5' : '#fee2e2', borderRadius: 2 }}>
            <Typography fontWeight={700}>Net Profit</Typography>
            <Typography fontWeight={700} color={netProfit >= 0 ? 'success.main' : 'error'}>{formatPKR(netProfit)}</Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ProfitCalculator;