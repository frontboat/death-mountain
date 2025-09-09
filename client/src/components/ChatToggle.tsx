import React from 'react';
import { Fab } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { styled } from '@mui/material/styles';

const StyledFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  backgroundColor: 'rgba(76, 175, 80, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(76, 175, 80, 1)',
  },
}));

interface ChatToggleProps {
  onClick: () => void;
}

export const ChatToggle: React.FC<ChatToggleProps> = ({ onClick }) => {
  return (
    <StyledFab color="primary" aria-label="chat" onClick={onClick}>
      <ChatIcon />
    </StyledFab>
  );
};