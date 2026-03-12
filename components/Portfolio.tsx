'use client';

import { useState } from 'react';
import { useTradingStore } from '@/store/useTradingStore';
import { format } from 'date-fns';

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState<'OPEN_ORDERS' | 'POSITIONS' | 'HISTORY'>('POSITIONS');
  
  const openOrders = useTradingStore(state => state.openOrders);
  const tradeHistory = useTradingStore(state => state.tradeHistory);
  const balanceUSDT = useTradingStore(state => state.balanceUSDT);
  const position = useTradingStore(state => state.position);
  const currentPrice = useTradingStore(state => state.currentPrice);
  const leverage = useTradingStore(state => state.leverage);
  const closePosition = useTradingStore(state => state.closePosition);
  const cancelOrder = useTradingStore(state => state.cancelOrder);

  let unrealizedPnL = 0;
  if (position && currentPrice > 0) {
    if (position.side === 'LONG') {
      unrealizedPnL = position.size * (currentPrice - position.entryPrice);
    } else {
      unrealizedPnL = position.size * (position.entryPrice - currentPrice);
    }
  }

  const positionMargin = position ? (position.size * position.entryPrice) / leverage : 0;
  const orderMargin = openOrders.reduce((acc, o) => acc + (o.amount * o.price) / leverage, 0);
  const availableBalance = balanceUSDT - positionMargin - orderMargin;
  const marginBalance = balanceUSDT + unrealizedPnL;

  const totalPortfolioValue = marginBalance;
  const totalPnL = totalPortfolioValue - 10000; // Starting balance is 10000
  const pnlPercentage = (totalPnL / 10000) * 100;

  return (
    <div className="bg-gray-900 rounded-lg flex flex-col h-full overflow-hidden">
      {/* Portfolio Summary */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Equity (Total Value)</div>
          <div className="text-xl font-bold text-white">${totalPortfolioValue.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Available Balance</div>
          <div className="text-xl font-bold text-emerald-500">${availableBalance.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Total PnL</div>
          <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} ({pnlPercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === 'OPEN_ORDERS' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('OPEN_ORDERS')}
        >
          Open Orders ({openOrders.length})
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === 'POSITIONS' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('POSITIONS')}
        >
          Positions {position ? '(1)' : '(0)'}
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium ${activeTab === 'HISTORY' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          Trade History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'OPEN_ORDERS' && (
          <div className="w-full">
            {openOrders.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No open orders</div>
            ) : (
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Pair</th>
                    <th className="px-4 py-2">Side</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Amount (BTC)</th>
                    <th className="px-4 py-2 text-right">Size (USDT)</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map(order => (
                    <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">{format(order.timestamp, 'MM-dd HH:mm:ss')}</td>
                      <td className="px-4 py-3 font-medium">BTCUSDT Perp</td>
                      <td className={`px-4 py-3 font-bold ${order.side === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>{order.side}</td>
                      <td className="px-4 py-3 text-right">{order.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{order.amount.toFixed(5)}</td>
                      <td className="px-4 py-3 text-right">{(order.amount * order.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => cancelOrder(order.id)}
                          className="text-xs bg-gray-700 hover:bg-red-500/20 hover:text-red-500 text-gray-300 px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'POSITIONS' && (
          <div className="w-full">
            {!position ? (
              <div className="text-center text-gray-500 py-8">No open positions</div>
            ) : (
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2">Symbol</th>
                    <th className="px-4 py-2">Size (BTC)</th>
                    <th className="px-4 py-2 text-right">Size (USDT)</th>
                    <th className="px-4 py-2 text-right">Entry Price</th>
                    <th className="px-4 py-2 text-right">Mark Price</th>
                    <th className="px-4 py-2 text-right">Margin</th>
                    <th className="px-4 py-2 text-right">Unrealized PNL (ROE%)</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${position.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                        {position.side}
                      </span>
                      BTCUSDT Perp
                    </td>
                    <td className="px-4 py-3">{position.size.toFixed(5)}</td>
                    <td className="px-4 py-3 text-right">{(position.size * currentPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{position.entryPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{currentPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{positionMargin.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)} USDT <br/>
                      <span className="text-xs opacity-80">({unrealizedPnL >= 0 ? '+' : ''}{((unrealizedPnL / positionMargin) * 100).toFixed(2)}%)</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={closePosition}
                        className="text-xs bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded transition-colors"
                      >
                        Market Close
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
            
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Balances</h3>
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2">Equity (Total Value)</th>
                    <th className="px-4 py-2 text-right">Available Balance</th>
                    <th className="px-4 py-2 text-right">Position Margin</th>
                    <th className="px-4 py-2 text-right">Order Margin</th>
                    <th className="px-4 py-2 text-right">Unrealized PNL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-bold text-white">{marginBalance.toFixed(2)} USDT</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-500">{availableBalance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{positionMargin.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{orderMargin.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${unrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="w-full">
            {tradeHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No trade history</div>
            ) : (
              <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Pair</th>
                    <th className="px-4 py-2">Side</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Executed</th>
                    <th className="px-4 py-2 text-right">Fee</th>
                    <th className="px-4 py-2 text-right">Realized PNL</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map(trade => (
                    <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3">{format(trade.timestamp, 'MM-dd HH:mm:ss')}</td>
                      <td className="px-4 py-3 font-medium">BTCUSDT Perp</td>
                      <td className={`px-4 py-3 font-bold ${trade.side === 'BUY' ? 'text-emerald-500' : 'text-red-500'}`}>{trade.side}</td>
                      <td className="px-4 py-3 text-right">{trade.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{trade.amount.toFixed(5)}</td>
                      <td className="px-4 py-3 text-right">{trade.fee.toFixed(4)} USDT</td>
                      <td className={`px-4 py-3 text-right ${trade.realizedPnL !== undefined ? (trade.realizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-gray-500'}`}>
                        {trade.realizedPnL !== undefined ? `${trade.realizedPnL >= 0 ? '+' : ''}${trade.realizedPnL.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
