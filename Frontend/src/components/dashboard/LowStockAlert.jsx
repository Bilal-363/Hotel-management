import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { FaExclamationTriangle } from 'react-icons/fa';

const LowStockAlert = ({ products = [] }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}>
        <FaExclamationTriangle /> Low Stock Alert
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
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center">All products in stock!</TableCell>
              </TableRow>
            ) : (
              products.slice(0, 5).map((item) => (
                <TableRow key={item._id}>
                  <TableCell>{item.name} {item.size && `(${item.size})`}</TableCell>
                  <TableCell><Chip label={item.stock} size="small" color="error" /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LowStockAlert;