import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Divider, Grid, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton, Tooltip } from '@mui/material';
import { FaBook, FaMoneyBill, FaPlus, FaFilePdf, FaArrowLeft, FaCheck, FaTimes, FaFileCsv, FaFileExcel, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getKhata, addCharge, addInstallments, payInstallment, updateKhata, deleteTransaction } from '../services/khataService';
import { useReactToPrint } from 'react-to-print';
import { exportToCSV, exportToXLSX, pagePrintStyle } from '../utils/exportUtils';

const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString('en-PK')}`;

const KhataDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ khata: null, transactions: [] });
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeNote, setChargeNote] = useState('');

  const [installOpen, setInstallOpen] = useState(false);
  const [installations, setInstallations] = useState([{ amount: '', dueDate: '', productName: '' }]);

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [editTitle, setEditTitle] = useState('');
  const printRef = useRef(null);


  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: pagePrintStyle
  });

  const handleDeleteClick = (tx) => {
    setTransactionToDelete(tx);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    try {
      if (!transactionToDelete) return;
      await deleteTransaction(transactionToDelete._id);
      toast.success('Transaction deleted and balance updated');
      setDeleteConfirmOpen(false);
      setTransactionToDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete transaction');
    }
  };

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getKhata(id);
      setData({ khata: res.khata, transactions: res.transactions || [] });
      setEditTitle(res.khata?.title || '');
    } catch {
      toast.error('Failed to load khata');
    } finally {
      setLoading(false);
    }
  };

  const handleCharge = async () => {
    try {
      const amount = Number(chargeAmount || '0');
      if (!amount || amount <= 0) { toast.error('Enter amount'); return; }
      await addCharge(id, { amount, note: chargeNote });
      toast.success('Charge added');
      setChargeOpen(false);
      setChargeAmount(''); setChargeNote('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add charge');
    }
  };

  const addRow = () => setInstallations([...installations, { amount: '', dueDate: '', productName: '' }]);
  const updateRow = (idx, key, value) => {
    const next = [...installations];
    next[idx][key] = value;
    setInstallations(next);
  };
  const handleInstallments = async () => {
    try {
      const payload = installations.map(i => ({ amount: Number(i.amount || '0'), dueDate: i.dueDate, productName: i.productName }));
      if (payload.some(p => !p.amount || !p.dueDate)) { toast.error('Fill amount and due date'); return; }
      await addInstallments(id, payload);
      toast.success('Installments added');
      setInstallOpen(false); setInstallations([{ amount: '', dueDate: '', productName: '' }]);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add installments');
    }
  };

  const openPayDialog = (installment) => {
    setSelectedInstallment(installment);
    setPayAmount(String(installment.amount - installment.paidAmount));
    setPayNote('');
    setPayOpen(true);
  };

  const handlePay = async () => {
    const amount = Number(payAmount || '0');
    if (!amount || amount <= 0) { toast.error('Invalid amount'); return; }
    try {
      await payInstallment(selectedInstallment._id, { amount, note: payNote });
      toast.success('Payment recorded');
      setPayOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Payment failed');
    }
  };

  const saveTitle = async () => {
    try {
      await updateKhata(id, { title: editTitle });
      toast.success('Title updated');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  const k = data.khata;

  if (loading) return <Box sx={{ p: 3, color: '#1e293b' }}>Loading...</Box>;
  if (!k) return <Box sx={{ p: 3, color: '#1e293b' }}>Khata not found</Box>;

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f8fafc', color: '#1e293b' }}>
      <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}
        </style>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: '#1e293b', bgcolor: '#e2e8f0', '&:hover': { bgcolor: '#cbd5e1' } }}>
              <FaArrowLeft />
            </IconButton>
            <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FaBook /> {k.title}
            </Typography>
            <Chip
              label={k.status.toUpperCase()}
              sx={{
                bgcolor: k.status === 'open' ? '#eff6ff' : '#f0fdf4',
                color: k.status === 'open' ? '#3b82f6' : '#22c55e',
                fontWeight: 600
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }} startIcon={<FaFilePdf />} onClick={handlePrint}>PDF</Button>
            <Button variant="contained" sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }} startIcon={<FaFileExcel />} onClick={() => {
              const data = [
                ['CUSTOMER DETAILS'],
                ['Name', k.customer?.name],
                ['Phone', k.customer?.phone],
                ['Address', k.customer?.address],
                ['Khata Title', k.title],
                ['Total Amount', k.totalAmount],
                ['Remaining', k.remainingAmount],
                ['Status', k.status],
                [],
                ['INSTALLMENT PLAN'],
                ['Due Date', 'Amount', 'Paid', 'Status'],
                ...(k.installments || []).map(ins => [
                  new Date(ins.dueDate).toLocaleDateString('en-PK'),
                  ins.amount,
                  ins.paidAmount,
                  ins.status
                ]),
                [],
                ['TRANSACTION HISTORY'],
                ['Date', 'Type', 'Amount', 'Note'],
                ...(data.transactions || []).map(tx => [
                  new Date(tx.createdAt).toLocaleDateString('en-PK'),
                  tx.type,
                  tx.amount,
                  tx.note || ''
                ])
              ];
              exportToXLSX(`Khata_${k.customer?.name}_FullHistory`, [], data);
            }}>Excel</Button>
          </Box>
        </Box>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Left Column: Details & Installments */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', color: '#1e293b', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              <Grid container spacing={3} mb={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="#64748b">CUSTOMER DETAILS</Typography>
                  <Typography variant="h6" fontWeight={600}>{k.customer?.name}</Typography>
                  <Typography variant="body2" color="#64748b">{k.customer?.phone}</Typography>
                </Grid>
                <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
                  <Typography variant="subtitle2" color="#64748b">FINANCIALS</Typography>
                  <Typography variant="h5" fontWeight={700} color="#3b82f6">{formatPKR(k.totalAmount)}</Typography>
                  <Typography variant="body2" color={k.remainingAmount > 0 ? '#ef4444' : '#22c55e'}>
                    Remaining: {formatPKR(k.remainingAmount)}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ borderColor: '#e2e8f0', mb: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Installments</Typography>
                <Button variant="outlined" size="small" startIcon={<FaMoneyBill />} onClick={() => setInstallOpen(true)} sx={{ color: '#3b82f6', borderColor: '#3b82f6' }}>
                  Add Plan
                </Button>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#64748b' }}>DUE DATE</TableCell>
                      <TableCell sx={{ color: '#64748b' }}>AMOUNT</TableCell>
                      <TableCell sx={{ color: '#64748b' }}>PAID</TableCell>
                      <TableCell sx={{ color: '#64748b' }}>STATUS</TableCell>
                      <TableCell sx={{ color: '#64748b', textAlign: 'right' }}>ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(k.installments || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ color: '#64748b', py: 3 }}>
                          No installments found.
                        </TableCell>
                      </TableRow>
                    )}
                    {(k.installments || []).map(ins => (
                      <TableRow key={ins._id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell sx={{ color: '#1e293b' }}>{new Date(ins.dueDate).toLocaleDateString('en-PK')}</TableCell>
                        <TableCell sx={{ color: '#1e293b', fontWeight: 600 }}>{formatPKR(ins.amount)}</TableCell>
                        <TableCell sx={{ color: '#22c55e' }}>{formatPKR(ins.paidAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={ins.status}
                            size="small"
                            sx={{
                              bgcolor: ins.status === 'paid' ? '#f0fdf4' : ins.status === 'partial' ? '#fef9c3' : '#fef2f2',
                              color: ins.status === 'paid' ? '#22c55e' : ins.status === 'partial' ? '#eab308' : '#ef4444',
                              fontWeight: 600,
                              height: 24
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {ins.status !== 'paid' && (
                            <Button size="small" variant="contained" sx={{ bgcolor: '#3b82f6', fontSize: '0.7rem' }} onClick={() => openPayDialog(ins)}>
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Column: Actions & Transactions */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', color: '#1e293b', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Edit Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': { color: '#1e293b', '& fieldset': { borderColor: '#e2e8f0' } },
                      '& .MuiInputLabel-root': { color: '#64748b' }
                    }}
                  />
                  <Button variant="contained" onClick={saveTitle}>Save</Button>
                </Box>
                <Button variant="outlined" startIcon={<FaPlus />} onClick={() => setChargeOpen(true)} fullWidth sx={{ color: '#3b82f6', borderColor: '#3b82f6' }}>
                  Add Extra Charge
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: 'white', color: '#1e293b', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Recent Transactions</Typography>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {(data.transactions || []).map((tx, i) => (
                  <Box key={tx._id} sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="#64748b">{new Date(tx.createdAt).toLocaleDateString('en-PK')}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip label={tx.type} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: tx.type === 'payment' ? '#22c55e' : '#ef4444', color: 'white' }} />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(tx)}
                          sx={{ p: 0.5, color: '#ef4444', ml: 1, '&:hover': { bgcolor: '#fef2f2' } }}
                        >
                          <FaTrash size={12} />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="h6" fontWeight={600}>{formatPKR(tx.amount)}</Typography>
                    {tx.note && <Typography variant="body2" color="#64748b">{tx.note}</Typography>}
                  </Box>
                ))}
                {(data.transactions || []).length === 0 && <Typography color="#64748b" align="center">No transactions yet.</Typography>}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Dialogs */}
        <Dialog open={chargeOpen} onClose={() => setChargeOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>Add Extra Charge</DialogTitle>
          <DialogContent>
            <TextField label="Amount" type="number" fullWidth sx={{ mt: 2 }} value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
            <TextField label="Item Name" fullWidth sx={{ mt: 2 }} value={chargeNote} onChange={(e) => setChargeNote(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChargeOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button variant="contained" onClick={handleCharge}>Add Charge</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={installOpen} onClose={() => setInstallOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>Add Installment Plan</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, p: 2, bgcolor: '#f1f5f9', borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="#64748b">Total Amount</Typography>
                <Typography variant="h6" fontWeight={600}>{formatPKR(k?.totalAmount)}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="#64748b">Remaining</Typography>
                <Typography variant="h6" fontWeight={600} color={k?.remainingAmount > 0 ? '#ef4444' : '#22c55e'}>
                  {formatPKR(k?.remainingAmount)}
                </Typography>
              </Box>
            </Box>

            {/* Purchase History Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Purchase Details</Typography>
              <Box sx={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.75rem', py: 1 }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.75rem', py: 1 }}>Item Name</TableCell>
                      <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 600, fontSize: '0.75rem', py: 1, textAlign: 'right' }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.transactions || []).filter(t => t.type !== 'payment').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ color: '#64748b', fontSize: '0.75rem', py: 2 }}>No purchases found</TableCell>
                      </TableRow>
                    ) : (
                      (data.transactions || []).filter(t => t.type !== 'payment').map((tx, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{new Date(tx.createdAt).toLocaleDateString('en-PK')}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                            {tx.note?.startsWith('Khata created: ') ? tx.note.replace('Khata created: ', '') : (tx.note || '-')}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', py: 0.5, textAlign: 'right' }}>{formatPKR(tx.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>

            <Typography variant="subtitle2" fontWeight={600} mb={1}>Installment Schedule</Typography>
            {installations.map((row, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField label="Product Name" value={row.productName || ''} onChange={(e) => updateRow(idx, 'productName', e.target.value)} sx={{ flex: 2 }} />
                <TextField label="Amount" type="number" value={row.amount} onChange={(e) => updateRow(idx, 'amount', e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Due Date" type="date" value={row.dueDate} onChange={(e) => updateRow(idx, 'dueDate', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
              </Box>
            ))}
            <Button sx={{ mt: 2, color: '#3b82f6' }} onClick={addRow} startIcon={<FaPlus />}>Add Row</Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInstallOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button variant="contained" onClick={handleInstallments}>Save Plan</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'white', color: '#1e293b' } }}>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="#64748b" mb={2}>
              Recording payment for installment due on {selectedInstallment && new Date(selectedInstallment.dueDate).toLocaleDateString()}
            </Typography>
            <TextField label="Amount" type="number" fullWidth sx={{ mt: 1 }} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <TextField label="Note (Optional)" fullWidth sx={{ mt: 2 }} value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handlePay}>Confirm Payment</Button>
          </DialogActions>
        </Dialog>

        {/* Hidden Printable Section */}
        <Box sx={{ display: 'none' }}>
          <Box ref={printRef} sx={{ p: 4, color: '#1e293b', bgcolor: 'white' }}>
            <Typography variant="h4" fontWeight={700} align="center" mb={1}>Haji Waris Ali Hotel & General Store</Typography>
            <Typography variant="subtitle1" align="center" mb={4} color="#64748b">Khata Statement</Typography>

            <Grid container spacing={3} mb={4}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="#64748b">CUSTOMER</Typography>
                <Typography variant="h6" fontWeight={600}>{k.customer?.name}</Typography>
                <Typography variant="body2">{k.customer?.phone}</Typography>
                <Typography variant="body2">{k.customer?.address}</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" color="#64748b">SUMMARY</Typography>
                <Typography variant="h6" fontWeight={600}>{k.title}</Typography>
                <Typography variant="body2">Total: {formatPKR(k.totalAmount)}</Typography>
                <Typography variant="body2" color={k.remainingAmount > 0 ? '#ef4444' : '#22c55e'}>
                  Remaining: {formatPKR(k.remainingAmount)}
                </Typography>
                <Chip label={k.status.toUpperCase()} size="small" sx={{ mt: 1 }} />
              </Grid>
            </Grid>

            <Typography variant="h6" fontWeight={700} mb={2} sx={{ borderBottom: '2px solid #e2e8f0', pb: 1 }}>Installment Plan</Typography>
            <TableContainer sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Paid</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(k.installments || []).map((ins, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(ins.dueDate).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell>{formatPKR(ins.amount)}</TableCell>
                      <TableCell>{formatPKR(ins.paidAmount)}</TableCell>
                      <TableCell>{ins.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" fontWeight={700} mb={2} sx={{ borderBottom: '2px solid #e2e8f0', pb: 1 }}>Transaction History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data.transactions || []).map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString('en-PK')}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell>{formatPKR(tx.amount)}</TableCell>
                      <TableCell>{tx.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>

        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this transaction? This will reverse the balance adjustment.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmDeleteTransaction} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Box>
  );
};

export default KhataDetail;
