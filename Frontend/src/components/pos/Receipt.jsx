import { Box, Paper, Typography, Button, IconButton, TextField } from '@mui/material';
import { FaPlus, FaMinus, FaTrash, FaShoppingCart } from 'react-icons/fa';

const Cart = ({ items = [], onUpdateQuantity, onRemove, onClear }) => {
  const formatPKR = (amount) => `Rs. ${amount.toLocaleString()}`;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FaShoppingCart /> Cart ({items.length})
        </Typography>
        {items.length > 0 && (
          <Button size="small" color="error" onClick={onClear}>Clear</Button>
        )}
      </Box>

      <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>Cart is empty</Typography>
        ) : (
          items.map((item) => (
            <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, mb: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography fontSize={14} fontWeight={500}>{item.name}</Typography>
                <Typography fontSize={12} color="text.secondary">{formatPKR(item.sellPrice)} x {item.quantity}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={() => onUpdateQuantity(item._id, -1)}><FaMinus size={10} /></IconButton>
                <Typography fontWeight={600} sx={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton size="small" onClick={() => onUpdateQuantity(item._id, 1)}><FaPlus size={10} /></IconButton>
                <IconButton size="small" color="error" onClick={() => onRemove(item._id)}><FaTrash size={12} /></IconButton>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default Cart;