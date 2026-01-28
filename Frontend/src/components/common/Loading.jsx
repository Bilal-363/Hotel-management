import { Box, CircularProgress, Typography } from '@mui/material';

const Loading = ({ message = 'Loading...' }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 2 }}>
      <CircularProgress size={40} />
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
};

export default Loading;