/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { generateSensitivityScatter } from '../utils';

interface SensitivitySparkProps {
  id?: string;
  title: string;
  level: string; // "High" or "Medium" or "Low" or localized
  value: string; // "+0.85"
  color: 'cyan' | 'orange';
  baseSlope: number; // Slope factor for the fit line
}

export default function SensitivitySpark({
  id,
  title,
  level,
  value,
  color,
  baseSlope,
}: SensitivitySparkProps) {
  // Generate random stable scatter points around regression line
  const data = useMemo(() => {
    return generateSensitivityScatter(baseSlope, 12);
  }, [baseSlope]);

  const activeColorCode = color === 'cyan' ? '#4f46e5' : '#d97706';
  const glowColorCode = color === 'cyan' ? 'rgba(79, 70, 229, 0.3)' : 'rgba(217, 119, 6, 0.3)';

  // Canvas bounds for SVG
  const width = 160;
  const height = 70;
  const padding = 8;

  // Projection math
  const getSvgCoords = (x: number, y: number) => {
    // x, y are in range 0..1
    const svgX = padding + x * (width - padding * 2);
    // Invert Y so 1 is at top
    const svgY = height - padding - y * (height - padding * 2);
    return { x: svgX, y: svgY };
  };

  // Build regression line path coordinates
  const lineStart = getSvgCoords(0, data.intercept);
  const lineEnd = getSvgCoords(1, data.slope + data.intercept);

  return (
    <div
      className="flex-1 min-w-0 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm"
      id={id || `sensitivity-spark-${color}`}
    >
      <div>
        <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block font-semibold">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className={`text-lg font-bold ${
              color === 'cyan' ? 'text-indigo-600' : 'text-amber-600'
            }`}
          >
            {level}
          </span>
          <span className="text-xs font-mono text-slate-400 font-medium">{value}</span>
        </div>
      </div>

      {/* SVG Scatter Plot Plotter */}
      <div className="relative h-[70px] w-full mt-2">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {/* Subtle Grid Divider Lines */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="1"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="1"
          />
          
          <line
            x1={padding}
            y1={(height - padding) / 2 + padding / 2}
            x2={width - padding}
            y2={(height - padding) / 2 + padding / 2}
            stroke="rgba(148, 163, 184, 0.15)"
            strokeDasharray="2,2"
            strokeWidth="1"
          />

          {/* Scatter Points */}
          {data.points.map((p, idx) => {
            const coords = getSvgCoords(p.x, p.y);
            return (
              <circle
                key={idx}
                cx={coords.x}
                cy={coords.y}
                r="1.8"
                fill={activeColorCode}
                fillOpacity="0.8"
              />
            );
          })}

          {/* Glowing Fit Regression Line */}
          <line
            x1={lineStart.x}
            y1={lineStart.y}
            x2={lineEnd.x}
            y2={lineEnd.y}
            stroke={activeColorCode}
            strokeWidth="1.8"
            style={{ filter: `drop-shadow(0px 0px 4px ${glowColorCode})` }}
          />
        </svg>

        {/* Floating Tick Labels in Corners */}
        <div className="absolute left-0 bottom-0 text-[8px] font-mono text-slate-400 font-medium">0.0</div>
        <div className="absolute right-0 bottom-0 text-[8px] font-mono text-slate-400 font-medium">1.0</div>
        <div className="absolute left-0 top-0 text-[8px] font-mono text-slate-400 font-medium">
          {color === 'cyan' ? '+0.9' : '+0.6'}
        </div>
      </div>
    </div>
  );
}
