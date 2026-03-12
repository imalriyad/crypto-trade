'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries } from 'lightweight-charts';
import { KlineData } from '@/hooks/useBinanceWebSocket';

interface ChartProps {
  symbol: string;
  interval: string;
  latestKline: KlineData | null;
}

export default function Chart({ symbol, interval, latestKline }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111827' }, // Tailwind gray-900
        textColor: '#9CA3AF', // Tailwind gray-400
      },
      grid: {
        vertLines: { color: '#1F2937' }, // Tailwind gray-800
        horzLines: { color: '#1F2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981', // emerald-500
      downColor: '#EF4444', // red-500
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Fetch historical data
    const fetchHistory = async () => {
      try {
        const binanceInterval = interval === '1y' ? '1d' : interval;
        const limit = interval === '1y' ? 365 : 1000;
        const res = await fetch(`/api/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch from proxy');
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        const formattedData = data.map((d: any) => ({
          time: (d[0] / 1000) as Time,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));
        candlestickSeries.setData(formattedData);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch historical data', err);
        setIsLoading(false);
      }
    };

    fetchHistory();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, interval]);

  // Update with latest kline from WS
  useEffect(() => {
    if (seriesRef.current && latestKline) {
      try {
        seriesRef.current.update({
          time: latestKline.time as Time,
          open: latestKline.open,
          high: latestKline.high,
          low: latestKline.low,
          close: latestKline.close,
        });
      } catch (e) {
        console.warn('Ignored chart update error (likely stale data during interval switch):', e);
      }
    }
  }, [latestKline]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gray-900 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}
      <div ref={chartContainerRef} className="absolute inset-0" />
    </div>
  );
}
