import { useEffect, useRef, useState } from 'react';
import { useTradingStore } from '@/store/useTradingStore';

export type KlineData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OrderBookEntry = [number, number]; // [price, quantity]

export type OrderBookData = {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
};

export type RecentTradeData = {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
};

export type TickerData = {
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
};

export function useBinanceWebSocket(symbol: string = 'btcusdt', interval: string = '1m') {
  const [klineData, setKlineData] = useState<KlineData | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<RecentTradeData[]>([]);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const setCurrentPrice = useTradingStore(state => state.setCurrentPrice);
  
  const wsRef = useRef<WebSocket | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedWsMessage = useRef(false);

  useEffect(() => {
    setKlineData(null);
    hasReceivedWsMessage.current = false;
    
    const binanceInterval = interval === '1y' ? '1d' : interval;
    
    const streams = [
      `${symbol}@kline_${binanceInterval}`,
      `${symbol}@depth20@100ms`,
      `${symbol}@trade`,
      `${symbol}@ticker`
    ].join('/');
    
    const wsUrls = [
      `wss://stream.binance.com:9443/stream?streams=${streams}`,
      `wss://data-stream.binance.vision:9443/stream?streams=${streams}`,
      `wss://stream.binance.us:9443/stream?streams=${streams}`
    ];
    
    let currentUrlIndex = 0;
    
    const connectWs = () => {
      if (currentUrlIndex >= wsUrls.length) {
        startFallbackPolling();
        return;
      }
      
      try {
        const ws = new WebSocket(wsUrls[currentUrlIndex]);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Connected to Binance WS:', wsUrls[currentUrlIndex]);
        };

        ws.onmessage = (event) => {
          hasReceivedWsMessage.current = true;
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }

          const message = JSON.parse(event.data);
          if (!message.data) return;

          const stream = message.stream;
          const data = message.data;

          if (stream.includes('@kline_')) {
            const kline = data.k;
            const newKline: KlineData = {
              time: Math.floor(kline.t / 1000),
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v),
            };
            setKlineData(newKline);
            setCurrentPrice(newKline.close);
          } else if (stream.includes('@depth')) {
            setOrderBook({
              bids: data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
              asks: data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
            });
          } else if (stream.includes('@trade')) {
            setRecentTrades(prev => {
              const newTrade: RecentTradeData = {
                id: data.t,
                price: parseFloat(data.p),
                quantity: parseFloat(data.q),
                time: data.T,
                isBuyerMaker: data.m,
              };
              return [newTrade, ...prev].slice(0, 50);
            });
          } else if (stream.includes('@ticker')) {
            setTicker({
              priceChange: parseFloat(data.p),
              priceChangePercent: parseFloat(data.P),
              highPrice: parseFloat(data.h),
              lowPrice: parseFloat(data.l),
              volume: parseFloat(data.v),
              quoteVolume: parseFloat(data.q),
            });
          }
        };

        ws.onerror = () => {
          console.warn('WS Error, trying next URL...');
        };

        ws.onclose = () => {
          if (!hasReceivedWsMessage.current) {
            currentUrlIndex++;
            connectWs();
          }
        };
      } catch (e) {
        currentUrlIndex++;
        connectWs();
      }
    };

    const startFallbackPolling = () => {
      console.log('Starting fallback polling via Next.js API...');
      const poll = async () => {
        try {
          const res = await fetch(`/api/market-data?symbol=${symbol}&interval=${binanceInterval}`);
          if (res.ok) {
            const data = await res.json();
            
            if (data.ticker) {
              setTicker({
                priceChange: parseFloat(data.ticker.priceChange),
                priceChangePercent: parseFloat(data.ticker.priceChangePercent),
                highPrice: parseFloat(data.ticker.highPrice),
                lowPrice: parseFloat(data.ticker.lowPrice),
                volume: parseFloat(data.ticker.volume),
                quoteVolume: parseFloat(data.ticker.quoteVolume),
              });
              setCurrentPrice(parseFloat(data.ticker.lastPrice));
            }
            
            if (data.kline) {
              setKlineData({
                time: Math.floor(data.kline[0] / 1000),
                open: parseFloat(data.kline[1]),
                high: parseFloat(data.kline[2]),
                low: parseFloat(data.kline[3]),
                close: parseFloat(data.kline[4]),
                volume: parseFloat(data.kline[5]),
              });
            }
            
            if (data.depth) {
              setOrderBook({
                bids: data.depth.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
                asks: data.depth.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
              });
            }
            
            if (data.trades) {
              setRecentTrades(data.trades.map((t: any) => ({
                id: t.id,
                price: parseFloat(t.price),
                quantity: parseFloat(t.qty),
                time: t.time,
                isBuyerMaker: t.isBuyerMaker,
              })));
            }
          }
        } catch (e) {
          console.error('Polling failed', e);
        }
      };
      
      poll();
      fallbackIntervalRef.current = setInterval(poll, 3000);
    };

    connectWs();

    // Set a timeout to force fallback if WS doesn't connect/send data within 3 seconds
    const fallbackTimeout = setTimeout(() => {
      if (!hasReceivedWsMessage.current) {
        console.warn('WS connected but no data received within 3s, falling back to polling...');
        if (wsRef.current) wsRef.current.close();
        startFallbackPolling();
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [symbol, interval, setCurrentPrice]);

  return { klineData, orderBook, recentTrades, ticker };
}
