import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
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
  gap: theme.spacing(0.5),
}));

const FloatingButton = styled(IconButton)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: 16,
  border: '2px solid #083e22',
  backgroundColor: 'rgba(21, 53, 33, 0.9)',
  boxShadow: '0 8px 16px rgba(0,0,0,0.45)',
  color: '#d0c98d',
  backdropFilter: 'blur(6px)',
  '&:hover': {
    backgroundColor: 'rgba(31, 83, 49, 0.95)',
  },
}));

interface ChatToggleProps {
  onClick: () => void;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({ onClick }) => {
  return (
    <Container>
      <Tooltip title="Ask wat do?" placement="top">
        <FloatingButton onClick={onClick} size="large">
          <ChatIcon />
        </FloatingButton>
      </Tooltip>
      <Typography sx={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d0c98d', fontSize: '0.7rem', letterSpacing: 1.2, textTransform: 'uppercase' }}>
        wat do?
      </Typography>
    </Container>
  );
};
