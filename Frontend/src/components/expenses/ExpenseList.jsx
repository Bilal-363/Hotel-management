import { Box, TextField, Button } from '@mui/material';

const SalesFilter = ({ startDate, endDate, onStartDateChange, onEndDateChange, onFilter }) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField type="date" size="small" label="Start Date" InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
      <TextField type="date" size="small" label="End Date" InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
      <Button variant="contained" onClick={onFilter}>Filter</Button>
    </Box>
  );
};

export default SalesFilter;