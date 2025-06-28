import diceIcon from '../assets/images/dice.png';
import logo from '../assets/images/logo.png';
import GameTokensList from '../components/GameTokensList';
import { useController } from '../contexts/controller';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const { address } = useController();
  const navigate = useNavigate();

  const handleStartGame = async () => {
    navigate(`/play`)
  };

  return (
    <>
      <Box sx={styles.container}>
        <Box sx={styles.logoContainer}>
          <img src={logo} alt='logo' width='100%' />
        </Box>

        <Box className='container' sx={{ width: '100%', gap: 2, textAlign: 'center' }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleStartGame}
            startIcon={<img src={diceIcon} alt='dice' height='20px' />}
          >
            <Typography variant='h5' color='#111111'>
              Play now
            </Typography>
          </Button>

          {address && <>
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
              <ArrowDropDownIcon color='primary' />
              <Typography variant='h4' color='primary'>
                Adventurers
              </Typography>
              <ArrowDropDownIcon color='primary' />
            </Box>

            <GameTokensList />
          </>}
        </Box>
      </Box>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '500px',
    height: 'calc(100dvh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    padding: '10px',
    margin: '0 auto',
    gap: 2
  },
  logoContainer: {
    maxWidth: '70%',
    mb: 2
  },
};