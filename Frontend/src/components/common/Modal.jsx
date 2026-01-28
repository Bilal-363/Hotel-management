import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box } from '@mui/material';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ open, onClose, title, children, onSubmit, submitText = 'Save', maxWidth = 'sm' }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton onClick={onClose} size="small"><FaTimes /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ pt: 1 }}>{children}</Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        {onSubmit && <Button variant="contained" onClick={onSubmit}>{submitText}</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default Modal;