'use client';

import { useState } from 'react';
import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';
import { useTradingStore } from '@/store/useTradingStore';
import Chart from './Chart';
import OrderBook from './OrderBook';
import RecentTrades from './RecentTrades';
import OrderEntry from './OrderEntry';
import Portfolio from './Portfolio';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TradingInterface() {
  const [interval, setInterval] = useState('1d');
  const { klineData, orderBook, recentTrades, ticker } = useBinanceWebSocket('btcusdt', interval);
  const currentPrice = useTradingStore(state => state.currentPrice);
  
  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d', '1y'];

  return (
    <div className="flex flex-col h-screen max-h-screen gap-2 max-w-[1800px] mx-auto overflow-hidden">
      {/* Header / Ticker */}
      <header className="bg-gray-900 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold text-white">
              B
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">BTCUSDT Perp</h1>
              <span className="text-xs text-gray-400 underline decoration-dashed">Bitcoin Futures</span>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className={`text-xl font-bold ${ticker && ticker.priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {currentPrice > 0 ? currentPrice.toFixed(2) : '---'}
            </span>
            <span className="text-xs text-gray-400">${currentPrice > 0 ? currentPrice.toFixed(2) : '---'}</span>
          </div>

          {ticker && (
            <>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs text-gray-400">24h Change</span>
                <span className={`text-sm font-medium ${ticker.priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'} flex items-center`}>
                  {ticker.priceChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {ticker.priceChange > 0 ? '+' : ''}{ticker.priceChange.toFixed(2)} ({ticker.priceChangePercent.toFixed(2)}%)
                </span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs text-gray-400">24h High</span>
                <span className="text-sm font-medium text-white">{ticker.highPrice.toFixed(2)}</span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs text-gray-400">24h Low</span>
                <span className="text-sm font-medium text-white">{ticker.lowPrice.toFixed(2)}</span>
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs text-gray-400">24h Vol(BTC)</span>
                <span className="text-sm font-medium text-white">{ticker.volume.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
          {intervals.map(i => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={`px-3 py-1 text-xs font-medium rounded ${interval === i ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {i}
            </button>
          ))}
        </div>
      </header>

      {/* Main Trading Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 min-h-0 overflow-hidden">
        
        {/* Left Column: Order Book */}
        <div className="hidden lg:flex flex-col w-[300px] shrink-0 min-h-0 bg-gray-900 rounded-lg overflow-hidden">
          <div className="p-3 border-b border-gray-800">
            <h2 className="text-sm font-bold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2 text-emerald-500" />
              Order Book
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <OrderBook data={orderBook} />
          </div>
        </div>

        {/* Middle Column: Chart & Portfolio */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          {/* Chart */}
          <div className="flex-[3] min-h-0 bg-gray-900 rounded-lg overflow-hidden relative">
            <Chart symbol="btcusdt" interval={interval} latestKline={klineData} />
          </div>
          
          {/* Portfolio */}
          <div className="flex-[2] min-h-0 bg-gray-900 rounded-lg overflow-hidden">
            <Portfolio />
          </div>
        </div>

        {/* Right Column: Order Entry & Recent Trades */}
        <div className="flex flex-col w-full lg:w-[320px] shrink-0 gap-2 min-h-0">
          {/* Order Entry */}
          <div className="shrink-0 bg-gray-900 rounded-lg overflow-hidden">
            <OrderEntry />
          </div>
          
          {/* Recent Trades */}
          <div className="flex-1 min-h-0 flex flex-col bg-gray-900 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white">Recent Trades</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <RecentTrades trades={recentTrades} />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
