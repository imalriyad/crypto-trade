import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTCUSDT';
  const interval = searchParams.get('interval') || '1m';
  const limit = searchParams.get('limit') || '1000';

  // Try multiple Binance API endpoints in case of geo-blocking (e.g., US users)
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
    `https://api.binance.us/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        next: { revalidate: 60 } // Optional caching
      });
      
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (e) {
      console.warn(`Failed to fetch from ${endpoint}`);
    }
  }

  return NextResponse.json({ error: 'Failed to fetch historical data from all endpoints' }, { status: 500 });
}
