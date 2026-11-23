/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ChartPoint, ChartRange } from '../types/market';

interface PriceChartProps {
  points: ChartPoint[];
  currency?: string;
  range?: ChartRange;
  onRangeChange?: (range: ChartRange) => void;
  isLoading?: boolean;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

const RANGE_OPTIONS: Array<{ value: ChartRange; label: string }> = [
  { value: '5d', label: '5H' },
  { value: '1mo', label: '1B' },
  { value: '3mo', label: '3B' },
  { value: '6mo', label: '6B' },
  { value: '1y', label: '1T' },
];

export function formatFinancialNumber(val: number, currency = 'IDR'): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: val < 100 ? 2 : 0,
    }).format(val);
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export const PriceChart: React.FC<PriceChartProps> = ({
  points,
  currency = 'IDR',
  range,
  onRangeChange,
  isLoading = false,
  height = 210,
  valuePrefix,
  valueSuffix,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!points || points.length < 2) return null;
    const values = points.map((p) => p.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.08 || max * 0.01 || 1;
    const yMin = min - pad;
    const yMax = max + pad;
    const width = 640;
    const svgHeight = height;

    const coords = points.map((pt, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = svgHeight - ((pt.close - yMin) / (yMax - yMin)) * (svgHeight - 28) - 14;
      return { x, y, pt };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const areaPath = `${linePath} L ${width} ${svgHeight} L 0 ${svgHeight} Z`;

    const firstVal = points[0].close;
    const lastVal = points[points.length - 1].close;
    const isPositive = lastVal >= firstVal;

    return {
      coords,
      linePath,
      areaPath,
      min,
      max,
      firstVal,
      lastVal,
      isPositive,
      width,
      svgHeight,
    };
  }, [points, height]);

  const activePoint =
    hoverIndex !== null && points[hoverIndex]
      ? points[hoverIndex]
      : points.length > 0
      ? points[points.length - 1]
      : null;

  const prefix = valuePrefix !== undefined ? valuePrefix : currency === 'IDR' ? 'Rp ' : `${currency} `;

  return (
    <div className="space-y-3">
      {/* Top Bar: Active Point Value & Range Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {activePoint ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {prefix}
                {formatFinancialNumber(activePoint.close, currency)}
                {valueSuffix || ''}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {new Date(activePoint.isoDate).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          ) : (
            <span>Memuat titik historis...</span>
          )}
        </div>

        {range && onRangeChange && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onRangeChange(opt.value)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[32px] ${
                  range === opt.value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-2">
        {isLoading ? (
          <div
            style={{ height: `${height}px` }}
            className="w-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 animate-pulse"
          >
            Memuat grafik pergerakan historis...
          </div>
        ) : !chartData ? (
          <div
            style={{ height: `${height}px` }}
            className="w-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 px-4 text-center"
          >
            Data grafik historis belum tersedia untuk rentang ini.
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.svgHeight}`}
              className="w-full h-auto block select-none touch-pan-y"
              onMouseLeave={() => setHoverIndex(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const idx = Math.round(relX * (points.length - 1));
                setHoverIndex(idx);
              }}
              onTouchMove={(e) => {
                if (!e.touches[0]) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
                const idx = Math.round(relX * (points.length - 1));
                setHoverIndex(idx);
              }}
            >
              <defs>
                <linearGradient id={`chartGrad-${chartData.isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={chartData.isPositive ? '#16a34a' : '#dc2626'}
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor={chartData.isPositive ? '#16a34a' : '#dc2626'}
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {/* Subtle horizontal reference lines */}
              <line x1="0" y1="20" x2={chartData.width} y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="0" y1={chartData.svgHeight / 2} x2={chartData.width} y2={chartData.svgHeight / 2} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />
              <line x1="0" y1={chartData.svgHeight - 20} x2={chartData.width} y2={chartData.svgHeight - 20} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" strokeWidth="1" />

              {/* Area fill */}
              <path
                d={chartData.areaPath}
                fill={`url(#chartGrad-${chartData.isPositive ? 'up' : 'down'})`}
              />

              {/* Main Stroke */}
              <path
                d={chartData.linePath}
                fill="none"
                stroke={chartData.isPositive ? '#16a34a' : '#dc2626'}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Crosshair */}
              {hoverIndex !== null && chartData.coords[hoverIndex] && (
                <>
                  <line
                    x1={chartData.coords[hoverIndex].x}
                    y1={0}
                    x2={chartData.coords[hoverIndex].x}
                    y2={chartData.svgHeight}
                    stroke="currentColor"
                    className="text-slate-400 dark:text-slate-500"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={chartData.coords[hoverIndex].x}
                    cy={chartData.coords[hoverIndex].y}
                    r="4.5"
                    fill={chartData.isPositive ? '#16a34a' : '#dc2626'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>

            {/* Range Summary Footer */}
            <div className="flex items-center justify-between pt-1.5 px-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
              <span>
                Terendah: {prefix}
                {formatFinancialNumber(chartData.min, currency)}
                {valueSuffix || ''}
              </span>
              <span>
                Tertinggi: {prefix}
                {formatFinancialNumber(chartData.max, currency)}
                {valueSuffix || ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
