import Box from '@mui/material/Box';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { BrowserRouter, Route, Routes, } from "react-router-dom";
import { useState } from 'react';

import { ControllerProvider } from '@/contexts/controller';
import { SoundProvider } from '@/desktop/contexts/Sound';
import { SoundProvider as MobileSoundProvider } from '@/mobile/contexts/Sound';
import { GameDirector } from '@/desktop/contexts/GameDirector';
import { GameDirector as MobileGameDirector } from '@/mobile/contexts/GameDirector';
import { useUIStore } from '@/stores/uiStore';
import { isBrowser, isMobile } from 'react-device-detect';
import GameSettings from './mobile/components/GameSettings';
import GameSettingsList from './mobile/components/GameSettingsList';
import Header from './mobile/components/Header';
import { desktopRoutes, mobileRoutes } from './utils/routes';
import { desktopTheme, mobileTheme } from './utils/themes';
import { StatisticsProvider } from './contexts/Statistics';
import { ChatBox } from './components/ChatBox';
import { ChatToggle } from './components/ChatToggle';

function App() {
  const { useMobileClient } = useUIStore();
  const shouldShowMobile = isMobile || (isBrowser && useMobileClient);
  const [showChat, setShowChat] = useState(false);

  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <SnackbarProvider anchorOrigin={{ vertical: 'top', horizontal: 'center' }} preventDuplicate autoHideDuration={3000}>
          <ControllerProvider>
            <StatisticsProvider>

              {!shouldShowMobile && (
                <ThemeProvider theme={desktopTheme}>
                  <SoundProvider>
                    <GameDirector>
                      <Box className='main'>

                        <Routes>
                          {desktopRoutes.map((route, index) => {
                            return <Route key={index} path={route.path} element={route.content} />
                          })}
                        </Routes>

                        {showChat ? (
                          <ChatBox onClose={() => setShowChat(false)} />
                        ) : (
                          <ChatToggle onClick={() => setShowChat(true)} />
                        )}

                      </Box>
                    </GameDirector>
                  </SoundProvider>
                </ThemeProvider>
              )}

              {shouldShowMobile && (
                <ThemeProvider theme={mobileTheme}>
                  <MobileSoundProvider>
                    <Box className='bgImage'>
                      <MobileGameDirector>
                        <Box className='main'>
                          <Header />

                          <Routes>
                            {mobileRoutes.map((route, index) => {
                              return <Route key={index} path={route.path} element={route.content} />
                            })}
                          </Routes>

                          <GameSettingsList />
                          <GameSettings />

                          {showChat ? (
                            <ChatBox onClose={() => setShowChat(false)} />
                          ) : (
                            <ChatToggle onClick={() => setShowChat(true)} />
                          )}
                        </Box>
                      </MobileGameDirector>
                    </Box>
                  </MobileSoundProvider>
                </ThemeProvider>
              )}

            </StatisticsProvider>
          </ControllerProvider>
        </SnackbarProvider>
      </StyledEngineProvider>
    </BrowserRouter >
  );
}

export default App;
