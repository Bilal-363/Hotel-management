import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Paper } from '@mui/material';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

const ProductList = ({ products = [], onEdit, onDelete, onAddStock }) => {
  const formatPKR = (amount) => `Rs. ${amount.toLocaleString()}`;

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Buy Price</TableCell>
              <TableCell>Sell Price</TableCell>
              <TableCell>Profit</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id}>
                <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                <TableCell><Chip label={product.category} size="small" /></TableCell>
                <TableCell>{product.size || '-'}</TableCell>
                <TableCell>{formatPKR(product.buyPrice)}</TableCell>
                <TableCell>{formatPKR(product.sellPrice)}</TableCell>
                <TableCell sx={{ color: '#10b981', fontWeight: 600 }}>{formatPKR(product.profit)}</TableCell>
                <TableCell>
                  <Chip label={product.stock} size="small" color={product.stock <= product.minStock ? 'error' : 'success'} />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onAddStock(product)} color="success"><FaPlus /></IconButton>
                  <IconButton size="small" onClick={() => onEdit(product)}><FaEdit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(product._id)}><FaTrash /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ProductList;