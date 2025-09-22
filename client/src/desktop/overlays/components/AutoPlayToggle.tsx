import { Button, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useGameStore } from '@/stores/gameStore';
import { useGameDirector } from '@/desktop/contexts/GameDirector';

const styles = {
  button: {
    border: '2px solid rgba(110, 140, 255, 0.35)',
    background: 'rgba(24, 29, 40, 0.9)',
    minWidth: '220px',
    height: '48px',
    justifyContent: 'center',
    borderRadius: '8px',
    marginRight: '16px',
    '&:hover': {
      border: '2px solid rgba(110, 140, 255, 0.55)',
      background: 'rgba(34, 44, 68, 0.95)',
    },
    '&:disabled': {
      opacity: 0.5,
      boxShadow: 'none',
    },
  },
  label: {
    fontFamily: 'Cinzel, Georgia, serif',
    fontWeight: 600,
    fontSize: '1.1rem',
    color: '#d0c98d',
    letterSpacing: '1px',
  },
};

export default function AutoPlayToggle() {
  const autoPlayEnabled = useGameStore((state) => state.autoPlayEnabled);
  const setAutoPlayEnabled = useGameStore((state) => state.setAutoPlayEnabled);
  const agentRunning = useGameStore((state) => state.agentRunning);
  const { spectating } = useGameDirector();
  const { enqueueSnackbar } = useSnackbar();
  const isActive = autoPlayEnabled || agentRunning;

  const handleToggle = () => {
    if (autoPlayEnabled) {
      setAutoPlayEnabled(false);
      return;
    }

    if (spectating) {
      enqueueSnackbar('Auto play is unavailable while spectating.', { variant: 'info' });
      return;
    }

    setAutoPlayEnabled(true);
  };

  return (
    <Button
      variant={autoPlayEnabled ? 'contained' : 'outlined'}
      onClick={handleToggle}
      sx={styles.button}
      disabled={spectating || (agentRunning && !autoPlayEnabled)}
    >
      <Typography sx={styles.label}>
        {agentRunning ? 'Auto Playing…' : autoPlayEnabled ? 'Stop Auto Play' : 'Auto Play'}
      </Typography>
      {agentRunning && <div className='dotLoader yellow' style={{ marginLeft: 8, opacity: 0.55 }} />}
    </Button>
  );
}
