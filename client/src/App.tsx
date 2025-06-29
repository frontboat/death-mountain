import Box from '@mui/material/Box';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { BrowserRouter, Route, Routes, } from "react-router-dom";

import { ControllerProvider } from '@/contexts/controller';
import { SoundProvider } from '@/contexts/Sound';
import { GameDirector } from '@/desktop/contexts/GameDirector';
import { GameDirector as MobileGameDirector } from '@/mobile/contexts/GameDirector';
import { isBrowser, isMobile } from 'react-device-detect';
import GameSettings from './mobile/components/GameSettings';
import GameSettingsList from './mobile/components/GameSettingsList';
import Header from './mobile/components/Header';
import { desktopRoutes, mobileRoutes } from './utils/routes';
import { desktopTheme, mobileTheme } from './utils/themes';

function App() {
  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <SnackbarProvider anchorOrigin={{ vertical: 'top', horizontal: 'center' }} preventDuplicate autoHideDuration={3000}>
          <ControllerProvider>

            {isBrowser && (
              <ThemeProvider theme={desktopTheme}>
                <SoundProvider>
                  <GameDirector>
                    <Box className='main'>

                      <Routes>
                        {desktopRoutes.map((route, index) => {
                          return <Route key={index} path={route.path} element={route.content} />
                        })}
                      </Routes>

                    </Box>
                  </GameDirector>
                </SoundProvider>
              </ThemeProvider>
            )}

            {isMobile && (
              <ThemeProvider theme={mobileTheme}>
                <Box className='bgImage'>
                  <SoundProvider>
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
                      </Box>
                    </MobileGameDirector>
                  </SoundProvider>
                </Box>
              </ThemeProvider>
            )}

          </ControllerProvider>
        </SnackbarProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  );
}

export default App;
