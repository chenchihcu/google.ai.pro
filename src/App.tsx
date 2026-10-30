/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Bell,
  Box,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  Download,
  Globe,
  Grid,
  Info,
  Layers,
  LineChart,
  Maximize2,
  Menu,
  Minus,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { DashboardState, MetricDataPoint } from './types';
import {
  calculateTheoreticalFlow,
  calculateActualFlow,
  calculateDataQuality,
  generateInsights,
} from './utils';
import ThreeDView from './components/ThreeDView';
import SensitivitySpark from './components/SensitivitySpark';
import FlowTrends from './components/FlowTrends';
import { useLanguage } from './i18n';

export type ViewMode = 'overview' | 'threed' | 'trends' | 'controls';

export default function App() {
  const { language, toggleLanguage, t } = useLanguage();

  // 1. Core Parameter Control States
  const [state, setState] = useState<DashboardState>({
    pressure: 5.2, // psi
    temperature: 25.0, // °C
    dispensingSpeed: 15, // mm/s
    materialType: 'Polymer-A',
    showHistoricalData: false,
  });

  // UI / View Modes & Navigation States
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Current calculated values
  const theoreticalFlow = calculateTheoreticalFlow(
    state.pressure,
    state.temperature,
    state.dispensingSpeed,
    state.materialType
  );

  const [actualFlow, setActualFlow] = useState<number>(theoreticalFlow);
  const [, setTick] = useState<number>(0);

  // 2. Telemetry Timeline Roll History (Stores last 30 measurements)
  const [history, setHistory] = useState<MetricDataPoint[]>([]);

  // Seed initial rolling history with slightly varied points centered on startup parameters
  useEffect(() => {
    const initialPoints: MetricDataPoint[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const pastTime = new Date(now.getTime() - i * 5000);
      const timeStr = pastTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const virtualTick = 30 - i;
      const tFlow = calculateTheoreticalFlow(
        state.pressure,
        state.temperature,
        state.dispensingSpeed,
        state.materialType
      );
      const aFlow = calculateActualFlow(tFlow, virtualTick, state.showHistoricalData);

      initialPoints.push({
        time: timeStr,
        actual: aFlow,
        theoretical: tFlow,
      });
    }

    setHistory(initialPoints);
    setTick(30);
  }, []);

  // Live updates simulator: run a tick incrementor and push to data history stream
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => {
        const nextTick = prev + 1;

        const activeTFlow = calculateTheoreticalFlow(
          state.pressure,
          state.temperature,
          state.dispensingSpeed,
          state.materialType
        );
        const activeAFlow = calculateActualFlow(activeTFlow, nextTick, state.showHistoricalData);

        setActualFlow(activeAFlow);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        setHistory((prevHistory) => {
          const cut = prevHistory.length >= 30 ? prevHistory.slice(1) : prevHistory;
          return [
            ...cut,
            {
              time: timeStr,
              actual: activeAFlow,
              theoretical: activeTFlow,
            },
          ];
        });

        return nextTick;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [state, theoreticalFlow]);

  // Handle instant feedback adjustments when sliders change
  const handleSliderChange = (id: keyof DashboardState, value: number) => {
    setState((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Stepper adjustments for touch targets & mobile buttons
  const stepValue = (key: 'pressure' | 'temperature' | 'dispensingSpeed', delta: number) => {
    setState((prev) => {
      let nextVal = prev[key] + delta;
      if (key === 'pressure') {
        nextVal = Math.max(0, Math.min(10, parseFloat(nextVal.toFixed(1))));
      } else if (key === 'temperature') {
        nextVal = Math.max(15, Math.min(35, parseFloat(nextVal.toFixed(1))));
      } else if (key === 'dispensingSpeed') {
        nextVal = Math.max(5, Math.min(30, Math.round(nextVal)));
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // Reset Simulation variables
  const handleReset = () => {
    setState({
      pressure: 5.2,
      temperature: 25.0,
      dispensingSpeed: 15,
      materialType: 'Polymer-A',
      showHistoricalData: false,
    });
  };

  // Export telemetries as browser-native CSV file
  const handleExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent +=
      `${t.csv.headerTimestamp},${t.csv.headerPressure},${t.csv.headerTemperature},${t.csv.headerSpeed},${t.csv.headerMaterial},${t.csv.headerActualFlow},${t.csv.headerTheoreticalFlow}\n`;

    history.forEach((row) => {
      csvContent += `${row.time},${state.pressure},${state.temperature},${state.dispensingSpeed},${state.materialType},${row.actual},${row.theoretical}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `animated_flow_analytics_data_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Derived calculation bindings
  const { consistency, stability, accuracy } = calculateDataQuality(
    state.pressure,
    state.temperature,
    state.dispensingSpeed,
    state.materialType
  );

  const insights = generateInsights(
    state.pressure,
    state.temperature,
    state.dispensingSpeed,
    state.materialType,
    actualFlow,
    language
  );

  // View modes navigation definitions
  const viewModesList = [
    { id: 'overview' as ViewMode, label: t.navigation.overview, shortLabel: t.navigation.overviewShort, icon: Grid },
    { id: 'threed' as ViewMode, label: t.navigation.threed, shortLabel: t.navigation.threedShort, icon: Box },
    { id: 'trends' as ViewMode, label: t.navigation.trends, shortLabel: t.navigation.trendsShort, icon: LineChart },
    { id: 'controls' as ViewMode, label: t.navigation.controls, shortLabel: t.navigation.controlsShort, icon: Sliders },
  ];

  /* ------------------- Subcomponents: Parameter Controls Card ------------------- */
  const renderParameterControlsCard = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-5">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase font-semibold">
            {t.parameters.title}
          </span>
          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
            {t.parameters.liveInput}
          </span>
        </div>

        {/* Sliders with Touch Steppers */}
        <div className="space-y-6">
          {/* 1. Pressure Selector */}
          <div id="control-pressure-wrapper">
            <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-medium">
              <span className="text-slate-500 tracking-wider">{t.parameters.pressure}</span>
              <span className="text-indigo-600 font-bold text-sm">
                {state.pressure.toFixed(1)} psi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepValue('pressure', -0.1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer touch-manipulation"
                aria-label={t.parameters.decreasePressure}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={state.pressure}
                onChange={(e) => handleSliderChange('pressure', parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-100 hover:bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all"
                id="slider-control-pressure"
                aria-label={t.parameters.pressure}
              />
              <button
                type="button"
                onClick={() => stepValue('pressure', 0.1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer touch-manipulation"
                aria-label={t.parameters.increasePressure}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1 px-10">
              <span>0.0 psi</span>
              <span>5.0 psi</span>
              <span>10.0 psi</span>
            </div>
          </div>

          {/* 2. Temperature Selector */}
          <div id="control-temperature-wrapper">
            <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-medium">
              <span className="text-slate-500 tracking-wider">{t.parameters.temperature}</span>
              <span className="text-amber-600 font-bold text-sm">
                {state.temperature.toFixed(1)} °C
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepValue('temperature', -0.5)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer touch-manipulation"
                aria-label={t.parameters.decreaseTemperature}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="15"
                max="35"
                step="0.5"
                value={state.temperature}
                onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-slate-100 hover:bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all"
                id="slider-control-temperature"
                aria-label={t.parameters.temperature}
              />
              <button
                type="button"
                onClick={() => stepValue('temperature', 0.5)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer touch-manipulation"
                aria-label={t.parameters.increaseTemperature}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1 px-10">
              <span>15.0 °C</span>
              <span>25.0 °C</span>
              <span>35.0 °C</span>
            </div>
          </div>

          {/* 3. Dispensing Speed Selector */}
          <div id="control-speed-wrapper">
            <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-medium">
              <span className="text-slate-500 tracking-wider">{t.parameters.dispensingSpeed}</span>
              <span className="text-indigo-600 font-bold text-sm">
                {state.dispensingSpeed} mm/s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepValue('dispensingSpeed', -1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer touch-manipulation"
                aria-label={t.parameters.decreaseSpeed}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={state.dispensingSpeed}
                onChange={(e) => handleSliderChange('dispensingSpeed', parseInt(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-100 hover:bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all"
                id="slider-control-speed"
                aria-label={t.parameters.dispensingSpeed}
              />
              <button
                type="button"
                onClick={() => stepValue('dispensingSpeed', 1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer touch-manipulation"
                aria-label={t.parameters.increaseSpeed}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1 px-10">
              <span>5 mm/s</span>
              <span>17 mm/s</span>
              <span>30 mm/s</span>
            </div>
          </div>
        </div>

        {/* Toggles layer */}
        <div className="space-y-4 mt-6 border-t border-slate-100 pt-5">
          {/* Material Switcher */}
          <div className="flex items-center justify-between" id="control-material-toggle">
            <div>
              <span className="text-xs font-mono text-slate-600 tracking-wider font-semibold block">
                {t.parameters.materialType}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {state.materialType === 'Polymer-A' ? t.parameters.highViscosity : t.parameters.lowViscosity}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  materialType: prev.materialType === 'Polymer-A' ? 'Polymer-B' : 'Polymer-A',
                }))
              }
              className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 bg-slate-100 border border-slate-200 cursor-pointer"
              role="switch"
              aria-checked={state.materialType === 'Polymer-B'}
              id="toggle-material-type"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-indigo-600 shadow-sm transition-transform duration-300 ${
                  state.materialType === 'Polymer-B' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* History Switcher */}
          <div className="flex items-center justify-between" id="control-history-toggle">
            <div>
              <span className="text-xs font-mono text-slate-600 tracking-wider font-semibold block">
                {t.parameters.historicalData}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {state.showHistoricalData ? t.parameters.archivalSmoothing : t.parameters.liveSensorStream}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  showHistoricalData: !prev.showHistoricalData,
                }))
              }
              className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 bg-slate-100 border border-slate-200 cursor-pointer"
              role="switch"
              aria-checked={state.showHistoricalData}
              id="toggle-historical-data"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform duration-300 ${
                  state.showHistoricalData ? 'translate-x-7 bg-indigo-600' : 'translate-x-1 bg-slate-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Informative Configuration Summary Label overlay block */}
      <div className="mt-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-[10px] font-mono text-slate-500">
        <div className="flex justify-between py-1 border-b border-slate-200/60 font-semibold text-slate-600">
          <span>{t.parameters.activeTarget}</span>
          <span className="text-indigo-600">{state.materialType}</span>
        </div>
        <div className="flex justify-between py-1 pt-1.5 font-semibold text-slate-600">
          <span>{t.parameters.stateLog}</span>
          <span className="text-indigo-600/90">
            {state.showHistoricalData ? t.parameters.archival : t.parameters.liveFeedTelemetry}
          </span>
        </div>
      </div>
    </div>
  );

  /* ------------------- Subcomponents: 3D Manifold Card ------------------- */
  const render3DManifoldCard = (isExpanded: boolean = false) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm h-full font-sans">
      <div>
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-slate-500 uppercase block font-semibold">
              {t.manifold3d.title}
            </span>
            <span className="hidden sm:inline-block text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              {t.manifold3d.wireframeBadge}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'threed' ? 'overview' : 'threed')}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            title={viewMode === 'threed' ? t.manifold3d.minimize : t.manifold3d.maximize}
            aria-label={viewMode === 'threed' ? t.manifold3d.minimize : t.manifold3d.maximize}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3D Model plotting canvas */}
        <div
          className={`relative border border-slate-200 bg-[#f8fafc] rounded-2xl overflow-hidden shadow-inner transition-all duration-300 ${
            isExpanded ? 'h-[440px] sm:h-[520px]' : 'h-[300px] sm:h-[340px]'
          }`}
          id="three-d-render-box"
        >
          <ThreeDView
            pressure={state.pressure}
            temperature={state.temperature}
            dispensingSpeed={state.dispensingSpeed}
            materialType={state.materialType}
          />
        </div>

        {/* Quality Parameter progress indicators stacked */}
        <div className="mt-5 space-y-3.5" id="data-quality-progress-stack">
          {/* 1. Consistency Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-500 font-semibold uppercase">
              <span>{t.manifold3d.consistencyQuality}</span>
              <span className="text-amber-600 font-bold">{consistency}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${consistency}%` }}
              />
            </div>
          </div>

          {/* 2. Stability Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-500 font-semibold uppercase">
              <span>{t.manifold3d.stabilityRating}</span>
              <span className="text-indigo-600 font-bold">{stability}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${stability}%` }}
              />
            </div>
          </div>

          {/* 3. Accuracy Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-500 font-semibold uppercase">
              <span>{t.manifold3d.accuracyCertificate}</span>
              <span className="text-emerald-600 font-bold">{accuracy}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${accuracy}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom control triggers actions */}
      <div className="flex gap-3 sm:gap-4 mt-6 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl border border-indigo-200 text-indigo-600 bg-white hover:bg-slate-50 active:bg-slate-100 font-mono text-xs hover:border-indigo-300 transition-colors uppercase cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 font-medium tracking-wider"
          id="btn-reset-simulation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.common.reset}</span>
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl bg-indigo-600 text-white font-mono text-xs hover:bg-indigo-700 hover:shadow-md transition-all uppercase cursor-pointer shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 font-medium tracking-wider"
          id="btn-export-telemetry"
        >
          <Download className="w-3.5 h-3.5 text-white/90" />
          <span>{t.common.export}</span>
        </button>
      </div>
    </div>
  );

  /* ------------------- Subcomponents: AI Insights Panel ------------------- */
  const renderAIInsightsPanel = () => (
    <div
      className="flex-grow bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col shadow-sm"
      id="data-insights-bullet-panel"
    >
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tracking-widest text-slate-500 uppercase block font-semibold">
            {t.insights.title}
          </span>
          <span className="text-[9px] text-amber-600 border border-amber-200/50 bg-amber-50 px-1.5 py-0.5 rounded-full font-mono uppercase font-bold">
            {t.insights.dynamicBadge}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono font-medium">
          <Cpu className="w-3 h-3 text-indigo-600" />
          <span className="hidden sm:inline">{t.insights.aiDrivenSummaries}</span>
        </div>
      </div>

      {/* Data Bullets List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-1 text-[11px] sm:text-xs">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="flex gap-2.5 items-start select-none group border-l-2 border-slate-100 pl-3.5 py-1.5 hover:border-indigo-500/60 transition-colors rounded-r-lg hover:bg-slate-50/50"
          >
            <span className="mt-0.5 text-indigo-600 flex-shrink-0">
              <Zap className="w-3.5 h-3.5 fill-indigo-100/40" />
            </span>
            <p className="text-slate-600 leading-relaxed font-sans">{insight}</p>
          </div>
        ))}
      </div>

      {/* Diagnostic systems stamp */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between text-[9px] font-mono text-slate-400">
        <div className="flex items-center gap-1 font-medium">
          <Info className="w-3 h-3 text-slate-400" />
          <span>{t.common.modelVer}</span>
        </div>
        <span className="font-semibold text-indigo-600/90">{t.common.feedNominal}</span>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white"
      id="dashboard-root-wrapper"
    >
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. Sidebar Left (Responsive Drawer on Mobile, Collapsible on Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 flex flex-col border-r border-slate-800 text-slate-300 select-none transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'w-72 lg:w-64'} shrink-0`}
        id="dashboard-sidebar"
      >
        {/* Logo and branding header section */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-md flex items-center justify-center rotate-45 transform shrink-0">
              <Activity className="w-4 h-4 text-white -rotate-45" />
            </div>
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <div className="min-w-0">
                <h2 className="text-sm font-semibold tracking-wider text-white font-mono uppercase truncate">
                  KINETIC FLOW
                </h2>
                <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block -mt-0.5">
                  {t.common.systemV3}
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800 transition-colors"
            aria-label={t.common.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {(!sidebarCollapsed || mobileMenuOpen) && (
            <div className="text-[10px] uppercase tracking-widest font-mono font-semibold text-slate-500 px-3 mb-2">
              {t.navigation.mainConsoles}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setViewMode('overview');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              viewMode === 'overview'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Grid className="w-4 h-4 text-indigo-500 shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && <span>{t.navigation.overview}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('trends');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              viewMode === 'trends'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && <span>{t.navigation.trends}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('threed');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              viewMode === 'threed'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && <span>{t.navigation.threed}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('controls');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              viewMode === 'controls'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            {(!sidebarCollapsed || mobileMenuOpen) && <span>{t.navigation.controls}</span>}
          </button>

          {(!sidebarCollapsed || mobileMenuOpen) && (
            <>
              <div className="pt-6 text-[10px] uppercase tracking-widest font-mono font-semibold text-slate-500 px-3 mb-2">
                {t.navigation.systemStatus}
              </div>
              <div className="px-3 py-2 text-xs text-slate-400 flex items-center justify-between">
                <span>{t.common.connectionStatus}</span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  {t.common.onlineMonitoring}
                </span>
              </div>
            </>
          )}
        </nav>

        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:flex items-center justify-center p-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title={sidebarCollapsed ? t.common.expandSidebar : t.common.collapseSidebar}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] font-mono">{t.common.collapseSidebar}</span>
              </>
            )}
          </button>
        </div>

        {/* User Identity drawer bottom */}
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <div className="p-4 border-t border-slate-800 select-none bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 font-bold flex items-center justify-center text-xs text-indigo-400">
                CC
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">Chih-Fu Chen</p>
                <p className="text-[10px] font-mono text-slate-500 truncate">chihfu.chen.tw</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>{t.common.engineerRole}</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.common.nominal}
              </span>
            </div>
            {/* Sidebar Language Switcher */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">{t.header.langSwitch}</span>
              <button
                type="button"
                onClick={toggleLanguage}
                className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>{language === 'zh' ? 'English' : '繁體中文'}</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Main Content Right Panel */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0" id="dashboard-content-frame">
        {/* Header toolbar */}
        <header
          className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-10"
          id="header-bar"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label={t.common.openMenu}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex flex-col min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
                {t.header.title}
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono -mt-0.5 hidden xs:block truncate">
                {t.header.subtitle}
              </p>
            </div>
          </div>

          {/* Center: View Modes Segmented Control (Visible on sm+ screens) */}
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {viewModesList.map((vm) => {
              const IconComp = vm.icon;
              const isActive = viewMode === vm.id;
              return (
                <button
                  key={vm.id}
                  type="button"
                  onClick={() => setViewMode(vm.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{vm.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Header Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 transition-colors cursor-pointer shadow-xs"
              title={t.header.langSwitch}
              aria-label={t.header.langSwitch}
              id="header-lang-switch-btn"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold text-indigo-700">{language === 'zh' ? 'EN' : '中文'}</span>
            </button>

            {/* Notifications Alert icon */}
            <button
              type="button"
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer flex items-center justify-center"
              title={t.common.notifications}
              id="header-notification-bell"
              aria-label={t.common.notifications}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
            </button>

            {/* Header Export Action Pill */}
            <button
              type="button"
              onClick={handleExport}
              className="px-3 sm:px-4 py-2 font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 font-mono transition-all rounded-full flex items-center gap-1.5 shadow-sm shadow-indigo-100 uppercase cursor-pointer"
              id="header-export-btn"
              title={t.common.exportCsv}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.common.exportData}</span>
            </button>
          </div>
        </header>

        {/* Horizontal Subheader crumbs pathway */}
        <div
          className="px-4 sm:px-8 py-2 bg-slate-50 border-b border-slate-200/60 text-[10px] sm:text-xs font-mono text-slate-400 flex items-center justify-between select-none shrink-0"
          id="crumbs-path"
        >
          <div className="flex items-center truncate">
            <span className="hover:text-slate-600 transition-colors cursor-pointer hidden sm:inline">
              {t.header.breadcrumbsRoot}
            </span>
            <span className="mx-2 text-slate-400 hidden sm:inline">&gt;</span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">
              {t.header.breadcrumbsSub}
            </span>
            <span className="mx-2 text-slate-400">&gt;</span>
            <span className="text-indigo-600 font-bold uppercase truncate">
              {viewModesList.find((v) => v.id === viewMode)?.label}
            </span>
          </div>
          <div className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-medium shrink-0">
            {t.common.systemVer}
          </div>
        </div>

        {/* Embedded Content View Modes */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto" id="dashboard-view-container">
          {/* 1. OVERVIEW MODE (Bento Grid) */}
          {viewMode === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-bento-grid">
              {/* Column 1: Parameter Controls */}
              <div className="col-span-1 lg:col-span-3 flex flex-col gap-6" id="column-left-controls">
                {renderParameterControlsCard()}
                <div className="flex gap-3 sm:gap-4" id="viscosity-needle-sensitivity-grid">
                  <SensitivitySpark
                    title={t.sensitivity.viscosityTitle}
                    level={state.temperature < 20 || state.materialType === 'Polymer-A' ? t.sensitivity.levelHigh : t.sensitivity.levelMedium}
                    value={state.materialType === 'Polymer-A' ? '+0.85' : '+0.68'}
                    color="cyan"
                    baseSlope={state.materialType === 'Polymer-A' ? 0.72 : 0.54}
                  />
                  <SensitivitySpark
                    title={t.sensitivity.needleTitle}
                    level={state.dispensingSpeed > 20 ? t.sensitivity.levelHigh : t.sensitivity.levelMedium}
                    value={state.dispensingSpeed > 20 ? '+0.61' : '+0.42'}
                    color="orange"
                    baseSlope={state.dispensingSpeed > 20 ? 0.58 : 0.38}
                  />
                </div>
              </div>

              {/* Column 2: 3D Manifold Relationship */}
              <div className="col-span-1 lg:col-span-5 flex flex-col gap-6" id="column-middle-manifold">
                {render3DManifoldCard(false)}
              </div>

              {/* Column 3: Flow Trends & Insights */}
              <div className="col-span-1 lg:col-span-4 flex flex-col gap-6" id="column-right-insights">
                <FlowTrends
                  currentFlowRate={actualFlow}
                  theoreticalFlowRate={theoreticalFlow}
                  trendHistory={history}
                />
                {renderAIInsightsPanel()}
              </div>
            </div>
          )}

          {/* 2. 3D SIMULATION FOCUS MODE */}
          {viewMode === 'threed' && (
            <div className="space-y-6 max-w-6xl mx-auto" id="threed-focus-view">
              {render3DManifoldCard(true)}
              {/* Quick slider floating dock for 3D tuning */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                    {t.manifold3d.tunerTitle}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-medium">
                    {t.manifold3d.surfaceDeformation}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Pressure Quick Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-500">{t.parameters.pressure}</span>
                      <span className="text-indigo-600 font-bold">{state.pressure.toFixed(1)} psi</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={state.pressure}
                      onChange={(e) => handleSliderChange('pressure', parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                  </div>
                  {/* Temp Quick Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-500">{t.parameters.temperature}</span>
                      <span className="text-amber-600 font-bold">{state.temperature.toFixed(1)} °C</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="35"
                      step="0.5"
                      value={state.temperature}
                      onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                  </div>
                  {/* Speed Quick Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-500">{t.parameters.dispensingSpeed}</span>
                      <span className="text-indigo-600 font-bold">{state.dispensingSpeed} mm/s</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={state.dispensingSpeed}
                      onChange={(e) => handleSliderChange('dispensingSpeed', parseInt(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TRENDS & AI INSIGHTS MODE */}
          {viewMode === 'trends' && (
            <div className="space-y-6 max-w-6xl mx-auto" id="trends-focus-view">
              <FlowTrends
                currentFlowRate={actualFlow}
                theoreticalFlowRate={theoreticalFlow}
                trendHistory={history}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderAIInsightsPanel()}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-xs font-mono tracking-widest text-slate-500 uppercase block font-semibold mb-4 border-b border-slate-100 pb-2">
                      {t.telemetryTable.title}
                    </span>
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] text-slate-400">
                            <th className="py-2">{t.telemetryTable.time}</th>
                            <th className="py-2">{t.telemetryTable.actual}</th>
                            <th className="py-2">{t.telemetryTable.theoretical}</th>
                            <th className="py-2">{t.telemetryTable.delta}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {history.slice(-8).reverse().map((row, idx) => {
                            const diff = Math.abs(row.actual - row.theoretical);
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 text-slate-500">{row.time}</td>
                                <td className="py-2 font-bold text-indigo-600">{row.actual.toFixed(2)}</td>
                                <td className="py-2 text-amber-600">{row.theoretical.toFixed(2)}</td>
                                <td className="py-2 text-slate-400">±{diff.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.telemetryTable.downloadCsv}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. CONTROLS LAB MODE */}
          {viewMode === 'controls' && (
            <div className="max-w-4xl mx-auto space-y-6" id="controls-focus-view">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderParameterControlsCard()}
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <SensitivitySpark
                      title={t.sensitivity.viscosityTitle}
                      level={state.temperature < 20 || state.materialType === 'Polymer-A' ? t.sensitivity.levelHigh : t.sensitivity.levelMedium}
                      value={state.materialType === 'Polymer-A' ? '+0.85' : '+0.68'}
                      color="cyan"
                      baseSlope={state.materialType === 'Polymer-A' ? 0.72 : 0.54}
                    />
                    <SensitivitySpark
                      title={t.sensitivity.needleTitle}
                      level={state.dispensingSpeed > 20 ? t.sensitivity.levelHigh : t.sensitivity.levelMedium}
                      value={state.dispensingSpeed > 20 ? '+0.61' : '+0.42'}
                      color="orange"
                      baseSlope={state.dispensingSpeed > 20 ? 0.58 : 0.38}
                    />
                  </div>
                  {renderAIInsightsPanel()}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* 3. Footer System Integrity Indicators */}
        <footer
          className="w-full bg-white border-t border-slate-200 px-4 sm:px-8 py-3 flex flex-wrap gap-y-2 items-center justify-between text-[10px] font-mono text-slate-400 select-none z-10 shrink-0"
          id="dashboard-root-footer"
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_5px_#10b981]" />
              {t.common.systemStabilized}
            </span>
            <span className="hidden sm:inline text-slate-200">|</span>
            <span className="hidden sm:inline font-medium">{t.common.nodesOnline}</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-5 text-slate-400 font-medium">
            <span className="hidden xs:inline">{t.common.portInterlock}</span>
            <span>{t.common.fps}</span>
          </div>
        </footer>
      </div>

      {/* 4. Mobile Bottom Navigation Dock (iOS Safe Area Ergonomics) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 px-3 py-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)] flex items-center justify-around shadow-lg"
        id="mobile-bottom-nav"
      >
        {viewModesList.map((vm) => {
          const IconComp = vm.icon;
          const isActive = viewMode === vm.id;
          return (
            <button
              key={vm.id}
              type="button"
              onClick={() => setViewMode(vm.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <IconComp className={`w-4 h-4 mb-0.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-[10px] font-mono leading-tight">{vm.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
