import GamePage from "@/desktop/pages/GamePage";
import LandingPage from "@/desktop/pages/StartPage";

import { default as MobileCampaignPage } from "@/mobile/pages/CampaignPage";
import { default as MobileGamePage } from "@/mobile/pages/GamePage";
import { default as MobileStartPage } from "@/mobile/pages/StartPage";
import { default as MobileWatchPage } from "@/mobile/pages/WatchPage";

export const desktopRoutes = [
  {
    path: '/',
    content: <LandingPage />
  },
  {
    path: '/play',
    content: <GamePage />
  },
]

export const mobileRoutes = [
  {
    path: '/',
    content: <MobileStartPage />
  },
  {
    path: '/play',
    content: <MobileGamePage />
  },
  {
    path: '/watch',
    content: <MobileWatchPage />
  },
  {
    path: '/campaign',
    content: <MobileCampaignPage />
  }
]