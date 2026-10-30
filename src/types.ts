/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialType = 'Polymer-A' | 'Polymer-B';

export type { Language } from './i18n/types';

export interface DashboardState {
  pressure: number; // psi (0 to 10)
  temperature: number; // °C (15 to 35)
  dispensingSpeed: number; // mm/s (5 to 30)
  materialType: MaterialType;
  showHistoricalData: boolean;
}

export interface MetricDataPoint {
  time: string;
  actual: number;
  theoretical: number;
}

export interface SensitivityPoint {
  x: number;
  y: number;
}
