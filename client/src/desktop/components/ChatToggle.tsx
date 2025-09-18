import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { styled } from '@mui/material/styles';

const Container = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 20,
  left: 196,
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const FloatingButton = styled(IconButton)(() => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: 'none',
  backgroundColor: 'transparent',
  boxShadow: 'none',
  color: '#d0c98d',
  '&:hover': {
    backgroundColor: 'transparent',
  },
}));

interface ChatToggleProps {
  onClick: () => void;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({ onClick }) => {
  return (
    <Container>
      <FloatingButton onClick={onClick} size="small">
        <ChatIcon />
      </FloatingButton>
      <Typography sx={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d0c98d', fontSize: '0.7rem', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: '2px', lineHeight: '0.9', textAlign: 'center' }}>
        wat do?
      </Typography>
    </Container>
  );
};
