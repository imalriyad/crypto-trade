'use client';

import { useState, useEffect } from 'react';
import { useTradingStore, OrderType, OrderSide } from '@/store/useTradingStore';

export default function OrderEntry() {
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [price, setPrice] = useState<string>('');
  const [amountBTC, setAmountBTC] = useState<string>('');
  const [amountUSDT, setAmountUSDT] = useState<string>('');
  const [marginMode, setMarginMode] = useState<'CROSS' | 'ISOLATED'>('CROSS');
  
  const currentPrice = useTradingStore(state => state.currentPrice);
  const balanceUSDT = useTradingStore(state => state.balanceUSDT);
  const leverage = useTradingStore(state => state.leverage);
  const setLeverage = useTradingStore(state => state.setLeverage);
  const placeOrder = useTradingStore(state => state.placeOrder);
  const position = useTradingStore(state => state.position);
  const openOrders = useTradingStore(state => state.openOrders);

  const positionMargin = position ? (position.size * position.entryPrice) / leverage : 0;
  const orderMargin = openOrders.reduce((acc, o) => acc + (o.amount * o.price) / leverage, 0);
  const availableBalance = balanceUSDT - positionMargin - orderMargin;

  // Sync BTC and USDT amounts when price or one of them changes
  const handleAmountBTCChange = (val: string) => {
    setAmountBTC(val);
    const numBTC = parseFloat(val);
    const execPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price) || currentPrice;
    if (!isNaN(numBTC) && execPrice > 0) {
      setAmountUSDT((numBTC * execPrice).toFixed(2));
    } else {
      setAmountUSDT('');
    }
  };

  const handleAmountUSDTChange = (val: string) => {
    setAmountUSDT(val);
    const numUSDT = parseFloat(val);
    const execPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price) || currentPrice;
    if (!isNaN(numUSDT) && execPrice > 0) {
      setAmountBTC((numUSDT / execPrice).toFixed(5));
    } else {
      setAmountBTC('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price);
    const numAmount = parseFloat(amountBTC);

    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Invalid amount');
      return;
    }

    if (orderType === 'LIMIT' && (isNaN(numPrice) || numPrice <= 0)) {
      alert('Invalid price');
      return;
    }

    placeOrder(orderType, side, numPrice, numAmount);
    setAmountBTC('');
    setAmountUSDT('');
    if (orderType === 'LIMIT') setPrice('');
  };

  const handlePercentageClick = (percentage: number) => {
    const execPrice = orderType === 'MARKET' ? currentPrice : parseFloat(price) || currentPrice;
    if (execPrice > 0) {
      const affordableUSDT = (availableBalance * leverage) * percentage;
      setAmountUSDT(affordableUSDT.toFixed(2));
      setAmountBTC((affordableUSDT / execPrice).toFixed(5));
    }
  };

  const cost = amountUSDT ? (parseFloat(amountUSDT) / leverage).toFixed(2) : '0.00';

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-full flex flex-col">
      <div className="mb-4 bg-gray-800 rounded p-3">
        <div className="flex justify-between items-center mb-2">
          <button
            type="button"
            className="text-xs font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors"
            onClick={() => setMarginMode(marginMode === 'CROSS' ? 'ISOLATED' : 'CROSS')}
          >
            {marginMode}
          </button>
          <div className="flex space-x-1">
            {[1, 10, 20, 50, 100].map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLeverage(l)}
                className={`text-xs px-1.5 py-0.5 rounded ${leverage === l ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                {l}x
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-white">{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="125"
          step="1"
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          className={`flex-1 py-1.5 text-sm font-medium rounded ${orderType === 'MARKET' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={() => setOrderType('MARKET')}
        >
          Market
        </button>
        <button
          className={`flex-1 py-1.5 text-sm font-medium rounded ${orderType === 'LIMIT' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={() => setOrderType('LIMIT')}
        >
          Limit
        </button>
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          className={`flex-1 py-2 font-bold rounded ${side === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          onClick={() => setSide('BUY')}
        >
          Buy / Long
        </button>
        <button
          className={`flex-1 py-2 font-bold rounded ${side === 'SELL' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          onClick={() => setSide('SELL')}
        >
          Sell / Short
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        {orderType === 'LIMIT' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Price (USDT)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (amountBTC) {
                    const p = parseFloat(e.target.value) || currentPrice;
                    setAmountUSDT((parseFloat(amountBTC) * p).toFixed(2));
                  }
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                placeholder={currentPrice.toFixed(2)}
              />
              <span className="absolute right-3 top-2 text-gray-500 text-sm">USDT</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">Size (USDT)</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={amountUSDT}
              onChange={(e) => handleAmountUSDTChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">USDT</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Size (BTC)</label>
          <div className="relative">
            <input
              type="number"
              step="0.00001"
              value={amountBTC}
              onChange={(e) => handleAmountBTCChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-2 text-gray-500 text-sm">BTC</span>
          </div>
        </div>

        <div className="flex justify-between space-x-2">
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentageClick(pct)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs py-1 rounded"
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        <div className="pt-4 mt-auto border-t border-gray-800">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Avail USDT</span>
            <span className="text-white">{availableBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-400">Cost</span>
            <span className="text-white">{cost} USDT</span>
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded font-bold text-white transition-colors ${
              side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {side === 'BUY' ? 'Buy / Long BTC' : 'Sell / Short BTC'}
          </button>
        </div>
      </form>
    </div>
  );
}
