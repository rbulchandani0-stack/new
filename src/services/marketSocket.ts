import { MarketPair } from '../types';

export type PriceUpdateListener = (
  symbol: string, 
  newPrice: number, 
  change24h: number, 
  direction?: 'up' | 'down',
  extraStats?: { high24h?: number; low24h?: number; volume24h?: number }
) => void;

interface MarketPriceState {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastDirection?: 'up' | 'down';
}

class MarketSocketService {
  private listeners: PriceUpdateListener[] = [];
  private tickInterval: any = null;
  private apiPollInterval: any = null;
  private ws: WebSocket | null = null;
  private pricesMap: Record<string, MarketPriceState> = {
    'BTC/USDT': { price: 94850.50, change24h: 3.42, high24h: 96120.00, low24h: 92400.00, volume24h: 4285090000 },
    'ETH/USDT': { price: 3420.25, change24h: -1.15, high24h: 3510.00, low24h: 3380.00, volume24h: 2150800000 },
    'SOL/USDT': { price: 188.75, change24h: 7.84, high24h: 194.20, low24h: 172.50, volume24h: 1890400000 },
    'BNB/USDT': { price: 645.10, change24h: 0.92, high24h: 658.00, low24h: 638.50, volume24h: 680200000 },
    'DOGE/USDT': { price: 0.385, change24h: 12.45, high24h: 0.412, low24h: 0.338, volume24h: 940100000 },
    'XRP/USDT': { price: 2.34, change24h: 4.18, high24h: 2.48, low24h: 2.21, volume24h: 1420900000 },
    'XAU/USD': { price: 2685.50, change24h: 1.25, high24h: 2702.50, low24h: 2668.10, volume24h: 12850000000 },
    'XAG/USD': { price: 29.45, change24h: 2.18, high24h: 30.10, low24h: 28.80, volume24h: 3450000000 },
    'EUR/GBP': { price: 0.8524, change24h: 0.35, high24h: 0.8560, low24h: 0.8495, volume24h: 8900000000 },
    'EUR/USD': { price: 1.0892, change24h: -0.18, high24h: 1.0930, low24h: 1.0865, volume24h: 18400000000 },
    'GBP/USD': { price: 1.2915, change24h: 0.42, high24h: 1.2960, low24h: 1.2870, volume24h: 14200000000 },
    'USD/JPY': { price: 156.42, change24h: 0.65, high24h: 157.20, low24h: 155.80, volume24h: 16500000000 },
    'USD/INR': { price: 95.00, change24h: 0.12, high24h: 95.50, low24h: 94.80, volume24h: 5200000000 },
    'WTI/USD': { price: 76.85, change24h: -0.92, high24h: 78.20, low24h: 75.90, volume24h: 8900000000 },
    'US500/USD': { price: 5860.20, change24h: 0.85, high24h: 5890.00, low24h: 5820.00, volume24h: 15400000000 },
    'NAS100/USD': { price: 20450.80, change24h: 1.42, high24h: 20600.00, low24h: 20280.00, volume24h: 18200000000 },
    'US30/USD': { price: 43210.50, change24h: 0.38, high24h: 43400.00, low24h: 43050.00, volume24h: 12100000000 },
    'NIFTY/INR': { price: 24850.00, change24h: 0.95, high24h: 25020.00, low24h: 24680.00, volume24h: 8400000000 }
  };

  constructor() {
    this.fetchLivePricesFromAPIs();
    this.initBinanceWebSocket();
    this.startContinuousTickEngine();
    
    // Periodically re-sync base prices with live REST APIs every 2s
    this.apiPollInterval = setInterval(() => {
      this.fetchLivePricesFromAPIs();
    }, 2000);
  }

  // Fetch real-time live prices from backend single-source-of-truth
  private async fetchLivePricesFromAPIs() {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const symbol = item.symbol;
            const newPrice = item.price;
            const change24h = item.change24h;
            const high24h = item.high24h;
            const low24h = item.low24h;
            const volume24h = item.volume24h;
            const direction = item.priceDirection || 'up';

            this.pricesMap[symbol] = {
              price: newPrice,
              change24h,
              high24h,
              low24h,
              volume24h,
              lastDirection: direction
            };

            this.notifyListeners(symbol, newPrice, change24h, direction, { high24h, low24h, volume24h });
          });
        }
      }
    } catch (err) {
      // Silently ignore fetch errors during dev server restarts
    }
  }

  // Connect WebSocket for streaming Crypto ticks
  private initBinanceWebSocket() {
    // Disabled in favor of backend API polling for perfect synchronization
  }

  // Continuous micro-tick engine to simulate active exchange order book liquidity
  private startContinuousTickEngine() {
    // Disabled in favor of backend continuous ticker engine
  }

  public subscribe(listener: PriceUpdateListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(
    symbol: string, 
    newPrice: number, 
    change24h: number, 
    direction?: 'up' | 'down',
    extraStats?: { high24h?: number; low24h?: number; volume24h?: number }
  ) {
    this.listeners.forEach(l => l(symbol, newPrice, change24h, direction, extraStats));
  }
}

export const marketSocket = new MarketSocketService();

