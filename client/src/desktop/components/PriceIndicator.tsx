import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Price indicator component
export default function PriceIndicator() {
  const currentPrice = 1.52;
  const minPrice = 0.80; // Historical minimum
  const maxPrice = 2.20; // Historical maximum

  // Calculate position on the bar (0-100%)
  const pricePosition = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;

  return (
    <Box sx={{
      width: '100%',
      border: '1px solid #d0c98d30',
      borderRadius: '5px',
      padding: '10px',
      background: 'rgba(24, 40, 24, 0.3)',
      boxSizing: 'border-box',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
          Game Price
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          ${currentPrice.toFixed(2)}
        </Typography>
      </Box>

      {/* Price bar */}
      <Box sx={{
        width: '100%',
        height: 8,
        borderRadius: 4,
        background: 'linear-gradient(90deg, #4caf50 0%, #ff9800 50%, #f44336 100%)',
        position: 'relative',
      }}>
        {/* Price indicator dot */}
        <Box sx={{
          position: 'absolute',
          left: `${Math.min(Math.max(pricePosition, 0), 100)}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#ffffff',
          border: '2px solid #d0c98d',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 2,
        }} />
      </Box>

      {/* Price range labels */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography sx={{ fontSize: '0.65rem', color: '#b0b0b0' }}>
          ${minPrice.toFixed(2)}
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: '#b0b0b0' }}>
          ${maxPrice.toFixed(2)}
        </Typography>
      </Box>

      {/* Fee explanation */}
      <Typography sx={{
        fontSize: '0.65rem',
        color: '#808080',
        mt: 0.5,
        fontStyle: 'italic'
      }}>
        100% of game fees goes to survivor token holders
      </Typography>
    </Box>
  );
} 