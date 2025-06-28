import GamePage from "../desktop/pages/GamePage";
import LandingPage from "../desktop/pages/StartPage";

export const routes = [
  {
    path: '/',
    content: <LandingPage />
  },
  {
    path: '/play',
    content: <GamePage />
  },
]