import { useController } from '@/contexts/controller';
import discordIcon from '@/desktop/assets/images/discord.png';
import AdventurersList from '@/desktop/components/AdventurersList';
import Settings from '@/desktop/components/Settings';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import WalletConnect from '@/desktop/components/WalletConnect';
import { getMenuLeftOffset } from '@/utils/utils';
import TokenIcon from '@mui/icons-material/Token';
import GitHubIcon from '@mui/icons-material/GitHub';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import practiceIcon from '@/desktop/assets/images/practice.png';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { BEAST_NAMES } from '@/constants/beast';
import { useMemo } from 'react';
import StatisticsModal from './StatisticsModal';
import IconButton from '@mui/material/IconButton';
import XIcon from '@mui/icons-material/X';

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

// Dummy King Beasts data (strongest of each type)
const kingBeasts = [
  { name: BEAST_NAMES[29], power: 320 }, // Dragon
  { name: BEAST_NAMES[54], power: 310 }, // Leviathan
  { name: BEAST_NAMES[58], power: 305 }, // Behemoth
  { name: BEAST_NAMES[2], power: 300 },  // Typhon
  { name: BEAST_NAMES[55], power: 299 }, // Tarrasque
];

// Simple SVG line chart for dummy data
function PriceChart() {
  const width = 600;
  const height = 220;
  const padding = 40;
  const points = dummyPriceData.map((d, i) => [
    padding + i * ((width - 2 * padding) / (dummyPriceData.length - 1)),
    height - padding - ((d.price - 1) / 0.52) * (height - 2 * padding)
  ]);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  return (
    <svg width={width} height={height} style={{ width: '100%', maxWidth: 600, display: 'block' }}>
      <rect x={0} y={0} width={width} height={height} fill="none" />
      {/* Axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#444" strokeWidth={2} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#444" strokeWidth={2} />
      {/* Path */}
      <path d={path} fill="none" stroke="#ffe082" strokeWidth={3} />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4} fill="#d0c98d" />
      ))}
      {/* Labels */}
      {dummyPriceData.map((d, i) => (
        <text key={i} x={points[i][0]} y={height - padding + 18} textAnchor="middle" fontSize="12" fill="#b0b0b0">{d.time}</text>
      ))}
      {/* Y-axis labels */}
      {[1, 1.2, 1.4, 1.52].map((v, i) => (
        <text key={i} x={padding - 10} y={height - padding - ((v - 1) / 0.52) * (height - 2 * padding) + 4} textAnchor="end" fontSize="12" fill="#b0b0b0">${v.toFixed(2)}</text>
      ))}
    </svg>
  );
}

