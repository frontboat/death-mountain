import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { BEAST_NAMES, BEAST_NAME_PREFIXES, BEAST_NAME_SUFFIXES } from '@/constants/beast';
import React from 'react';

// Dummy price chart data
const dummyPriceData = [
  { time: 'Day 1', price: 1.00 },
  { time: 'Day 2', price: 1.10 },
  { time: 'Day 3', price: 1.25 },
  { time: 'Day 4', price: 1.18 },
  { time: 'Day 5', price: 1.35 },
  { time: 'Day 6', price: 1.40 },
  { time: 'Day 7', price: 1.52 },
];

// Generate all beasts with random special names
const generateAllBeasts = () => {
  const beasts = [];
  
  for (let i = 1; i <= 75; i++) {
    if (BEAST_NAMES[i]) {
      // Generate random special name (prefix + suffix)
      const prefixIndex = Math.floor(Math.random() * 69) + 1;
      const suffixIndex = Math.floor(Math.random() * 18) + 1;
      
      const prefix = BEAST_NAME_PREFIXES[prefixIndex] || '';
      const suffix = BEAST_NAME_SUFFIXES[suffixIndex] || '';
      const baseName = BEAST_NAMES[i];
      
      // Create special name (only for beasts level 19+)
      const specialName = `"${prefix} ${suffix}" ${baseName}`;
      
      // Calculate power based on tier (T1 = highest power, T5 = lowest)
      let power;
      if (i <= 5 || (i >= 26 && i <= 30) || (i >= 51 && i <= 55)) {
        power = 280 + Math.floor(Math.random() * 40); // T1: 280-320
      } else if (i <= 10 || (i >= 31 && i <= 35) || (i >= 56 && i <= 60)) {
        power = 240 + Math.floor(Math.random() * 40); // T2: 240-280
      } else if (i <= 15 || (i >= 36 && i <= 40) || (i >= 61 && i <= 65)) {
        power = 200 + Math.floor(Math.random() * 40); // T3: 200-240
      } else if (i <= 20 || (i >= 41 && i <= 45) || (i >= 66 && i <= 70)) {
        power = 160 + Math.floor(Math.random() * 40); // T4: 160-200
      } else {
        power = 120 + Math.floor(Math.random() * 40); // T5: 120-160
      }
      
      beasts.push({
        id: i,
        name: specialName,
        baseName: baseName,
        power: power,
        tier: getTier(i)
      });
    }
  }
  
  // Sort by power (highest first)
  return beasts.sort((a, b) => b.power - a.power);
};

// Helper function to determine tier
const getTier = (beastId: number): string => {
  if (beastId <= 5 || (beastId >= 26 && beastId <= 30) || (beastId >= 51 && beastId <= 55)) {
    return 'T1';
  } else if (beastId <= 10 || (beastId >= 31 && beastId <= 35) || (beastId >= 56 && beastId <= 60)) {
    return 'T2';
  } else if (beastId <= 15 || (beastId >= 36 && beastId <= 40) || (beastId >= 61 && beastId <= 65)) {
    return 'T3';
  } else if (beastId <= 20 || (beastId >= 41 && beastId <= 45) || (beastId >= 66 && beastId <= 70)) {
    return 'T4';
  } else {
    return 'T5';
  }
};

const allBeasts = generateAllBeasts();

// Enhanced SVG line chart with gradient and better styling
function PriceChart() {
  const width = 600;
  const height = 220;
  const padding = 40;
  const points = dummyPriceData.map((d, i) => [
    padding + i * ((width - 2 * padding) / (dummyPriceData.length - 1)),
    height - padding - ((d.price - 1) / 0.52) * (height - 2 * padding)
  ]);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');

  // Create area path for gradient fill
  const areaPath = path + `L${points[points.length - 1][0]},${height - padding}L${points[0][0]},${height - padding}Z`;

  return (
    <svg width={width} height={height} style={{ width: '100%', maxWidth: 600, display: 'block' }}>
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe082" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffe082" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd54f" />
          <stop offset="50%" stopColor="#ffe082" />
          <stop offset="100%" stopColor="#ffb74d" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line
          key={`grid-${i}`}
          x1={padding + i * ((width - 2 * padding) / 6)}
          y1={padding}
          x2={padding + i * ((width - 2 * padding) / 6)}
          y2={height - padding}
          stroke="#333"
          strokeWidth={1}
          opacity={0.3}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={`grid-h-${i}`}
          x1={padding}
          y1={padding + i * ((height - 2 * padding) / 3)}
          x2={width - padding}
          y2={padding + i * ((height - 2 * padding) / 3)}
          stroke="#333"
          strokeWidth={1}
          opacity={0.3}
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#chartGradient)" />

      {/* Main line */}
      <path d={path} fill="none" stroke="url(#lineGradient)" strokeWidth={4} filter="url(#glow)" />

      {/* Points with glow */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={6} fill="#1a1a1a" stroke="#ffe082" strokeWidth={2} />
          <circle cx={p[0]} cy={p[1]} r={3} fill="#ffe082" />
        </g>
      ))}

      {/* Labels with better styling */}
      {dummyPriceData.map((d, i) => (
        <text key={i} x={points[i][0]} y={height - padding + 20} textAnchor="middle" fontSize="11" fill="#888" fontWeight="500">{d.time}</text>
      ))}

      {/* Y-axis labels */}
      {[1, 1.2, 1.4, 1.52].map((v, i) => (
        <text key={i} x={padding - 15} y={height - padding - ((v - 1) / 0.52) * (height - 2 * padding) + 4} textAnchor="end" fontSize="11" fill="#888" fontWeight="500">${v.toFixed(2)}</text>
      ))}
    </svg>
  );
}

