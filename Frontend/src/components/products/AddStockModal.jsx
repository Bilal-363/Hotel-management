import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box } from '@mui/material';

const AddStockModal = ({ open, onClose, product, onSubmit }) => {
  const [quantity, setQuantity] = useState('');

  const handleSubmit = () => {
    if (quantity && parseInt(quantity) > 0) {
      onSubmit(product._id, parseInt(quantity));
      setQuantity('');
      onClose();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Stock</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography fontWeight={600} mb={1}>{product.name}</Typography>
          <Typography color="text.secondary" fontSize={14} mb={2}>Current Stock: {product.stock}</Typography>
          <TextField fullWidth label="Add Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Add Stock</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStockModal;