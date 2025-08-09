import { useController } from '@/contexts/controller';
import { useDynamicConnector } from '@/contexts/starknet';
import discordIcon from '@/desktop/assets/images/discord.png';
import AdventurersList from '@/desktop/components/AdventurersList';
import Settings from '@/desktop/components/Settings';
import { useSystemCalls } from '@/dojo/useSystemCalls';
import { ChainId } from '@/utils/networkConfig';
import { getMenuLeftOffset } from '@/utils/utils';
import GitHubIcon from '@mui/icons-material/GitHub';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import TokenIcon from '@mui/icons-material/Token';
import XIcon from '@mui/icons-material/X';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useAccount } from '@starknet-react/core';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Network from '../components/Network';
import WalletConnect from '../components/WalletConnect';
import StatisticsModal from './StatisticsModal';

export default function MainMenu() {
  const navigate = useNavigate();
  const { account } = useAccount();
  const { login, playerName } = useController();
  const { currentNetworkConfig } = useDynamicConnector();
  const { buyGame } = useSystemCalls();
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

  const handleBuyGame = async () => {
    if (!account) {
      login();
      return;
    }

    let gameId = await buyGame({ paymentType: 'Ticket' }, playerName);
    navigate(`/survivor/play?id=${gameId}`);
  };

  const handleStartGame = () => {
    if (currentNetworkConfig.chainId === ChainId.SN_SEPOLIA) {
      handleBuyGame();
    } else {
      navigate(`/survivor/play`);
    }
  };

  const handleShowAdventurers = () => {
    if (currentNetworkConfig.chainId === ChainId.SN_SEPOLIA && !account) {
      login();
      return;
    }

    setShowAdventurers(true);
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
                {currentNetworkConfig.name}
              </Typography>
            </Box>

            {/* <PriceIndicator /> */}

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleStartGame}
              sx={{ px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '36px', mt: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TokenIcon sx={{ fontSize: 20, mr: 1 }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: 0.5, color: '#d0c98d' }}>
                  New Game
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={handleShowAdventurers}
              sx={{ pl: 1, height: '36px' }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: 0.5, color: '#d0c98d' }}>
                My Adventurers
              </Typography>
            </Button>

            <Divider sx={{ width: '100%', my: 0.5 }} />

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setShowSettings(true)}
              sx={{ pl: 1, height: '36px' }}
            >
              <SettingsOutlinedIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
                Settings
              </Typography>
            </Button>

            {/* <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setShowStats(true)}
              sx={{ px: 1, height: '36px' }}
              disabled={true}
            >
              <BarChartIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 500, letterSpacing: 0.5 }}>
                Statistics
              </Typography>
            </Button> */}

            <Box sx={styles.bottom}>
              <Network />
              <WalletConnect />

              {/* {currentNetworkConfig.name === "Beast Mode" && <Stack spacing={0.5} sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#d0c98d', fontWeight: 500, letterSpacing: 0.5 }}>
                    Beasts Collected
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#d0c98d', fontVariantNumeric: 'tabular-nums' }}>
                    4,686 / 93,150
                  </Typography>
                </Box>
                <Box sx={{
                  width: '99%',
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
                    value={4686 / 93150 * 100}
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
              </Stack>} */}

              <Box sx={styles.bottomRow}>
                <Typography sx={styles.alphaVersion}>
                  Provable Games
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
    py: 1,
    zIndex: 10,
    gap: 1,
  },
  headerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    mt: 2,
    mb: 0.5,
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
    gap: 0.5,
    width: '100%',
  },
  bottomRow: {
    mt: 0.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '99%',
    mr: -1
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