export default function StatisticsModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      slotProps={{
        paper: {
          sx: styles.dialogPaper
        }
      }}
    >
      <Box sx={styles.header}>
        <Box sx={styles.headerContent}>
          <Box sx={styles.headerDot} />
          Game Statistics
        </Box>
        <IconButton 
          onClick={onClose} 
          size="small" 
          sx={styles.closeButton}
        >
          <CloseIcon sx={{ fontSize: 24 }} />
        </IconButton>
      </Box>

      <Box sx={styles.content}>
        <Box sx={styles.mainContainer}>
          <Box sx={styles.gridContainer}>
            {/* Chart Section */}
            <Box sx={styles.sectionContainer}>
              <Box sx={styles.sectionHeader}>
                <Box sx={styles.chartDot} />
                <Typography sx={styles.sectionTitle}>
                  Game Cost Over Time
                </Typography>
              </Box>
              <Box sx={styles.chartContainer}>
                <PriceChart />
              </Box>
            </Box>
            
            {/* Table Section */}
            <Box sx={styles.sectionContainer}>
              <Box sx={styles.sectionHeader}>
                <Box sx={styles.tableDot} />
                <Typography sx={styles.sectionTitle}>
                  King Beasts
                </Typography>
              </Box>
              <Box sx={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Beast</th>
                      <th style={styles.tableHeader}>Power</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBeasts.map((beast: any, i: number) => (
                      <tr key={beast.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{beast.name}</td>
                        <td style={styles.tableCellPower}>{beast.power}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

const styles = {
  dialogPaper: {
    borderRadius: 4,
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
    border: '1px solid rgba(255, 224, 130, 0.2)',
    p: 0,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 224, 130, 0.1)',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 224, 130, 0.5) 50%, transparent 100%)',
    }
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(135deg, rgba(255, 224, 130, 0.1) 0%, rgba(255, 224, 130, 0.05) 100%)',
    color: '#ffe082',
    fontWeight: 600,
    fontSize: '1.3rem',
    p: 2,
    px: 3,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255, 224, 130, 0.2)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #ffe082, #ffb74d)',
    boxShadow: '0 0 10px rgba(255, 224, 130, 0.5)'
  },
  closeButton: {
    color: '#ffe082',
    ml: 2,
    '&:hover': {
      background: 'rgba(255, 224, 130, 0.1)',
      transform: 'scale(1.1)',
    },
    transition: 'all 0.2s ease'
  },
  content: {
    p: 3,
    background: 'linear-gradient(135deg, rgba(255, 224, 130, 0.02) 0%, rgba(255, 224, 130, 0.01) 100%)'
  },
  mainContainer: {
    mb: 4
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 4,
    alignItems: 'start',
    minHeight: 0
  },
  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '330px'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    mb: 2
  },
  chartDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #ffe082, #ffb74d)',
    boxShadow: '0 0 8px rgba(255, 224, 130, 0.4)',
    flexShrink: 0
  },
  tableDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)',
    boxShadow: '0 0 8px rgba(255, 107, 107, 0.4)',
    flexShrink: 0
  },
  sectionTitle: {
    color: '#ffe082',
    fontWeight: 700,
    fontSize: '1.2rem',
    letterSpacing: 0.5,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    flexShrink: 0
  },
  chartContainer: {
    width: '100%',
    minHeight: 280,
    maxHeight: 320,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
    borderRadius: 3,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 224, 130, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    p: 3,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 3,
      background: 'linear-gradient(135deg, rgba(255, 224, 130, 0.05) 0%, transparent 50%, rgba(255, 224, 130, 0.02) 100%)',
      pointerEvents: 'none',
    }
  },
  tableContainer: {
    width: '100%',
    minHeight: 280,
    maxHeight: 320,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
    borderRadius: 3,
    border: '1px solid rgba(255, 224, 130, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    boxSizing: 'border-box',
    p: 2,
    overflow: 'auto',
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 3,
      background: 'linear-gradient(135deg, rgba(255, 224, 130, 0.05) 0%, transparent 50%, rgba(255, 224, 130, 0.02) 100%)',
      pointerEvents: 'none',
    }
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: 'fit-content'
  },
  tableHeader: {
    color: '#ffe082',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '12px 16px',
    textAlign: 'left' as const,
    borderBottom: '2px solid rgba(255, 224, 130, 0.3)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    transition: 'all 0.2s ease'
  },
  tableCell: {
    color: '#fff',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontWeight: 500,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    whiteSpace: 'nowrap'
  },
  tableCellTier: {
    color: '#4fc3f7',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontWeight: 600,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    whiteSpace: 'nowrap'
  },
  tableCellPower: {
    color: '#ffb74d',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontWeight: 600,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    whiteSpace: 'nowrap'
  }
}; 