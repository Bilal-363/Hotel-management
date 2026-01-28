import { Box, Chip } from '@mui/material';

const CategoryFilter = ({ categories = [], selected, onSelect }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <Chip label="All" onClick={() => onSelect('All')} color={selected === 'All' ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
      {categories.map((cat) => (
        <Chip key={cat._id || cat.name} label={cat.icon ? `${cat.icon} ${cat.name}` : cat.name} onClick={() => onSelect(cat.name)} color={selected === cat.name ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
      ))}
    </Box>
  );
};

export default CategoryFilter;