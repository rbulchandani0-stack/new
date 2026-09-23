import React, { createContext, useContext, useState, useEffect } from 'react';
import { MarketAsset } from '../types';
import { apiService } from '../services/api';

const DEFAULT_ASSETS: MarketAsset[] = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', price: 92450.00, change24h: 2.45, high24h: 93800, low24h: 89900, volume24h: 1240000000, category: 'crypto', leverageMax: 100 },
  { symbol: 'ETH/USDT', name: 'Ethereum', price: 3420.50, change24h: -1.15, high24h: 3510, low24h: 3380, volume24h: 680000000, category: 'crypto', leverageMax: 75 },
  { symbol: 'SOL/USDT', name: 'Solana', price: 184.20, change24h: 5.80, high24h: 189, low24h: 172, volume24h: 420000000, category: 'crypto', leverageMax: 50 },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0850, change24h: 0.12, high24h: 1.0890, low24h: 1.0820, volume24h: 950000000, category: 'forex', leverageMax: 200 },
  { symbol: 'XAU/USD', name: 'Gold Spot', price: 2745.80, change24h: 0.85, high24h: 2760, low24h: 2730, volume24h: 530000000, category: 'commodities', leverageMax: 100 },
  { symbol: 'US500', name: 'S&P 500 Index', price: 5890.20, change24h: 0.42, high24h: 5910, low24h: 5860, volume24h: 890000000, category: 'indices', leverageMax: 50 }
];

interface MarketContextType {
  assets: MarketAsset[];
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedAsset: MarketAsset;
  refreshMarkets: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<MarketAsset[]>(DEFAULT_ASSETS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USDT');

  const refreshMarkets = async () => {
    try {
      const res = await apiService.getMarkets();
      if (res?.assets && res.assets.length > 0) {
        setAssets(res.assets);
      }
    } catch (e) {
      // Keep default assets
    }
  };

  useEffect(() => {
    refreshMarkets();
    const interval = setInterval(() => {
      // Simulate slight micro-price movement
      setAssets(prev =>
        prev.map(a => {
          const delta = (Math.random() - 0.49) * (a.price * 0.001);
          return {
            ...a,
            price: Number((a.price + delta).toFixed(a.price < 10 ? 4 : 2))
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const selectedAsset = assets.find(a => a.symbol === selectedSymbol) || assets[0] || DEFAULT_ASSETS[0];

  return (
    <MarketContext.Provider value={{ assets, selectedSymbol, setSelectedSymbol, selectedAsset, refreshMarkets }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
};
