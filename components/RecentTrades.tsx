'use client';

import { RecentTradeData } from '@/hooks/useBinanceWebSocket';
import { format } from 'date-fns';

interface RecentTradesProps {
  trades: RecentTradeData[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300">
      <div className="flex justify-between text-gray-500 mb-2 text-xs">
        <span>Price (USDT)</span>
        <span>Amount (BTC)</span>
        <span>Time</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {trades.map((trade) => (
          <div key={trade.id} className="flex justify-between py-1 hover:bg-gray-800 cursor-pointer">
            <span className={trade.isBuyerMaker ? 'text-red-500' : 'text-emerald-500'}>
              {trade.price.toFixed(2)}
            </span>
            <span>{trade.quantity.toFixed(5)}</span>
            <span className="text-gray-500">{format(trade.time, 'HH:mm:ss')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
