import { Paper, Box, Typography } from '@mui/material';

const StatCard = ({ icon, label, value, color = '#2563eb' }) => {
  return (
    <Paper sx={{ p: 3, borderLeft: `4px solid ${color}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 50, height: 50, borderRadius: 2, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, fontSize: 24 }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography color="text.secondary" fontSize={13}>{label}</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default StatCard;