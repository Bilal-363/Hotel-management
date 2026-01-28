import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Box } from '@mui/material';
import { FaShoppingCart } from 'react-icons/fa';

const RecentSales = ({ sales = [] }) => {
  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaShoppingCart /> Recent Sales
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
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">No sales yet</TableCell>
              </TableRow>
            ) : (
              sales.slice(0, 5).map((sale) => (
                <TableRow key={sale._id}>
                  <TableCell>#{sale.invoiceNumber}</TableCell>
                  <TableCell>{sale.customerName}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#10b981' }}>{formatPKR(sale.total)}</TableCell>
                  <TableCell><Chip label={sale.paymentMethod} size="small" color="primary" /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentSales;