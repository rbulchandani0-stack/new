import React, { useState } from 'react';
import { useMarket } from '../context/MarketContext';
import { LayoutGrid, TrendingUp, Search } from 'lucide-react';

interface MarketOverviewPageProps {
  onSelectMarket: (symbol: string) => void;
}

export const MarketOverviewPage: React.FC<MarketOverviewPageProps> = ({ onSelectMarket }) => {
  const { assets } = useMarket();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filtered = assets.filter((a) => {
    const matchesFilter = filter === 'all' || a.category === filter;
    const matchesSearch =
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Global Markets</h2>
            <p className="text-xs text-[#8A8A8A]">Real-time quotes across Crypto, Forex, Indices & Commodities</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#666666]" />
          <input
            type="text"
            placeholder="Search instrument..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-[#121212] border border-[#262626] focus:border-[#00C853] rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="flex space-x-2">
        {['all', 'crypto', 'forex', 'commodities', 'indices'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold capitalize transition-colors ${
              filter === cat
                ? 'bg-[#00C853] text-black'
                : 'bg-[#141414] text-[#8A8A8A] hover:text-white border border-[#242424]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-[#121212] border border-[#222222] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#222222] text-[#8A8A8A] bg-[#161616]/50">
                <th className="p-4 font-semibold">Instrument</th>
                <th className="p-4 font-semibold">Price</th>
                <th className="p-4 font-semibold">24h Change</th>
                <th className="p-4 font-semibold">24h High</th>
                <th className="p-4 font-semibold">24h Low</th>
                <th className="p-4 font-semibold text-right">Trade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {filtered.map((asset) => (
                <tr key={asset.symbol} className="text-white hover:bg-[#181818] transition-colors">
                  <td className="p-4 font-bold">
                    <div className="flex items-center space-x-2">
                      <span>{asset.symbol}</span>
                      <span className="text-[10px] text-[#8A8A8A] font-normal">{asset.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-black">${asset.price.toLocaleString()}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        asset.change24h >= 0 ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                      }`}
                    >
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                    </span>
                  </td>
                  <td className="p-4 text-[#CCCCCC]">${asset.high24h.toLocaleString()}</td>
                  <td className="p-4 text-[#CCCCCC]">${asset.low24h.toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onSelectMarket(asset.symbol)}
                      className="py-1 px-3.5 rounded-lg bg-[#00C853] hover:bg-[#00E676] text-black font-extrabold text-xs cursor-pointer"
                    >
                      Trade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
