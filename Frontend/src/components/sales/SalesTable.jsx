import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const SaleDetails = ({ open, onClose, sale }) => {
  if (!sale) return null;

  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleString('en-PK');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invoice #{sale.invoiceNumber}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" mb={2}>{formatDate(sale.createdAt)} | {sale.customerName}</Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items?.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatPKR(item.sellPrice)}</TableCell>
                  <TableCell>{formatPKR(item.itemTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Subtotal:</Typography>
            <Typography>{formatPKR(sale.subtotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Discount:</Typography>
            <Typography>{formatPKR(sale.discount)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, pt: 1, borderTop: '1px dashed #ccc' }}>
            <Typography fontWeight={700}>Total:</Typography>
            <Typography fontWeight={700} color="primary">{formatPKR(sale.total)}</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained">Print</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaleDetails;