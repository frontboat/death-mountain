import Box from '@mui/material/Box';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { BrowserRouter, Route, Routes, } from "react-router-dom";

import { isBrowser, isMobile } from 'react-device-detect';
import { ControllerProvider } from './desktop/contexts/controller';
import { GameDirector } from './desktop/contexts/GameDirector';
import { SoundProvider } from './desktop/contexts/Sound';
import GameSettings from './mobile/components/GameSettings';
import GameSettingsList from './mobile/components/GameSettingsList';
import Header from './mobile/components/Header';
import { routes } from './utils/routes';
import { mainTheme } from './utils/themes';

function App() {
  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <SnackbarProvider anchorOrigin={{ vertical: 'top', horizontal: 'center' }} preventDuplicate autoHideDuration={3000}>
          <ControllerProvider>

            {isBrowser && (
              <ThemeProvider theme={mainTheme}>
                <SoundProvider>
                  <GameDirector>
                    <Box className='main'>

                      <Routes>
                        {routes.map((route, index) => {
                          return <Route key={index} path={route.path} element={route.content} />
                        })}
                      </Routes>

                    </Box>
                  </GameDirector>
                </SoundProvider>
              </ThemeProvider>
            )}

            {isMobile && (
              <ThemeProvider theme={mainTheme}>
                <Box className='bgImage'>
                  <SoundProvider>
                    <GameDirector>
                      <Box className='main'>
                        <Header />

                        <Routes>
                          {routes.map((route, index) => {
                            return <Route key={index} path={route.path} element={route.content} />
                          })}
                        </Routes>

                        <GameSettingsList />
                        <GameSettings />
                      </Box>
                    </GameDirector>
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
