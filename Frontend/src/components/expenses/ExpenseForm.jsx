import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Paper } from '@mui/material';
import { FaEdit, FaTrash } from 'react-icons/fa';

const ExpenseList = ({ expenses = [], onEdit, onDelete }) => {
  const formatPKR = (amount) => `Rs. ${(amount || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK', { dateStyle: 'medium' });

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense._id}>
                <TableCell>{formatDate(expense.createdAt)}</TableCell>
                <TableCell><Chip label={expense.category} size="small" /></TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#ef4444' }}>{formatPKR(expense.amount)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onEdit(expense)}><FaEdit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(expense._id)}><FaTrash /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ExpenseList;