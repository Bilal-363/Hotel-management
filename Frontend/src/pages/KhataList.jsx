import { useEffect, useMemo, useState, useRef } from 'react';
import { Box, Paper, Typography, TextField, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Tooltip, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox } from '@mui/material';
import { FaBook, FaSearch, FaEye, FaTrash, FaFilePdf, FaFileCsv, FaFileExcel, FaUsers, FaArrowLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getKhatas, deleteKhata } from '../services/khataService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { exportToCSV, exportToXLSX, pagePrintStyle } from '../utils/exportUtils';

const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString('en-PK')}`;

const KhataList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [khatas, setKhatas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState('');
  const tableRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => tableRef.current,
    pageStyle: pagePrintStyle
  });

  useEffect(() => { 
    load(); 
    const handleOnline = () => {
      toast.success('Back Online!');
      load();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const load = async () => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('khatas_list_cache');
      if (cached) {
        setKhatas(JSON.parse(cached));
        toast('Loaded from cache (Offline)', { icon: '⚠️', id: 'offline-khatas' });
      } else {
        toast.error('Offline and no cache found');
      }
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getKhatas();
      setKhatas(res.khatas || []);
      localStorage.setItem('khatas_list_cache', JSON.stringify(res.khatas || []));
    } catch {
      toast.error('Failed to load khatas');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return (khatas || []).filter(k => {
      const matchesSearch = (k.title || '').toLowerCase().includes(term) || (k.customer?.name || '').toLowerCase().includes(term) || (k.customer?.phone || '').includes(term);
      const matchesStatus = !status || k.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [khatas, search, status]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [khataToDelete, setKhataToDelete] = useState(null);

  const confirmDelete = (k) => {
    setKhataToDelete(k);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    try {
      if (!khataToDelete) return;
      await deleteKhata(khataToDelete._id);
      toast.success('Khata deleted');
      setDeleteOpen(false);
      setKhataToDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  // Bulk Selection Logic
  const [selected, setSelected] = useState([]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = filtered.map((n) => n._id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!navigator.onLine) return toast.error('Cannot delete while offline');
    if (!window.confirm(`Are you sure you want to delete ${selected.length} khatas?`)) return;

    try {
      await Promise.all(selected.map(id => deleteKhata(id)));
      toast.success(`${selected.length} khatas deleted`);
      setSelected([]);
      load();
    } catch (err) {
      toast.error('Failed to delete some khatas');
    }
  };

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/khata')} sx={{ color: '#1e293b', bgcolor: '#e2e8f0', '&:hover': { bgcolor: '#cbd5e1' } }}>
              <FaArrowLeft />
            </IconButton>
            <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#1e293b' }}>
              <FaBook /> Khata Management
            </Typography>
          </Box>
        </Box>

        <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', color: '#1e293b', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 2, flex: 1, minWidth: 300 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by title, customer, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaSearch color="#64748b" />
                    </InputAdornment>
                  ),
                  sx: { color: '#1e293b', bgcolor: '#f1f5f9', borderRadius: 1 }
                }}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                {['open', 'closed'].map(s => (
                  <Chip
                    key={s}
                    label={s.toUpperCase()}
                    clickable
                    onClick={() => setStatus(status === s ? '' : s)}
                    sx={{
                      bgcolor: status === s ? '#3b82f6' : '#f1f5f9',
                      color: status === s ? 'white' : '#64748b',
                      fontWeight: 600,
                      '&:hover': { bgcolor: status === s ? '#2563eb' : '#e2e8f0' }
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {selected.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<FaTrash />}
                  onClick={handleBulkDelete}
                  sx={{ animation: 'fadeIn 0.2s' }}
                >
                  Delete ({selected.length})
                </Button>
              )}
              <Button variant="outlined" startIcon={<FaUsers />} onClick={() => navigate('/khata')} sx={{ color: '#1e293b', borderColor: '#e2e8f0' }}>
                Customers
              </Button>
              <Button variant="contained" sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }} startIcon={<FaFilePdf />} onClick={handlePrint}>
                PDF
              </Button>
              <Button
                variant="contained"
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                startIcon={<FaFileExcel />}
                onClick={() => {
                  const columns = ['Title', 'Customer', 'Phone', 'Address', 'Total', 'Remaining', 'Status'];
                  const rows = filtered.map(k => [k.title, k.customer?.name || '', k.customer?.phone || '', k.customer?.address || '', k.totalAmount, k.remainingAmount, k.status]);
                  exportToXLSX('khatas', columns, rows);
                }}
              >
                Excel
              </Button>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} ref={tableRef}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < filtered.length}
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>KHATA DETAILS</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>PHONE</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>TOTAL</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>REMAINING</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>STATUS</TableCell>
                  <TableCell sx={{ color: '#64748b', fontWeight: 600, textAlign: 'right' }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: '#64748b', py: 3 }}>Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ color: '#64748b', py: 3 }}>
                      No khatas found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(k => {
                    const isSelected = selected.indexOf(k._id) !== -1;
                    return (
                      <TableRow
                        key={k._id}
                        hover
                        sx={{ '&:hover': { bgcolor: '#f8fafc' }, cursor: 'pointer' }}
                        selected={isSelected}
                        onClick={(event) => handleSelect(event, k._id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600} color="#1e293b">{k.title}</Typography>
                          <Typography variant="caption" color="#64748b">{k.customer?.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{k.customer?.phone}</TableCell>
                        <TableCell sx={{ color: '#1e293b', fontWeight: 600 }}>{formatPKR(k.totalAmount)}</TableCell>
                        <TableCell sx={{ color: k.remainingAmount > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                          {formatPKR(k.remainingAmount)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={k.status.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: k.status === 'open' ? '#eff6ff' : '#f0fdf4',
                              color: k.status === 'open' ? '#3b82f6' : '#22c55e',
                              fontWeight: 600,
                              borderRadius: 1
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => navigate(`/khata/${k._id}`)} sx={{ color: '#3b82f6', mr: 1 }}>
                              <FaEye />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => confirmDelete(k)} sx={{ color: '#ef4444' }}>
                              <FaTrash />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete khata <b>{khataToDelete?.title}</b>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
            <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default KhataList;
