/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialType, MetricDataPoint, SensitivityPoint } from './types';

/**
 * Calculates theoretical flow rate based on physical simulation parameters.
 * At P = 5.2, T = 25, S = 15, the result is exactly 13.8.
 */
export function calculateTheoreticalFlow(
  pressure: number,
  temperature: number,
  speed: number,
  material: MaterialType
): number {
  // Base linear model
  let val = pressure * 1.5 + speed * 0.2 + (temperature - 15) * 0.2 + 1.0;
  
  // Adjust based on material type
  if (material === 'Polymer-B') {
    val *= 1.15; // Polymer B is less viscous
  }
  
  return parseFloat(val.toFixed(2));
}

/**
 * Calculates current actual flow rate with high-fidelity wave and noise simulations.
 */
export function calculateActualFlow(
  theoreticalValue: number,
  tick: number,
  showHistoricalData: boolean
): number {
  if (!showHistoricalData) {
    // Standard run with active dynamic oscillation
    const noise = Math.sin(tick * 0.3) * 1.8 + Math.cos(tick * 0.15) * 0.8;
    const microJitter = (Math.sin(tick * 1.2) * 0.3);
    const result = theoreticalValue + noise + microJitter;
    return parseFloat(Math.max(0.1, result).toFixed(2));
  } else {
    // Smoother historical look
    const noise = Math.sin(tick * 0.1) * 0.5;
    return parseFloat(Math.max(0.1, theoreticalValue + noise).toFixed(2));
  }
}

/**
 * Renders data quality ratings based on parameters
 * Base values from image: 57%, 30%, 13%
 */
export function calculateDataQuality(
  pressure: number,
  temperature: number,
  speed: number,
  material: MaterialType
): { consistency: number; stability: number; accuracy: number } {
  // Base values
  let consistency = 57;
  let stability = 30;
  let accuracy = 13;

  // Let parameters affect quality so that it's interactive!
  // High pressure degrades stability
  if (pressure > 7) {
    stability -= Math.floor((pressure - 7) * 4);
    accuracy += Math.floor((pressure - 7) * 2);
  } else if (pressure < 3) {
    consistency -= Math.floor((3 - pressure) * 3);
  }

  // Extreme speed degrades consistency
  if (speed > 20) {
    consistency -= Math.floor((speed - 20) * 1.5);
    stability += Math.floor((speed - 20) * 0.5);
  }

  // Temperature variance affects performance
  const tempDiff = Math.abs(temperature - 25);
  if (tempDiff > 5) {
    consistency -= Math.floor(tempDiff * 0.8);
    accuracy -= Math.floor(tempDiff * 0.4);
  }

  if (material === 'Polymer-B') {
    consistency += 2;
    stability -= 3;
    accuracy += 1;
  }

  // Make sure bounds are kept cleanly
  consistency = Math.max(10, Math.min(95, consistency));
  stability = Math.max(10, Math.min(95, stability));
  accuracy = Math.max(5, Math.min(95, accuracy));

  return { consistency, stability, accuracy };
}

/**
 * Generates interactive dynamic analytical text statements matching the reference UI
 */
export function generateInsights(
  pressure: number,
  temperature: number,
  speed: number,
  material: MaterialType,
  flowRate: number
): string[] {
  const insights: string[] = [];

  // Insight 1: Temperature & Consistency relationship
  const tempPerf = material === 'Polymer-A' ? '12%' : '18%';
  if (temperature < 22) {
    insights.push(`Low temperature (${temperature.toFixed(1)}°C) increases fluid flow viscosity, consider warming for a ${tempPerf} consistency gain.`);
  } else {
    insights.push(`Increasing temperature by 5 degrees improves flow consistency by ${tempPerf}.`);
  }

  // Insight 2: Material pressure sensitivity
  if (pressure > 7.5) {
    insights.push(`Critical: High pressure of ${pressure.toFixed(1)} psi poses high shearing stresses for ${material}.`);
  } else {
    insights.push(`Pressure sensitivity is ${pressure > 5 ? 'high' : 'nominal'} for current ${material === 'Polymer-A' ? 'Polymer-A' : 'Polymer-B'} material configuration.`);
  }

  // Insight 3: Dispensing Speed balance
  if (speed > 22) {
    insights.push(`At ${speed} mm/s dispensing speed, nozzle drag-coefficient increases; match with +0.5 psi pressure.`);
  } else {
    insights.push(`Theoretical flow output matches actual throughput margin with only ${((Math.abs(flowRate - (pressure*1.5)) / flowRate) * 100).toFixed(1)}% variance.`);
  }

  // Insight 4: Structural material recommendation
  if (material === 'Polymer-A') {
    insights.push("Stability and laminar state are optimal under current low shear speed envelopes.");
  } else {
    insights.push("Polymer-B's low-viscosity properties improve accuracy yields but can lead to dynamic pooling.");
  }

  return insights;
}

/**
 * Generates mock scatter regression points for sensitivity graphs
 */
export function generateSensitivityScatter(
  baseSlope: number,
  pointsCount: number = 10
): { points: SensitivityPoint[]; slope: number; intercept: number } {
  const points: SensitivityPoint[] = [];
  const slope = baseSlope;
  const intercept = 0.15;

  for (let i = 0; i < pointsCount; i++) {
    const x = i / (pointsCount - 1); // normalized 0 to 1
    // Add jitter
    const yVal = slope * x + intercept + (Math.random() - 0.5) * 0.14;
    points.push({ x, y: Math.max(0, Math.min(1, yVal)) });
  }

  return { points, slope, intercept };
}