export default function MainMenu() {
  const navigate = useNavigate();
  const { address, isPending, playAsGuest } = useController();
  const [showAdventurers, setShowAdventurers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [left, setLeft] = useState(getMenuLeftOffset());

  useEffect(() => {
    function handleResize() {
      setLeft(getMenuLeftOffset());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStartGame = () => {
    navigate(`/survivor/play`);
  };

  return (
    <Box sx={{ ...styles.container, left: `${left + 32}px` }}>
      <AnimatePresence mode="wait">
        {showAdventurers && <AdventurersList onBack={() => setShowAdventurers(false)} />}
        {showSettings && <Settings onBack={() => setShowSettings(false)} />}

        {!showAdventurers && !showSettings && (
          <>
            <Box sx={styles.headerBox}>
              <Typography sx={styles.gameTitle}>
                LOOT SURVIVOR 2
              </Typography>
              <Typography color="secondary" sx={styles.modeTitle}>
                Beast Mode
              </Typography>
            </Box>

            <Button
              disabled={!address}
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleStartGame}
              sx={{ px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TokenIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: 0.5, color: !address ? 'rgba(255, 255, 255, 0.3)' : '#d0c98d' }}>
                  New Game
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.85rem', color: '#b0b0b0', fontWeight: 400, ml: 1 }}>
                ~$1.52
              </Typography>
            </Button>

            <Button
              disabled={!address}
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setShowAdventurers(true)}
              sx={{ pl: 1 }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: 0.5, color: !address ? 'rgba(255, 255, 255, 0.3)' : '#d0c98d' }}>
                My Adventurers
              </Typography>
            </Button>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setShowSettings(true)}
              sx={{ px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <img src={practiceIcon} alt="Practice" style={{ width: 20, height: 20, marginRight: '8px' }} />
                <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
                  Practice Game
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.80rem', color: '#b0b0b0', fontWeight: 400, ml: 1 }}>
                Free
              </Typography>
            </Button>

            <Divider sx={{ width: '100%', my: 0.5 }} />

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setShowSettings(true)}
              sx={{ pl: 1 }}
            >
              <SettingsOutlinedIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
                Settings
              </Typography>
            </Button>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setShowStats(true)}
              sx={{ px: 1 }}
            >
              <BarChartIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
                Statistics
              </Typography>
            </Button>

            <Box sx={styles.bottom}>
              <Stack spacing={0.5} sx={{ width: '100%', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
                    Beasts Collected
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#d0c98d', fontVariantNumeric: 'tabular-nums' }}>
                    4,500 / 93,500
                  </Typography>
                </Box>
                <Box sx={{
                  width: '100%',
                  height: 12,
                  borderRadius: 6,
                  border: '2px solid #d0c98d50', // gold border
                  background: '#16281a', // dark green background
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                  <LinearProgress
                    variant="determinate"
                    value={4500 / 93500 * 100}
                    sx={{
                      width: '100%',
                      height: '100%',
                      background: 'transparent',
                      '& .MuiLinearProgress-bar': {
                        background: '#ffe082', // yellow progress
                        borderRadius: 6,
                      },
                    }}
                  />
                </Box>
              </Stack>
              <WalletConnect />

              <Box sx={styles.bottomRow}>
                <Typography sx={styles.alphaVersion}>
                  ALPHA VERSION 0.0.1
                </Typography>
                <Box sx={styles.socialButtons}>
                  <IconButton size="small" sx={styles.socialButton} onClick={() => window.open('https://x.com/lootsurvivor', '_blank')}>
                    <XIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                  <IconButton size="small" sx={styles.socialButton} onClick={() => window.open('https://discord.com/channels/884211910222970891/1249816798971560117', '_blank')}>
                    <img src={discordIcon} alt="Discord" style={{ width: 20, height: 20 }} />
                  </IconButton>
                  <IconButton size="small" sx={styles.socialButton} onClick={() => window.open('https://github.com/provable-games/loot-survivor-2', '_blank')}>
                    <GitHubIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </AnimatePresence>
      <StatisticsModal open={showStats} onClose={() => setShowStats(false)} />
    </Box>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 32,
    width: 310,
    minHeight: 600,
    bgcolor: 'rgba(24, 40, 24, 0.55)',
    border: '2px solid #083e22',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    px: 2,
    py: 2,
    zIndex: 10,
    gap: 1,
  },
  headerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    mb: 2,
    mt: 2,
  },
  gameTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 1.1,
    mb: 0.5,
  },
  modeTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 1.1,
    mb: 0.5,
  },
  modeDescription: {
    fontSize: '1.1rem',
    fontWeight: 400,
    color: '#b6ffb6',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadow: '0 1px 2px #0f0',
    mb: 1,
  },
  icon: {
    mr: 1,
  },
  bottom: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    mt: 'auto',
    gap: 1,
    width: '100%',
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  socialButtons: {
    display: 'flex',
    gap: 0.5,
  },
  socialButton: {
    color: '#d0c98d',
    opacity: 0.8,
    '&:hover': {
      opacity: 1,
    },
    padding: '4px',
  },
  alphaVersion: {
    fontSize: '0.7rem',
    opacity: 0.8,
    letterSpacing: 1,
  },
  orDivider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  orText: {
    margin: '0 1rem',
    fontSize: '0.8rem',
    opacity: 0.8,
    textAlign: 'center',
  },
};
