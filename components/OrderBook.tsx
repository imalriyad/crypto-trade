'use client';

import { OrderBookData } from '@/hooks/useBinanceWebSocket';
import { useTradingStore } from '@/store/useTradingStore';

interface OrderBookProps {
  data: OrderBookData;
}

export default function OrderBook({ data }: OrderBookProps) {
  const currentPrice = useTradingStore(state => state.currentPrice);

  // Take top 15 bids and asks
  const asks = data.asks.slice(0, 15).reverse(); // Reverse to show lowest ask at bottom
  const bids = data.bids.slice(0, 15);

  // Calculate max total for depth bars
  const maxTotal = Math.max(
    ...asks.map(a => a[1]),
    ...bids.map(b => b[1])
  ) * 5; // Arbitrary multiplier for visual scaling

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300">
      <div className="flex justify-between text-gray-500 mb-2 text-xs">
        <span>Price (USDT)</span>
        <span>Amount (BTC)</span>
        <span>Total</span>
      </div>

      {/* Asks (Sell Orders) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {asks.map((ask, i) => {
          const [price, amount] = ask;
          const total = price * amount;
          const depth = Math.min((amount / maxTotal) * 100, 100);
          
          return (
            <div key={`ask-${price}-${i}`} className="relative flex justify-between py-0.5 hover:bg-gray-800 cursor-pointer group">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all"
                style={{ width: `${depth}%` }}
              />
              <span className="text-red-500 z-10">{price.toFixed(2)}</span>
              <span className="z-10">{amount.toFixed(5)}</span>
              <span className="z-10 text-gray-500">{total.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      {/* Current Price Spread */}
      <div className="py-3 my-1 border-y border-gray-800 flex items-center justify-between">
        <span className={`text-lg font-bold ${currentPrice > (bids[0]?.[0] || 0) ? 'text-emerald-500' : 'text-red-500'}`}>
          {currentPrice.toFixed(2)}
        </span>
        <span className="text-xs text-gray-500">
          Spread: {asks[asks.length - 1] && bids[0] ? (asks[asks.length - 1][0] - bids[0][0]).toFixed(2) : '-'}
        </span>
      </div>

      {/* Bids (Buy Orders) */}
      <div className="flex-1 overflow-hidden">
        {bids.map((bid, i) => {
          const [price, amount] = bid;
          const total = price * amount;
          const depth = Math.min((amount / maxTotal) * 100, 100);
          
          return (
            <div key={`bid-${price}-${i}`} className="relative flex justify-between py-0.5 hover:bg-gray-800 cursor-pointer group">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 transition-all"
                style={{ width: `${depth}%` }}
              />
              <span className="text-emerald-500 z-10">{price.toFixed(2)}</span>
              <span className="z-10">{amount.toFixed(5)}</span>
              <span className="z-10 text-gray-500">{total.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
