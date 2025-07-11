import { getPriceChart, getSwapQuote } from "@/api/ekubo";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

export interface StatisticsContext {
  gamePrice: string | null;
  gamePriceHistory: any[];
}

// Create a context
const StatisticsContext = createContext<StatisticsContext>({} as StatisticsContext);

const EKUBO = '0x075afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87'
const USDC = '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8'

// Create a provider component
export const StatisticsProvider = ({ children }: PropsWithChildren) => {
  const [gamePrice, setGamePrice] = useState<string | null>(null);
  const [gamePriceHistory, setGamePriceHistory] = useState<any[]>([]);

  const fetchPriceHistory = async () => {
    const priceHistory = await getPriceChart(EKUBO, USDC);
    setGamePriceHistory(priceHistory.data);
  }

  const fetchGamePrice = async () => {
    const swap = await getSwapQuote(-1e18, EKUBO, USDC);
    setGamePrice((swap.total * -1 / 1e6).toFixed(2));
  }

  useEffect(() => {
    fetchPriceHistory();
    fetchGamePrice();
  }, []);

  return (
    <StatisticsContext.Provider value={{
      gamePrice,
      gamePriceHistory
    }}>
      {children}
    </StatisticsContext.Provider>
  );
};

export const useStatistics = () => {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error('useStatistics must be used within a StatisticsProvider');
  }
  return context;
};

