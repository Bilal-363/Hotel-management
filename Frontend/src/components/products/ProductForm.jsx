import { useState, useEffect } from 'react';
import { Box, TextField, MenuItem, Button, Grid } from '@mui/material';
import { SIZES } from '../../utils/constants';

const ProductForm = ({ product, categories = [], onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    size: '',
    buyPrice: '',
    sellPrice: '',
    stock: '',
    minStock: 10
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category: product.category || '',
        size: product.size || '',
        buyPrice: product.buyPrice || '',
        sellPrice: product.sellPrice || '',
        stock: product.stock || '',
        minStock: product.minStock || 10
      });
    }
  }, [product]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField fullWidth label="Product Name" name="name" value={formData.name} onChange={handleChange} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Category" name="category" value={formData.category} onChange={handleChange} required>
            {categories.map((cat) => (
              <MenuItem key={cat._id || cat.name} value={cat.name}>{cat.icon} {cat.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth select label="Size" name="size" value={formData.size} onChange={handleChange}>
            <MenuItem value="">None</MenuItem>
            {SIZES.map((size) => (
              <MenuItem key={size} value={size}>{size}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Buy Price (Rs.)" name="buyPrice" type="number" value={formData.buyPrice} onChange={handleChange} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Sell Price (Rs.)" name="sellPrice" type="number" value={formData.sellPrice} onChange={handleChange} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Stock" name="stock" type="number" value={formData.stock} onChange={handleChange} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Min Stock Alert" name="minStock" type="number" value={formData.minStock} onChange={handleChange} />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="contained">{product ? 'Update' : 'Add'} Product</Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductForm;