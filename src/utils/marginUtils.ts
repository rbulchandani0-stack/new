import { Position, Transaction, MarketPair } from '../types';

/**
 * Standard reference exchange rates to USD when live pair prices are unavailable
 */
const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1,
  USDT: 1,
  USDC: 1,
  EUR: 1.0892,
  GBP: 1.2915,
  AUD: 0.6650,
  NZD: 0.6120,
  CAD: 0.7310, // ~ 1 / 1.3680
  CHF: 1.1250,
  JPY: 0.006393, // ~ 1 / 156.42
  INR: 0.010526, // ~ 1 / 95.00
  XAU: 2685.50,
  XAG: 29.45,
  BTC: 94850.50,
  ETH: 3420.25,
  SOL: 188.75,
  BNB: 645.10,
  XRP: 2.34,
  DOGE: 0.385,
  ADA: 0.884,
  AVAX: 36.80,
  LINK: 18.25,
  SUI: 3.45,
  US500: 5860.20,
  NAS100: 20450.80,
  US30: 43210.50,
  WTI: 76.85
};

export interface MarginCalculationParams {
  symbol?: string;
  quantity?: number;
  entryPrice?: number;
  leverage?: number;
  storedMargin?: number;
  marketPairs?: MarketPair[];
}

/**
 * Standard contract sizes (units per 1.00 standard lot)
 * - Forex: 100,000 base currency units (EUR, GBP, AUD, CAD, JPY, etc.)
 * - Gold (XAU): 100 troy ounces
 * - Silver (XAG): 5,000 troy ounces
 * - Crude Oil (WTI): 100 barrels
 * - Indices: 1 contract
 * - Crypto: 1 coin (e.g. 1 BTC, 1 ETH, 1 SOL)
 * - Stocks: 10 shares
 */
export function getContractSize(symbol?: string, category?: string): number {
  if (!symbol) return 1;
  const clean = symbol.trim().toUpperCase();

  // Explicit Forex list or Forex category
  const forexSymbols = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD', 'NZD/USD',
    'USD/CHF', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CAD', 'AUD/NZD', 'USD/INR'
  ];
  if (category?.toLowerCase() === 'forex' || forexSymbols.some(s => clean === s || clean === s.replace('/', ''))) {
    return 100000;
  }

  // Commodities
  if (clean.includes('XAU') || clean.includes('GOLD')) return 100;
  if (clean.includes('XAG') || clean.includes('SILVER')) return 5000;
  if (clean.includes('WTI') || clean.includes('OIL') || clean.includes('BRENT')) return 100;

  // Crypto
  if (category?.toLowerCase() === 'crypto' || clean.includes('BTC') || clean.includes('ETH') || clean.includes('SOL') || clean.includes('BNB') || clean.includes('DOGE') || clean.includes('XRP')) {
    return 1;
  }

  // Indices
  if (category?.toLowerCase() === 'indices' || clean.includes('US500') || clean.includes('NAS100') || clean.includes('US30') || clean.includes('NIFTY')) {
    return 1;
  }

  // Stocks
  if (category?.toLowerCase() === 'stocks') {
    return 10;
  }

  return 1;
}

/**
 * Converts Position Size in Lots to base units
 */
export function lotsToUnits(lots: number, symbol?: string, category?: string): number {
  const contract = getContractSize(symbol, category);
  return Number((lots * contract).toFixed(4));
}

/**
 * Converts base units to Position Size in Lots
 * Robust against legacy trades stored directly in lots or in base units
 */
export function unitsToLots(units: number, symbol?: string, category?: string): number {
  if (!units || units <= 0) return 0;
  const contract = getContractSize(symbol, category);
  if (contract === 1) {
    return Number(units.toFixed(4));
  }
  // If units is already small (e.g. user previously entered 0.1 or 1 for Forex), preserve as lots
  if (contract >= 1000 && units < 500) {
    return Number(units.toFixed(2));
  }
  const calculatedLots = units / contract;
  return Number(calculatedLots.toFixed(4));
}

/**
 * Extracts or derives authoritative Lots from a Position or Transaction
 */
export function getTradeLots(tradeOrPosition: any): number {
  if (!tradeOrPosition) return 0;
  if (typeof tradeOrPosition.lots === 'number' && !isNaN(tradeOrPosition.lots) && tradeOrPosition.lots > 0) {
    return tradeOrPosition.lots;
  }
  const symbol = tradeOrPosition.symbol || tradeOrPosition.currency || 'BTC/USDT';
  const size = tradeOrPosition.size !== undefined ? Number(tradeOrPosition.size) : (tradeOrPosition.quantity !== undefined ? Number(tradeOrPosition.quantity) : 0);
  return unitsToLots(size, symbol);
}

/**
 * Formats a lot size nicely (e.g. "1.00 Lot" or "3.0908 Lots", or "3.0908" if includeLabel=false)
 */
export function formatLots(lots?: number, symbol?: string, includeLabel = true): string {
  const l = (lots !== undefined && !isNaN(lots) && lots > 0) ? lots : 0;
  const lotStr = l.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
  if (!includeLabel) return lotStr;
  return l === 1 ? `${lotStr} Lot` : `${lotStr} Lots`;
}

/**
 * Parses a pair symbol into base and quote components (e.g., 'EUR/USD' -> base: 'EUR', quote: 'USD')
 */
export function parseSymbol(symbol?: string): { base: string; quote: string } {
  if (!symbol) return { base: 'BTC', quote: 'USDT' };
  const clean = symbol.trim().toUpperCase();
  if (clean.includes('/')) {
    const [base, quote] = clean.split('/');
    return { base: base.trim(), quote: quote.trim() };
  }
  if (clean.includes('-')) {
    const [base, quote] = clean.split('-');
    return { base: base.trim(), quote: quote.trim() };
  }
  if (clean.endsWith('USDT')) {
    return { base: clean.replace('USDT', ''), quote: 'USDT' };
  }
  if (clean.endsWith('USD')) {
    return { base: clean.replace('USD', ''), quote: 'USD' };
  }
  return { base: clean, quote: 'USD' };
}

/**
 * Calculates Notional Value in USD for any financial instrument
 * (Forex, Crypto, Commodities, Indices, Stocks across USD, EUR, GBP, AUD, JPY, CAD, CHF, NZD, INR pairs)
 */
export function calculateNotionalUSD(
  symbol: string,
  quantity: number,
  entryPrice: number,
  marketPairs?: MarketPair[]
): number {
  if (!quantity || quantity <= 0) return 0;
  const price = entryPrice > 0 ? entryPrice : 1;
  const { base, quote } = parseSymbol(symbol);

  // Case 1: Base currency is USD or USDT (e.g. USD/JPY, USD/CAD, USD/INR, USD/CHF)
  // In standard trading, quantity represents the USD base notional
  if (base === 'USD' || base === 'USDT' || base === 'USDC') {
    return quantity;
  }

  // Case 2: Quote currency is USD or USDT (e.g. BTC/USDT, EUR/USD, GBP/USD, AUD/USD, XAU/USD, US500/USD)
  if (quote === 'USD' || quote === 'USDT' || quote === 'USDC') {
    return quantity * price;
  }

  // Case 3: Cross currency pairs (e.g. EUR/GBP, EUR/JPY, NIFTY/INR)
  // Check if we have a direct Base-to-USD live pair
  if (marketPairs && marketPairs.length > 0) {
    const directBasePair = marketPairs.find(
      m => (m.baseCoin?.toUpperCase() === base && (m.quoteCoin?.toUpperCase() === 'USD' || m.quoteCoin?.toUpperCase() === 'USDT')) ||
           m.symbol.toUpperCase() === `${base}/USD` ||
           m.symbol.toUpperCase() === `${base}/USDT`
    );
    if (directBasePair && directBasePair.price > 0) {
      return quantity * directBasePair.price;
    }

    // Check if quote currency can be converted via Quote/USD or USD/Quote pair
    const quoteUsdPair = marketPairs.find(
      m => m.symbol.toUpperCase() === `${quote}/USD` || m.symbol.toUpperCase() === `${quote}/USDT`
    );
    if (quoteUsdPair && quoteUsdPair.price > 0) {
      return quantity * price * quoteUsdPair.price;
    }

    const usdQuotePair = marketPairs.find(
      m => m.symbol.toUpperCase() === `USD/${quote}` || m.symbol.toUpperCase() === `USDT/${quote}`
    );
    if (usdQuotePair && usdQuotePair.price > 0) {
      return (quantity * price) / usdQuotePair.price;
    }
  }

  // Fallback to static exchange rates
  if (DEFAULT_USD_RATES[base]) {
    return quantity * DEFAULT_USD_RATES[base];
  }

  if (DEFAULT_USD_RATES[quote]) {
    return quantity * price * DEFAULT_USD_RATES[quote];
  }

  // General fallback
  return quantity * price;
}

/**
 * Universal margin calculation system in USD:
 * MARGIN_USD = NOTIONAL_VALUE_USD / LEVERAGE
 *
 * Prioritizes original stored margin if valid; otherwise calculates dynamically.
 */
