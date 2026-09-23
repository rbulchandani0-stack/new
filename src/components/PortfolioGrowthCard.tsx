import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { Transaction, PortfolioStats, Wallet } from '../types';

interface PortfolioGrowthCardProps {
  stats: PortfolioStats | null;
  wallet: Wallet | null;
  txHistory: Transaction[];
}

export const PortfolioGrowthCard: React.FC<PortfolioGrowthCardProps> = ({
  stats,
  wallet,
  txHistory
}) => {
  const [period, setPeriod] = useState<'7D' | '30D' | '90D' | 'ALL'>('7D');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });

  // ResizeObserver to automatically resize and recalculate SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const computedHeight = Math.max(220, Math.min(280, width * 0.45));
      setDimensions({ width, height: computedHeight });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Filter completed trades to determine if empty state is needed
  const completedTrades = txHistory.filter(
    t => t.type === 'trade' && (t.status === 'completed' || t.status === 'closed' || !t.status)
  );

  if (completedTrades.length === 0) {
    return (
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 flex flex-col space-y-6 relative overflow-hidden min-h-[300px] justify-between">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4 relative z-10">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Portfolio Growth</h3>
            <p className="text-xs text-[#8A8A8A]">Track your account balance over time</p>
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#262626] rounded-xl p-0.5 text-xs font-mono opacity-50 pointer-events-none">
            {['7D', '30D', '90D', 'ALL'].map((p) => (
              <button key={p} className="px-3 py-1.5 rounded-lg font-bold text-[#8A8A8A]">
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Empty State Body */}
        <div className="flex flex-col items-center justify-center py-10 space-y-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h4 className="font-extrabold text-sm text-white">No trading data yet</h4>
            <p className="text-xs text-[#8A8A8A] mt-1 font-sans">Complete your first trade to see portfolio growth.</p>
          </div>
        </div>

        <div className="text-[10px] text-[#444] font-mono text-center">
          Institutional Trading Analytics Engine v1.0
        </div>
      </div>
    );
  }

  // Find current total balance
  const currentBalance = stats?.totalBalance !== undefined ? stats.totalBalance : (wallet?.tradingBalance || 0);

  // Helper to format local date keys
  const getLocalDateKey = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Group all transactions by local date key
  const txsByDate: Record<string, Transaction[]> = {};
  txHistory.forEach(tx => {
    const key = getLocalDateKey(tx.createdAt);
    if (!txsByDate[key]) txsByDate[key] = [];
    txsByDate[key].push(tx);
  });

  // Determine number of days for the selected period
  const now = new Date();
  let daysCount = 7;
  if (period === '7D') daysCount = 7;
  else if (period === '30D') daysCount = 30;
  else if (period === '90D') daysCount = 90;
  else if (period === 'ALL') {
    if (txHistory.length > 0) {
      const oldestTx = txHistory[txHistory.length - 1];
      const oldestDate = new Date(oldestTx.createdAt);
      const diffTime = Math.abs(now.getTime() - oldestDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysCount = Math.max(7, Math.min(180, diffDays + 2)); // Limit back-calculation logically
    } else {
      daysCount = 30;
    }
  }

  // Trace backwards daily
  let runningBalance = currentBalance;
  const rawDailyData: any[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const dateObj = new Date();
    dateObj.setDate(now.getDate() - i);
    const dateKey = getLocalDateKey(dateObj.toISOString());
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const dayTxs = txsByDate[dateKey] || [];
    let dayNetProfit = 0;
    let dayDeposits = 0;
    let dayWithdrawals = 0;
    let dayWinCount = 0;
    let dayLossCount = 0;

    dayTxs.forEach(t => {
      if (t.type === 'trade') {
        const pnl = t.netPnL !== undefined ? t.netPnL : (t.pnl !== undefined ? t.pnl : 0);
        dayNetProfit += pnl;
        if (pnl > 0) dayWinCount++;
        if (pnl < 0) dayLossCount++;
      } else if (t.type === 'deposit' && t.status === 'completed') {
        dayDeposits += t.amount;
      } else if (t.type === 'withdrawal' && t.status === 'completed') {
        dayWithdrawals += t.amount + 1.0; // withdrawal amount + fee
      }
    });

    const dayTotalChange = dayNetProfit + dayDeposits - dayWithdrawals;
    const closingBalance = runningBalance;
    const startBalance = runningBalance - dayTotalChange;

    rawDailyData.push({
      date: formattedDate,
      dayName,
      dateKey,
      netProfit: dayNetProfit,
      winningTradesCount: dayWinCount,
      losingTradesCount: dayLossCount,
      deposits: dayDeposits,
      withdrawals: dayWithdrawals,
      balance: closingBalance,
      startBalance: startBalance,
    });

    runningBalance = startBalance;
  }

  // Calculate detailed daily metrics
  const dailyData = rawDailyData.map(d => {
    const roi = d.startBalance > 0 ? (d.netProfit / d.startBalance) * 100 : 0;
    return {
      ...d,
      roi: Number(roi.toFixed(2)),
      balance: Number(d.balance.toFixed(2)),
      startBalance: Number(d.startBalance.toFixed(2)),
      netProfit: Number(d.netProfit.toFixed(2))
    };
  });

  // Calculate Performance Metrics
  const netProfit = dailyData.reduce((sum, d) => sum + d.netProfit, 0);
  const startPeriodBalance = dailyData[0].startBalance;
  const totalReturnPercent = startPeriodBalance > 0 
    ? (netProfit / startPeriodBalance) * 100 
    : (wallet?.tradingBalance ? (netProfit / Math.max(1, wallet.tradingBalance - netProfit)) * 100 : 0);

  const netProfits = dailyData.map(d => d.netProfit);
  const bestDayProfit = Math.max(...netProfits);
  const worstDayProfit = Math.min(...netProfits);

  // SVG Coordinates Calculation
  const paddingX = 40;
  const paddingY = 25;
  const mainChartHeight = dimensions.height * 0.55;
  const barChartHeight = dimensions.height * 0.15;
  const barChartTop = mainChartHeight + 35;
  const barBaselineY = barChartTop + barChartHeight / 2;

  const chartWidth = dimensions.width - 2 * paddingX;

  const balances = dailyData.map(d => d.balance);
  let maxBal = Math.max(...balances);
  let minBal = Math.min(...balances);

  const balDiff = maxBal - minBal;
  if (balDiff === 0) {
    maxBal = maxBal + 100;
    minBal = Math.max(0, minBal - 100);
  } else {
    maxBal = maxBal + balDiff * 0.15;
    minBal = Math.max(0, minBal - 0.15 * balDiff);
  }

  const points = dailyData.map((d, idx) => {
    const x = paddingX + (idx / (dailyData.length - 1)) * chartWidth;
    const y = paddingY + mainChartHeight - ((d.balance - minBal) / (maxBal - minBal)) * mainChartHeight;
    return { x, y, data: d };
  });

  // Closed area polygon D string
  let areaD = '';
  if (points.length > 0) {
    areaD = `M ${points[0].x} ${paddingY + mainChartHeight} `;
    points.forEach(pt => {
      areaD += `L ${pt.x} ${pt.y} `;
    });
    areaD += `L ${points[points.length - 1].x} ${paddingY + mainChartHeight} Z`;
  }

  // Max absolute profit for daily P&L bar scaling
  const maxAbsProfit = Math.max(...dailyData.map(d => Math.abs(d.netProfit)), 1);

  // Horizontal Grid Lines ticks
  const gridTicks = [
    minBal,
    minBal + (maxBal - minBal) * 0.5,
    maxBal
  ];

  // Current active data point
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  const isOverallPositive = netProfit >= 0;
  const gradientId = `growthAreaGradient-${period}`;

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 flex flex-col space-y-6 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-[#00C853]/5 to-transparent pointer-events-none -mr-20 -mt-20 rounded-full" />

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4 relative z-10">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Portfolio Growth</h3>
          <p className="text-xs text-[#8A8A8A]">Track your account balance over time</p>
        </div>
        
        {/* Time Filters */}
        <div className="flex bg-[#1A1A1A] border border-[#262626] rounded-xl p-0.5 text-xs font-mono self-start sm:self-auto">
          {(['7D', '30D', '90D', 'ALL'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setActiveIndex(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
                period === p
                  ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/15'
                  : 'text-[#8A8A8A] hover:text-white hover:bg-[#222]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 bg-[#1A1A1A]/40 border border-[#222]/50 rounded-xl p-4">
        <div>
          <span className="text-[10px] text-[#8A8A8A] font-extrabold uppercase tracking-wider block mb-1">Total Return</span>
          <div className={`text-sm sm:text-base font-extrabold font-mono ${totalReturnPercent >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
          </div>
        </div>

        <div>
          <span className="text-[10px] text-[#8A8A8A] font-extrabold uppercase tracking-wider block mb-1">Net Profit</span>
          <div className={`text-sm sm:text-base font-extrabold font-mono ${netProfit >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-[#8A8A8A] font-extrabold uppercase tracking-wider block mb-1">Best Day</span>
          <div className={`text-sm sm:text-base font-extrabold font-mono ${bestDayProfit >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {bestDayProfit >= 0 ? '+' : ''}${bestDayProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-[#8A8A8A] font-extrabold uppercase tracking-wider block mb-1">Worst Day</span>
          <div className={`text-sm sm:text-base font-extrabold font-mono ${worstDayProfit >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {worstDayProfit >= 0 ? '+' : ''}${worstDayProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Responsive Analytics Chart Area */}
      <div ref={containerRef} className="relative w-full overflow-visible pb-2 select-none">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isOverallPositive ? '#00C853' : '#FF3B30'} stopOpacity="0.18" />
              <stop offset="100%" stopColor={isOverallPositive ? '#00C853' : '#FF3B30'} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {gridTicks.map((val, idx) => {
            const y = paddingY + mainChartHeight - ((val - minBal) / (maxBal - minBal)) * mainChartHeight;
            return (
              <g key={`grid-line-${idx}`} className="opacity-40">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={dimensions.width - paddingX}
                  y2={y}
                  stroke="#222"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#8A8A8A"
                  className="text-[9px] font-mono font-bold"
                >
                  ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* Chart Gradient Fill Underneath */}
          {areaD && (
            <path
              d={areaD}
              fill={`url(#${gradientId})`}
              className="transition-all duration-300 pointer-events-none"
            />
          )}

          {/* Segmented Line: Green when rising, Red when falling */}
          {points.slice(1).map((pt, idx) => {
            const prevPt = points[idx];
            const isRising = pt.data.balance >= prevPt.data.balance;
            return (
              <line
                key={`line-seg-${idx}`}
                x1={prevPt.x}
                y1={prevPt.y}
                x2={pt.x}
                y2={pt.y}
                stroke={isRising ? '#00C853' : '#FF3B30'}
                strokeWidth={2}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            );
          })}

          {/* Interactive vertical hover indicator line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={barChartTop + barChartHeight}
              stroke="#444"
              strokeWidth={1}
              strokeDasharray="2,2"
              className="pointer-events-none"
            />
          )}

          {/* Circular markers on each day */}
          {points.map((pt, idx) => {
            const isHovered = activeIndex === idx;
            const isRising = idx === 0 ? true : pt.data.balance >= points[idx - 1].data.balance;
            return (
              <circle
                key={`marker-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 2.5}
                fill={isRising ? '#00C853' : '#FF3B30'}
                stroke="#121212"
                strokeWidth={1.5}
                className="transition-all duration-150 pointer-events-none"
              />
            );
          })}

          {/* Daily Profit Bars (Profit = green, Loss = red) */}
          {points.map((pt, idx) => {
            const profit = pt.data.netProfit;
            if (profit === 0) {
              return (
                <line
                  key={`baseline-tick-${idx}`}
                  x1={pt.x - 2}
                  y1={barBaselineY}
                  x2={pt.x + 2}
                  y2={barBaselineY}
                  stroke="#333"
                  strokeWidth={1}
                  className="pointer-events-none"
                />
              );
            }
            
            const barH = (Math.abs(profit) / maxAbsProfit) * (barChartHeight / 2);
            const barY = profit > 0 ? barBaselineY - barH : barBaselineY;
            const color = profit > 0 ? '#00C853' : '#FF3B30';
            const isHovered = activeIndex === idx;

            return (
              <rect
                key={`profit-bar-${idx}`}
                x={pt.x - 2.5}
                y={barY}
                width={5}
                height={Math.max(1.5, barH)}
                fill={color}
                opacity={isHovered ? 1 : 0.65}
                rx={1}
                className="transition-all duration-150 pointer-events-none"
              />
            );
          })}

          {/* Daily Profit Bars Divider line */}
          <line
            x1={paddingX}
            y1={barBaselineY}
            x2={dimensions.width - paddingX}
            y2={barBaselineY}
            stroke="#222"
            strokeWidth={1}
            className="opacity-50 pointer-events-none"
          />

          {/* X Axis Labels */}
          {points.map((pt, idx) => {
            const totalPoints = points.length;
            const step = Math.ceil(totalPoints / 6);
            if (idx % step !== 0 && idx !== totalPoints - 1) return null;

            return (
              <text
                key={`x-label-${idx}`}
                x={pt.x}
                y={dimensions.height - 4}
                textAnchor="middle"
                fill="#6A6A6A"
                className="text-[9px] font-mono font-bold"
              >
                {pt.data.date}
              </text>
            );
          })}

          {/* Invisible rectangles for capturing mouse / touch interactions */}
          {points.map((pt, idx) => {
            const stepWidth = chartWidth / (points.length - 1 || 1);
            const clickWidth = Math.max(16, stepWidth);
            return (
              <rect
                key={`hitbox-${idx}`}
                x={pt.x - clickWidth / 2}
                y={0}
                width={clickWidth}
                height={dimensions.height}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                onTouchStart={() => setActiveIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Floating Glassmorphism Interactive Tooltip */}
        {activePoint && (
          <div 
            className="absolute z-30 pointer-events-none bg-[#121212]/95 border border-[#333] rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[170px] space-y-1.5 font-sans transition-all duration-100 ease-out"
            style={{
              left: `${Math.min(dimensions.width - 185, Math.max(15, activePoint.x - 85))}px`,
              top: `${Math.max(5, activePoint.y - 140)}px`
            }}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-extrabold flex items-center justify-between">
              <span>{activePoint.data.dayName}</span>
              <span className="text-[9px] font-mono text-[#555]">{activePoint.data.dateKey}</span>
            </div>
            
            <div className="border-t border-[#222] my-1" />
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8A8A]">Balance:</span>
              <span className="font-mono font-bold text-white">${activePoint.data.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8A8A]">Daily P&L:</span>
              <span className={`font-mono font-bold ${activePoint.data.netProfit >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                {activePoint.data.netProfit >= 0 ? '+' : ''}${activePoint.data.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8A8A]">Trades PnL:</span>
              <span className="font-mono text-white text-[11px]">
                <span className="text-[#00C853] font-bold">{activePoint.data.winningTradesCount}W</span>
                <span className="text-[#8A8A8A] mx-0.5">/</span>
                <span className="text-[#FF3B30] font-bold">{activePoint.data.losingTradesCount}L</span>
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8A8A]">ROI:</span>
              <span className={`font-mono font-bold ${activePoint.data.roi >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                {activePoint.data.roi >= 0 ? '+' : ''}{activePoint.data.roi.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
