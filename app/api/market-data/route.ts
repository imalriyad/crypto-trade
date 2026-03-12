import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const interval = searchParams.get('interval') || '1m';
  
  const endpoints = [
    'https://api.binance.com/api/v3',
    'https://data-api.binance.vision/api/v3',
    'https://api.binance.us/api/v3'
  ];

  for (const base of endpoints) {
    try {
      const [tickerRes, depthRes, tradesRes, klineRes] = await Promise.all([
        fetch(`${base}/ticker/24hr?symbol=${symbol.toUpperCase()}`),
        fetch(`${base}/depth?symbol=${symbol.toUpperCase()}&limit=20`),
        fetch(`${base}/trades?symbol=${symbol.toUpperCase()}&limit=50`),
        fetch(`${base}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=1`)
      ]);

      if (tickerRes.ok && depthRes.ok && tradesRes.ok && klineRes.ok) {
        const ticker = await tickerRes.json();
        const depth = await depthRes.json();
        const trades = await tradesRes.json();
        const klines = await klineRes.json();
        
        return NextResponse.json({ ticker, depth, trades, kline: klines[0] });
      }
    } catch (e) {
      console.warn(`Failed to fetch from ${base}`);
    }
  }

  return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
}
