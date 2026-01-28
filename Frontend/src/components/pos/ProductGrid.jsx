import { Box, Paper, Typography } from '@mui/material';

const ProductGrid = ({ products = [], onAddToCart }) => {
  const formatPKR = (amount) => `Rs. ${amount.toLocaleString()}`;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2, maxHeight: '60vh', overflowY: 'auto', p: 0.5 }}>
      {products.map((product) => (
        <Paper key={product._id} onClick={() => product.stock > 0 && onAddToCart(product)} sx={{ p: 2, textAlign: 'center', cursor: product.stock > 0 ? 'pointer' : 'not-allowed', border: product.stock <= product.minStock ? '2px solid #f59e0b' : '2px solid transparent', opacity: product.stock === 0 ? 0.5 : 1, '&:hover': { borderColor: product.stock > 0 ? '#2563eb' : 'transparent', transform: product.stock > 0 ? 'translateY(-2px)' : 'none' }, transition: 'all 0.2s' }}>
          <Typography fontWeight={600} fontSize={14} noWrap>{product.name}</Typography>
          <Typography color="text.secondary" fontSize={12}>{product.size}</Typography>
          <Typography color="primary" fontWeight={700} fontSize={18} mt={1}>{formatPKR(product.sellPrice)}</Typography>
          <Typography fontSize={11} color={product.stock <= product.minStock ? 'error.main' : 'text.secondary'}>
            Stock: {product.stock}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

export default ProductGrid;