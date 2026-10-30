/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MetricDataPoint } from '../types';
import { useLanguage } from '../i18n';

interface FlowTrendsProps {
  currentFlowRate: number;
  theoreticalFlowRate: number;
  trendHistory: MetricDataPoint[];
}

export default function FlowTrends({
  currentFlowRate,
  theoreticalFlowRate,
  trendHistory,
}: FlowTrendsProps) {
  const { t } = useLanguage();
  
  // Semicircular Circular Gauge calculations
  // Max scale is 30 mg/sec
  const maxFlowScale = 30;
  const fillPercentage = Math.min(100, Math.max(0, (currentFlowRate / maxFlowScale) * 100));
  
  // Circular track values (r=42, circumference = ~263.89)
  const radius = 42;
  const strokeWidth = 6.5;
  const circ = 2 * Math.PI * radius;
  // Semicircular gap: we can leave 25% of the bottom open, or make a 3/4 circle.
  // Sweep angle: total path represents 270 degrees (3/4 circle), starting bottom-left to bottom-right.
  const angleSweep = 270;
  const pathTotalLength = circ * (angleSweep / 360); // 270/360 * 263.89 = ~197.92
  const strokeDashOffset = pathTotalLength - (fillPercentage / 100) * pathTotalLength;

  // Render SVG Path coordinate dimensions for timeline
  const width = 360;
  const height = 170;
  const paddingX = 30;
  const paddingY = 20;

  // Map timeline data points to SVG coordinate space
  const maxValY = 30; // Max flow scale for trends
  const minValY = 0;

  const pointsCount = trendHistory.length;

  const getTimelineCoords = (index: number, val: number) => {
    const x = paddingX + (index / Math.max(1, pointsCount - 1)) * (width - paddingX * 2);
    // Inverse scale for Y coordinate
    const normalizedY = (val - minValY) / (maxValY - minValY);
    const y = height - paddingY - normalizedY * (height - paddingY * 2);
    return { x, y };
  };

  // Build string SVG paths
  let actualPath = '';
  let theoreticalPath = '';

  if (pointsCount > 0) {
    // Actual path path build
    const startAct = getTimelineCoords(0, trendHistory[0].actual);
    actualPath = `M ${startAct.x} ${startAct.y}`;
    for (let i = 1; i < pointsCount; i++) {
      const p = getTimelineCoords(i, trendHistory[i].actual);
      actualPath += ` L ${p.x} ${p.y}`;
    }

    // Theoretical path path build
    const startTheo = getTimelineCoords(0, trendHistory[0].theoretical);
    theoreticalPath = `M ${startTheo.x} ${startTheo.y}`;
    for (let i = 1; i < pointsCount; i++) {
      const p = getTimelineCoords(i, trendHistory[i].theoretical);
      theoreticalPath += ` L ${p.x} ${p.y}`;
    }
  }

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col justify-between shadow-sm relative overflow-hidden"
      id="flow-rate-trends-panel"
    >
      {/* Panel header layout */}
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <div>
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase block font-semibold">
            {t.trends.title}
          </span>
          {/* Custom Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full bg-indigo-600 inline-block shadow-[0_0_4px_rgba(79,70,229,0.4)]"></span>
              <span className="text-slate-600 font-medium">{t.trends.actual}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="text-slate-500 font-medium">{t.trends.theoretical}</span>
            </div>
          </div>
        </div>

        {/* Double track circle radial gauge */}
        <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 self-end xs:self-auto" id="radial-flow-gauge">
          <svg className="w-full h-full -rotate-225" viewBox="0 0 100 100">
            {/* Ambient Background static ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              strokeDasharray={`${pathTotalLength} ${circ}`}
              strokeLinecap="round"
            />
            {/* Glow outer ring shadow layer */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="rgba(79, 70, 229, 0.18)"
              strokeWidth={strokeWidth + 2}
              strokeDasharray={`${pathTotalLength} ${circ}`}
              strokeDashoffset={strokeDashOffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
              style={{ filter: 'blur(2px)' }}
            />
            {/* Active filled glowing speed ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={strokeWidth}
              strokeDasharray={`${pathTotalLength} ${circ}`}
              strokeDashoffset={strokeDashOffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>

          {/* Centered numerical text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pt-2">
            <span className="text-xl font-mono font-bold text-slate-800 tracking-tight leading-none filter drop-shadow">
              {currentFlowRate.toFixed(1)}
            </span>
            <span className="text-[9px] font-mono font-medium text-slate-500 mt-1 leading-none">
              {t.common.unitMgSec}
            </span>
          </div>
        </div>
      </div>

      {/* Grid line chart timeline plot */}
      <div className="relative h-[170px] w-full mt-4">
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          {/* Subtle Grid reference markers */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={(height - paddingY * 2) * 0.33 + paddingY}
            x2={width - paddingX}
            y2={(height - paddingY * 2) * 0.33 + paddingY}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth="0.8"
            strokeDasharray="4,4"
          />
          <line
            x1={paddingX}
            y1={(height - paddingY * 2) * 0.66 + paddingY}
            x2={width - paddingX}
            y2={(height - paddingY * 2) * 0.66 + paddingY}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth="0.8"
            strokeDasharray="4,4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(148, 163, 184, 0.5)"
            strokeWidth="1"
          />

          {/* Vertical bounds lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={paddingX}
            y2={height - paddingY}
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="0.8"
          />
          <line
            x1={width - paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="0.8"
          />

          {/* Sparkline Theoretical Path */}
          {theoreticalPath && (
            <path
              d={theoreticalPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeOpacity="0.85"
              className="transition-all duration-300"
            />
          )}

          {/* Sparkline Actual Path with ambient glow shadow */}
          {actualPath && (
            <>
              <path
                d={actualPath}
                fill="none"
                stroke="rgba(79, 70, 229, 0.18)"
                strokeWidth="4"
                className="transition-all duration-100 ease-out"
                style={{ filter: 'blur(2px)' }}
              />
              <path
                d={actualPath}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-100 ease-out"
              />
            </>
          )}
        </svg>

        {/* Timelines Tick Labels on Axis */}
        <div className="absolute left-[26px] bottom-1 text-[8px] font-mono text-slate-400 font-medium">
          09:00
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[8px] font-mono text-slate-400 font-medium">
          12:00
        </div>
        <div className="absolute right-[26px] bottom-1 text-[8px] font-mono text-slate-400 font-medium">
          18:00
        </div>

        {/* Vertical Ticks on Y Axis */}
        <div className="absolute left-1 top-[14px] text-[8px] font-mono text-slate-400">30</div>
        <div className="absolute left-1 top-[60px] text-[8px] font-mono text-slate-400">20</div>
        <div className="absolute left-1 top-[106px] text-[8px] font-mono text-slate-400">10</div>
        <div className="absolute left-1 bottom-[16px] text-[8px] font-mono text-slate-400 font-semibold">
          0
        </div>
      </div>
    </div>
  );
}
