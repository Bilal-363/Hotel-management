import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip, Checkbox, Toolbar, TablePagination } from '@mui/material';
import { FaPlus, FaEdit, FaTrash, FaBoxes, FaTags, FaFileExcel, FaFileImport } from 'react-icons/fa';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const Products = () => {
  // const [products, setProducts] = useState([]); // Removed local state in favor of LiveQuery
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', buyPrice: '', sellPrice: '', stock: '', minStock: 10 });
  const [categoryFormData, setCategoryFormData] = useState({ name: '', icon: '📦' });
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const fileInputRef = useRef(null);

  // Select All State
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const icons = ['📦', '🍾', '🚬', '🧃', '🍞', '💧', '🍿', '🍫', '🥛', '🧹', '🏠', '💡', '👨‍💼', '🚗', '🔧', '📝', '🛒', '🎁', '☕', '🍪'];

  // Live Query from Local DB
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.where('type').equals('product').toArray()) || [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories/product')
      ]);
      
      let fetchedProducts = productsRes.data.products || [];

      // Adjust stock based on pending offline sales
      const pendingSales = await db.sales.where('syncStatus').equals('pending').toArray();
      const pendingQtyMap = {};
      pendingSales.forEach(sale => {
        sale.items.forEach(item => {
          pendingQtyMap[item.productId] = (pendingQtyMap[item.productId] || 0) + item.quantity;
        });
      });

      fetchedProducts = fetchedProducts.map(p => ({
        ...p,
        stock: p.stock - (pendingQtyMap[p._id] || 0)
      }));

      // Cache Products
      await db.products.clear();
      await db.products.bulkAdd(fetchedProducts);

      // Cache Categories
      const cats = (categoriesRes.data.categories || []).map(c => ({ ...c, type: 'product' }));
      // We delete old product categories to avoid duplicates if we didn't clear table
      await db.categories.where('type').equals('product').delete();
      await db.categories.bulkAdd(cats);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Select All Handler
  const handleSelectAll = (e) => {
    setSelectAll(e.target.checked);
    if (e.target.checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Individual Select Handler
  const handleSelectProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedProducts, productId];
      setSelectedProducts(newSelected);
      if (newSelected.length === products.length) {
        setSelectAll(true);
      }
    }
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products to delete');
      return;
    }

    if (window.confirm(`Delete ${selectedProducts.length} selected products?`)) {
      try {
        await Promise.all(selectedProducts.map(id => api.delete(`/products/${id}`)));
        toast.success(`${selectedProducts.length} products deleted!`);
        setSelectedProducts([]);
        setSelectAll(false);
        fetchData();
      } catch (err) {
        toast.error('Error deleting products');
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (product = null) => {
    if (product) {
      setEditId(product._id);
      setFormData({ name: product.name, category: product.category, buyPrice: product.buyPrice, sellPrice: product.sellPrice, stock: product.stock, minStock: product.minStock });
    } else {
      setEditId(null);
      setFormData({ name: '', category: categories[0]?.name || '', buyPrice: '', sellPrice: '', stock: '', minStock: 10 });
    }
    setModal(true);
  };

  const openCategoryModal = () => {
    setCategoryFormData({ name: '', icon: '📦' });
    setCategoryModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await api.put(`/products/${editId}`, formData);
        toast.success('Product updated!');
      } else {
        await api.post('/products', formData);
        toast.success('Product added!');
      }
      fetchData();
      setModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleCategorySubmit = async () => {
    try {
      await api.post('/categories', { ...categoryFormData, type: 'product' });
      toast.success('Category created!');
      fetchData();
      setCategoryModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Product deleted!');
        fetchData();
      } catch (err) {
        toast.error('Error deleting product');
      }
    }
  };

  const handleExport = () => {
    const dataToExport = products.map(p => ({
      Name: p.name,
      Category: p.category,
      'Buy Price': p.buyPrice,
      'Sell Price': p.sellPrice,
      Stock: p.stock,
      'Min Stock': p.minStock
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products.xlsx");
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let importedCount = 0;
        for (const row of data) {
          const productData = {
            name: row.Name || row.name,
            category: row.Category || row.category || 'General',
            buyPrice: row['Buy Price'] || row.buyPrice || 0,
            sellPrice: row['Sell Price'] || row.sellPrice || 0,
            stock: row.Stock || row.stock || 0,
            minStock: row['Min Stock'] || row.minStock || 10
          };

          try {
            await api.post('/products', productData);
            importedCount++;
          } catch (err) {
            console.error('Failed to import product:', productData.name);
          }
        }

        toast.success(`Successfully imported ${importedCount} products`);
        fetchData();
      } catch (err) {
        toast.error('Failed to parse Excel file');
        console.error(err);
      }
      e.target.value = ''; // Reset file input
    };
    reader.readAsBinaryString(file);
  };

  const formatPKR = (amount) => `Rs. ${amount.toLocaleString()}`;

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) return <Box p={4}>Loading...</Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}><FaBoxes style={{ marginRight: 10 }} /> Products</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
            accept=".xlsx, .xls"
          />
          <TextField
            select
            size="small"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            sx={{ width: 180, bgcolor: 'white', backgroundColor: 'white' }}
          >
            <MenuItem value="All">All Categories</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat._id} value={cat.name}>{cat.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ bgcolor: 'white', backgroundColor: 'white' }}
          />
          <Button variant="outlined" startIcon={<FaFileImport />} onClick={handleImportClick} color="success">Import Excel</Button>
          <Button variant="outlined" startIcon={<FaFileExcel />} onClick={handleExport} color="success">Export Excel</Button>
          <Button variant="outlined" startIcon={<FaTags />} onClick={openCategoryModal}>Add Category</Button>
          <Button variant="contained" startIcon={<FaPlus />} onClick={() => openModal()}>Add Product</Button>
        </Box>
      </Box>

      {/* Bulk Actions Toolbar */}
      {selectedProducts.length > 0 && (
        <Paper sx={{ mb: 2, p: 2.5, bgcolor: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#1e40af', fontWeight: 600, fontSize: 16 }}>
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<FaTrash />}
              onClick={handleBulkDelete}
              sx={{
                px: 3,
                py: 1.2,
                fontWeight: 600,
                boxShadow: 3,
                '&:hover': {
                  boxShadow: 4
                }
              }}
            >
              Delete Selected
            </Button>
          </Box>
        </Paper>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.length}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Buy Price</TableCell>
                <TableCell>Sell Price</TableCell>
                <TableCell>Profit</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Total Value</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((product) => (
                  <TableRow
                    key={product._id}
                    selected={selectedProducts.includes(product._id)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: '#f0f9ff !important'
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedProducts.includes(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                    <TableCell><Chip label={product.category} size="small" /></TableCell>
                    <TableCell>{formatPKR(product.buyPrice)}</TableCell>
                    <TableCell>{formatPKR(product.sellPrice)}</TableCell>
                    <TableCell sx={{ color: '#10b981', fontWeight: 600 }}>{formatPKR(product.profit)}</TableCell>
                    <TableCell>
                      <Chip label={product.stock} size="small" color={product.stock <= product.minStock ? 'error' : 'success'} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPKR(product.stock * product.sellPrice)}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openModal(product)}><FaEdit /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(product._id)}><FaTrash /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          sx={{
            bgcolor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontWeight: 600,
              color: '#475569'
            }
          }}
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Add/Edit Product Modal */}
      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="Product Name" name="name" value={formData.name} onChange={handleChange} required />
            <TextField fullWidth select label="Category" name="category" value={formData.category} onChange={handleChange} required>
              {categories.map((cat) => <MenuItem key={cat._id} value={cat.name}>{cat.icon} {cat.name}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth label="Buy Price" name="buyPrice" type="number" value={formData.buyPrice} onChange={handleChange} required />
              <TextField fullWidth label="Sell Price" name="sellPrice" type="number" value={formData.sellPrice} onChange={handleChange} required />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth label="Stock" name="stock" type="number" value={formData.stock} onChange={handleChange} required />
              <TextField fullWidth label="Min Stock" name="minStock" type="number" value={formData.minStock} onChange={handleChange} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>{editId ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={categoryModal} onClose={() => setCategoryModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Product Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            {/* Icon selection removed as per user request */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCategorySubmit}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;