export function calculateMarginUSD(params: MarginCalculationParams): number {
  const { symbol = 'BTC/USDT', quantity = 0, entryPrice = 0, leverage = 1, storedMargin, marketPairs } = params;

  // If trade already has an authoritative stored margin from database, use it
  if (typeof storedMargin === 'number' && !isNaN(storedMargin) && storedMargin > 0) {
    return storedMargin;
  }

  if (quantity <= 0) return 0;

  const validLeverage = (!leverage || isNaN(leverage) || leverage <= 0) ? 1 : leverage;
  const notionalUSD = calculateNotionalUSD(symbol, quantity, entryPrice, marketPairs);
  const marginUSD = notionalUSD / validLeverage;

  return Number(marginUSD.toFixed(2));
}

/**
 * Derives margin in USD directly from any Position or Transaction object
 */
export function getTradeMarginUSD(
  tradeOrPosition: Position | Transaction | any,
  marketPairs?: MarketPair[]
): number {
  if (!tradeOrPosition) return 0;

  // 1. Check direct stored margin properties
  if (typeof tradeOrPosition.margin === 'number' && !isNaN(tradeOrPosition.margin) && tradeOrPosition.margin > 0) {
    return tradeOrPosition.margin;
  }
  if (typeof tradeOrPosition.marginUsed === 'number' && !isNaN(tradeOrPosition.marginUsed) && tradeOrPosition.marginUsed > 0) {
    return tradeOrPosition.marginUsed;
  }

  // 2. Extract trade attributes
  const symbol = tradeOrPosition.symbol || tradeOrPosition.currency || 'BTC/USDT';
  const quantity = tradeOrPosition.size !== undefined ? Number(tradeOrPosition.size) : (tradeOrPosition.quantity !== undefined ? Number(tradeOrPosition.quantity) : 0);
  const entryPrice = Number(tradeOrPosition.entryPrice) || Number(tradeOrPosition.price) || 0;
  const leverage = tradeOrPosition.leverage !== undefined ? Number(tradeOrPosition.leverage) : 1;

  if (quantity > 0 && entryPrice > 0) {
    return calculateMarginUSD({
      symbol,
      quantity,
      entryPrice,
      leverage,
      marketPairs
    });
  }

  // 3. If only amount is present on transaction (e.g. deposit or legacy trade amount)
  if (typeof tradeOrPosition.amount === 'number' && tradeOrPosition.amount > 0) {
    const lev = (!leverage || leverage <= 0) ? 1 : leverage;
    return Number((tradeOrPosition.amount / lev).toFixed(2));
  }

  return 0;
}

/**
 * Formats a USD margin value into a clean currency string with zero decimal places (e.g. "$250,368 USD")
 */
export function formatMarginUSD(margin: number, includeCurrency = true): string {
  if (isNaN(margin) || margin <= 0) return includeCurrency ? '$0 USD' : '$0';
  const rounded = Math.round(margin);
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return includeCurrency ? `$${formatted} USD` : `$${formatted}`;
}

/**
 * Standard Binance Futures-style fee schedule
 * Maker: 0.02% (0.0002)
 * Taker: 0.05% (0.0005)
 */
export const DEFAULT_MAKER_FEE_RATE = 0.0002;
export const DEFAULT_TAKER_FEE_RATE = 0.0005;

/**
 * Calculates trading fee in USD on executed position notional value
 */
export function calculateTradingFee(
  notionalUSD: number,
  isMaker: boolean = false,
  customRate?: number
): number {
  if (!notionalUSD || notionalUSD <= 0) return 0;
  const rate = typeof customRate === 'number' && !isNaN(customRate)
    ? customRate
    : (isMaker ? DEFAULT_MAKER_FEE_RATE : DEFAULT_TAKER_FEE_RATE);
  return Number((notionalUSD * rate).toFixed(2));
}

/**
 * Derives the trade quantity (base currency units) from USD margin and leverage
 * Position Value (USD) = Margin (USD) * Leverage
 */
export function calculateDerivedQuantityFromMargin(
  marginUSD: number,
  leverage: number,
  price: number,
  symbol?: string,
  category?: string
): number {
  if (!marginUSD || marginUSD <= 0 || !price || price <= 0) return 0;
  const lev = (!leverage || leverage <= 0) ? 1 : leverage;
  const notionalUSD = marginUSD * lev;

  const { base, quote } = parseSymbol(symbol);

  // If base currency is USD/USDT (e.g. USD/JPY, USD/CAD), notional IS base units
  if (base === 'USD' || base === 'USDT' || base === 'USDC') {
    return Number(notionalUSD.toFixed(4));
  }

  // Quote is USD/USDT (e.g. BTC/USDT, ETH/USDT, EUR/USD, XAU/USD, BNB/USDT)
  // Base Units = Notional USD / Price
  const rawQty = notionalUSD / price;
  return Number(rawQty.toFixed(6));
}

