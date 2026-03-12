import { create } from 'zustand';

export type OrderType = 'MARKET' | 'LIMIT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELED';

export interface Order {
  id: string;
  type: OrderType;
  side: OrderSide;
  price: number;
  amount: number;
  status: OrderStatus;
  timestamp: number;
}

export interface Trade {
  id: string;
  orderId: string;
  side: OrderSide;
  price: number;
  amount: number;
  fee: number;
  realizedPnL?: number;
  timestamp: number;
}

export interface Position {
  side: 'LONG' | 'SHORT';
  size: number; // in BTC
  entryPrice: number;
}

interface TradingState {
  balanceUSDT: number; // Realized balance
  position: Position | null;
  openOrders: Order[];
  tradeHistory: Trade[];
  currentPrice: number;
  leverage: number;
  setLeverage: (leverage: number) => void;
  closePosition: () => void;
  setCurrentPrice: (price: number) => void;
  placeOrder: (type: OrderType, side: OrderSide, price: number, amount: number) => void;
  cancelOrder: (id: string) => void;
}

const FEE_RATE = 0.001; // 0.1%

export const useTradingStore = create<TradingState>((set, get) => ({
  balanceUSDT: 10000,
  position: null,
  openOrders: [],
  tradeHistory: [],
  currentPrice: 0,
  leverage: 10,

  setLeverage: (leverage: number) => set({ leverage }),

  closePosition: () => {
    const state = get();
    if (!state.position || state.currentPrice <= 0) return;
    const side = state.position.side === 'LONG' ? 'SELL' : 'BUY';
    state.placeOrder('MARKET', side, state.currentPrice, state.position.size);
  },

  setCurrentPrice: (price: number) => {
    set({ currentPrice: price });
    
    const state = get();
    const { openOrders } = state;
    
    const ordersToExecute = openOrders.filter(o => 
      o.status === 'OPEN' && 
      ((o.side === 'BUY' && price <= o.price) || (o.side === 'SELL' && price >= o.price))
    );

    if (ordersToExecute.length > 0) {
      const remainingOrders = openOrders.filter(o => !ordersToExecute.includes(o));
      set({ openOrders: remainingOrders });
      
      ordersToExecute.forEach(order => {
        get().placeOrder('MARKET', order.side, order.price, order.amount);
      });
    }
  },

  placeOrder: (type, side, price, amount) => {
    const state = get();
    const currentPrice = state.currentPrice;
    
    const positionMargin = state.position ? (state.position.size * state.position.entryPrice) / state.leverage : 0;
    const orderMargin = state.openOrders.reduce((acc, o) => acc + (o.amount * o.price) / state.leverage, 0);
    const availableBalance = state.balanceUSDT - positionMargin - orderMargin;

    if (type === 'MARKET') {
      const execPrice = currentPrice;
      if (execPrice <= 0) return;
      
      let requiredMargin = 0;
      if (!state.position) {
        requiredMargin = (amount * execPrice) / state.leverage;
      } else if (state.position.side === (side === 'BUY' ? 'LONG' : 'SHORT')) {
        requiredMargin = (amount * execPrice) / state.leverage;
      } else {
        if (amount > state.position.size) {
          const newSize = amount - state.position.size;
          requiredMargin = (newSize * execPrice) / state.leverage;
        }
      }
      
      if (requiredMargin > availableBalance) {
        alert('Insufficient margin (USDT)');
        return;
      }

      const fee = amount * execPrice * FEE_RATE; // Fee always in USDT
      let newBalance = state.balanceUSDT - fee;
      let newPosition = state.position ? { ...state.position } : null;
      let realizedPnL = 0;

      if (side === 'BUY') {
        if (!newPosition) {
          newPosition = { side: 'LONG', size: amount, entryPrice: execPrice };
        } else if (newPosition.side === 'LONG') {
          // Add to LONG
          const totalValue = newPosition.size * newPosition.entryPrice + amount * execPrice;
          newPosition.size += amount;
          newPosition.entryPrice = totalValue / newPosition.size;
        } else if (newPosition.side === 'SHORT') {
          // Reduce or flip SHORT
          if (amount <= newPosition.size) {
            // Reduce SHORT
            realizedPnL = amount * (newPosition.entryPrice - execPrice);
            newBalance += realizedPnL;
            newPosition.size -= amount;
            if (newPosition.size === 0) newPosition = null;
          } else {
            // Flip to LONG
            const closeAmount = newPosition.size;
            realizedPnL = closeAmount * (newPosition.entryPrice - execPrice);
            newBalance += realizedPnL;
            const remainAmount = amount - closeAmount;
            newPosition = { side: 'LONG', size: remainAmount, entryPrice: execPrice };
          }
        }
      } else { // SELL
        if (!newPosition) {
          newPosition = { side: 'SHORT', size: amount, entryPrice: execPrice };
        } else if (newPosition.side === 'SHORT') {
          // Add to SHORT
          const totalValue = newPosition.size * newPosition.entryPrice + amount * execPrice;
          newPosition.size += amount;
          newPosition.entryPrice = totalValue / newPosition.size;
        } else if (newPosition.side === 'LONG') {
          // Reduce or flip LONG
          if (amount <= newPosition.size) {
            // Reduce LONG
            realizedPnL = amount * (execPrice - newPosition.entryPrice);
            newBalance += realizedPnL;
            newPosition.size -= amount;
            if (newPosition.size === 0) newPosition = null;
          } else {
            // Flip to SHORT
            const closeAmount = newPosition.size;
            realizedPnL = closeAmount * (execPrice - newPosition.entryPrice);
            newBalance += realizedPnL;
            const remainAmount = amount - closeAmount;
            newPosition = { side: 'SHORT', size: remainAmount, entryPrice: execPrice };
          }
        }
      }

      set({
        balanceUSDT: newBalance,
        position: newPosition,
        tradeHistory: [{
          id: Math.random().toString(36).substring(7),
          orderId: 'market-' + Date.now(),
          side: side,
          price: execPrice,
          amount: amount,
          fee: fee,
          realizedPnL: realizedPnL !== 0 ? realizedPnL : undefined,
          timestamp: Date.now(),
        }, ...state.tradeHistory]
      });
      
    } else if (type === 'LIMIT') {
      const marginRequired = (amount * price) / state.leverage;
      if (marginRequired > availableBalance) {
        alert('Insufficient margin (USDT)');
        return;
      }

      const newOrder: Order = {
        id: Math.random().toString(36).substring(7),
        type: 'LIMIT',
        side: side,
        price,
        amount,
        status: 'OPEN',
        timestamp: Date.now(),
      };
      set({
        openOrders: [newOrder, ...state.openOrders]
      });
    }
  },

  cancelOrder: (id) => {
    const state = get();
    set({
      openOrders: state.openOrders.filter(o => o.id !== id)
    });
  }
}));
