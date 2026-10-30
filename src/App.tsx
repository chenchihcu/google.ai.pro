/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Bell,
  Cpu,
  Database,
  Download,
  Grid,
  Info,
  Layers,
  Maximize2,
  RefreshCw,
  Sliders,
  TrendingUp,
  User,
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

export default function App() {
  // 1. Core Parameter Control States (seeded with screenshot defaults)
  const [state, setState] = useState<DashboardState>({
    pressure: 5.2, // psi
    temperature: 25.0, // °C
    dispensingSpeed: 15, // mm/s
    materialType: 'Polymer-A',
    showHistoricalData: false,
  });

  // Current calculated values
  const theoreticalFlow = calculateTheoreticalFlow(
    state.pressure,
    state.temperature,
    state.dispensingSpeed,
    state.materialType
  );

  const [actualFlow, setActualFlow] = useState<number>(theoreticalFlow);
  const [tick, setTick] = useState<number>(0);

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

      // Simple pseudo index for stable wave variation
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
        
        // Formulate current reading
        const activeTFlow = calculateTheoreticalFlow(
          state.pressure,
          state.temperature,
          state.dispensingSpeed,
          state.materialType
        );
        const activeAFlow = calculateActualFlow(activeTFlow, nextTick, state.showHistoricalData);
        
        // Update instant digital values
        setActualFlow(activeAFlow);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        // Append to rolling log stack, popped at 30 entries
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
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Timestamp,Pressure (psi),Temperature (C),Dispensing Speed (mm/s),Material,Actual Flow (mg/sec),Theoretical Flow (mg/sec)\n';
    
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
    actualFlow
  );
  return (
    <div
      className="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased selection:bg-indigo-505 selection:text-indigo-900"
      id="dashboard-root-wrapper"
    >
      {/* 1. Sidebar Left */}
      <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 text-slate-300 shrink-0 select-none" id="dashboard-sidebar">
        {/* Logo and branding header section */}
        <div className="h-20 flex items-center gap-2.5 px-6 border-b border-slate-800">
          <div className="p-1.5 bg-indigo-600 rounded-lg shadow-md flex items-center justify-center rotate-45 transform">
            <Activity className="w-4 h-4 text-white -rotate-45" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-white font-mono uppercase">
              KINETIC FLOW
            </h2>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block -mt-0.5">
              Flow System V3
            </span>
          </div>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-mono font-semibold text-slate-500 px-3 mb-2">
            MAIN CONSOLES
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg bg-indigo-600/15 text-indigo-400 border border-indigo-500/10 transition-all cursor-pointer">
            <Grid className="w-4 h-4 text-indigo-500" />
            總覽儀表板
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all cursor-pointer">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            資料分析系統
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all cursor-pointer">
            <Layers className="w-4 h-4 text-slate-505" />
            製程流量模擬
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all cursor-pointer">
            <Database className="w-4 h-4 text-slate-505" />
            感測記錄管理
          </button>

          <div className="pt-6 text-[10px] uppercase tracking-widest font-mono font-semibold text-slate-500 px-3 mb-2">
            SYSTEM ADJUSTMENTS
          </div>
          <button className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-400">
            <span>感測器狀態</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
              連線中
            </span>
          </button>
        </nav>

        {/* User Identity and settings drawer bottom */}
        <div className="p-4 border-t border-slate-850 select-none bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 font-bold flex items-center justify-center text-xs text-indigo-400">
              CC
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">Chih-Fu Chen</p>
              <p className="text-[10px] font-mono text-slate-500 truncate">chihfu.chen.tw</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>流體分析專員</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              在線
            </span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Right Panel */}
      <div className="flex-1 flex flex-col min-w-0" id="dashboard-content-frame">
        {/* Header toolbar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10" id="header-bar">
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-slate-850 tracking-tight leading-tight">
              Animated Flow Analytics Dashboard
            </h1>
            <p className="text-[11px] text-slate-400 font-mono -mt-0.5">
              真實數據與模擬演算法協調儀表板
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Alert icon */}
            <button
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer flex items-center justify-center"
              title="Notifications"
              id="header-notification-bell"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
            </button>

            {/* Indigo Elegant Header Export Action Pill */}
            <button
              onClick={handleExport}
              className="px-4 py-2 font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-mono transition-all rounded-full flex items-center gap-1.5 shadow-md shadow-indigo-100 uppercase cursor-pointer"
              id="header-export-btn"
            >
              <Download className="w-3.5 h-3.5" />
              匯出數據
            </button>
          </div>
        </header>

        {/* Horizontal Subheader crumbs pathway */}
        <div className="px-8 py-2.5 bg-slate-50 border-b border-slate-200/60 text-[10px] sm:text-xs font-mono text-slate-400 flex items-center justify-between select-none shrink-0" id="crumbs-path">
          <div className="flex items-center">
            <span className="hover:text-slate-600 transition-colors cursor-pointer">核心儀表板</span>
            <span className="mx-2 text-slate-400">&gt;</span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">流道動態監控</span>
            <span className="mx-2 text-slate-400">&gt;</span>
            <span className="text-indigo-650 font-bold uppercase">Parameter Analysis</span>
          </div>
          <div className="text-[10px] text-indigo-600/80 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-medium">
            SYSTEM VERSION: V3.94
          </div>
        </div>

        {/* Embedded Content Grid Scrollable wrapper */}
        <main className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-bento-grid">
          
          {/* ================= COLUMN 1: PARAMETER CONTROLS ================= */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-6" id="column-left-controls">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-mono tracking-widest text-slate-505 uppercase block font-semibold mb-5 border-b border-slate-100 pb-2">
                  PARAMETER CONTROLS
                </span>

                {/* Symmetrical Sliders Loops */}
                <div className="space-y-6">
                  {/* 1. Pressure Selector */}
                  <div id="control-pressure-wrapper">
                    <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-medium">
                      <span className="text-slate-500 tracking-wider">PRESSURE</span>
                      <span className="text-indigo-600 font-bold text-sm">
                        {state.pressure.toFixed(1)} psi
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={state.pressure}
                      onChange={(e) => handleSliderChange('pressure', parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all"
                      id="slider-control-pressure"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1">
                      <span>0.0 psi</span>
                      <span>5.0 psi</span>
                      <span>10.0 psi</span>
                    </div>
                  </div>

                  {/* 2. Temperature Selector */}
                  <div id="control-temperature-wrapper">
                    <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-medium">
                      <span className="text-slate-505 tracking-wider">TEMPERATURE</span>
                      <span className="text-amber-600 font-bold text-sm">
                        {state.temperature.toFixed(1)} °C
                      </span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="35"
                      step="0.5"
                      value={state.temperature}
                      onChange={(e) => handleSliderChange('temperature', parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all"
                      id="slider-control-temperature"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1">
                      <span>15.0 °C</span>
                      <span>25.0 °C</span>
                      <span>35.0 °C</span>
                    </div>
                  </div>

                  {/* 3. Dispensing Speed Selector */}
                  <div id="control-speed-wrapper">
                    <div className="flex justify-between items-baseline mb-2 text-xs font-mono font-medium">
                      <span className="text-slate-505 tracking-wider">DISPENSING SPEED</span>
                      <span className="text-indigo-600 font-bold text-sm">
                        {state.dispensingSpeed} mm/s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={state.dispensingSpeed}
                      onChange={(e) => handleSliderChange('dispensingSpeed', parseInt(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all"
                      id="slider-control-speed"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1">
                      <span>5 mm/s</span>
                      <span>17 mm/s</span>
                      <span>30 mm/s</span>
                    </div>
                  </div>
                </div>

                {/* Switched Buttons togglers layer */}
                <div className="space-y-5 mt-8 border-t border-slate-100 pt-5">
                  {/* Material Switcher */}
                  <div className="flex items-center justify-between" id="control-material-toggle">
                    <span className="text-xs font-mono text-slate-505 tracking-wider font-semibold">
                      MATERIAL TYPE
                    </span>
                    <button
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          materialType:
                            prev.materialType === 'Polymer-A' ? 'Polymer-B' : 'Polymer-A',
                        }))
                      }
                      className="relative inline-flex h-5.5 w-11 items-center rounded-full transition-colors duration-300 bg-slate-100 border border-slate-200 cursor-pointer"
                      role="switch"
                      aria-checked={state.materialType === 'Polymer-B'}
                      id="toggle-material-type"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-indigo-600 shadow-sm transition-transform duration-300 ${
                          state.materialType === 'Polymer-B' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* History Switcher */}
                  <div className="flex items-center justify-between" id="control-history-toggle">
                    <span className="text-xs font-mono text-slate-505 tracking-wider font-semibold">
                      HISTORICAL DATA
                    </span>
                    <button
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          showHistoricalData: !prev.showHistoricalData,
                        }))
                      }
                      className="relative inline-flex h-5.5 w-11 items-center rounded-full transition-colors duration-300 bg-slate-100 border border-slate-200 cursor-pointer"
                      role="switch"
                      aria-checked={state.showHistoricalData}
                      id="toggle-historical-data"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-400 shadow-sm transition-transform duration-300 ${
                          state.showHistoricalData ? 'translate-x-6 bg-indigo-600' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Informative Configuration Summary Label overlay block */}
              <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-[10px] font-mono text-slate-500">
                <div className="flex justify-between py-1 border-b border-slate-200/60 font-semibold text-slate-600">
                  <span>ACTIVE TARGET:</span>
                  <span className="text-indigo-650">{state.materialType}</span>
                </div>
                <div className="flex justify-between py-1 pt-2 font-semibold text-slate-600">
                  <span>STATE LOG:</span>
                  <span className="text-indigo-600/85">
                    {state.showHistoricalData ? 'ARCHIVAL' : 'LIVE FEED TELEMETRY'}
                  </span>
                </div>
              </div>
            </div>

            {/* Symmetrical Sensitivity Sparks */}
            <div className="flex gap-4" id="viscosity-needle-sensitivity-grid">
              <SensitivitySpark
                title="Viscosity Sensitivity"
                level={state.temperature < 20 || state.materialType === 'Polymer-A' ? 'High' : 'Medium'}
                value={state.materialType === 'Polymer-A' ? '+0.85' : '+0.68'}
                color="cyan"
                baseSlope={state.materialType === 'Polymer-A' ? 0.72 : 0.54}
              />
              <SensitivitySpark
                title="Needle Sensitivity"
                level={state.dispensingSpeed > 20 ? 'High' : 'Medium'}
                value={state.dispensingSpeed > 20 ? '+0.61' : '+0.42'}
                color="orange"
                baseSlope={state.dispensingSpeed > 20 ? 0.58 : 0.38}
              />
            </div>
          </div>

          {/* ================= COLUMN 2: 3D MANIFOLD RELATIONSHIP ================= */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-6" id="column-middle-manifold">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm h-full font-sans">
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <span className="text-xs font-mono tracking-widest text-slate-505 uppercase block font-semibold">
                    PRESSURE-TEMPERATURE-FLOW RATE RELATIONSHIP
                  </span>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer" />
                </div>

                {/* 3D Model plotting canvas */}
                <div className="relative border border-slate-200 bg-[#f8fafc] rounded-2xl overflow-hidden h-[340px] shadow-inner" id="three-d-render-box">
                  <ThreeDView
                    pressure={state.pressure}
                    temperature={state.temperature}
                    dispensingSpeed={state.dispensingSpeed}
                    materialType={state.materialType}
                  />
                </div>

                {/* Quality Parameter progress indicators stacked */}
                <div className="mt-5 space-y-4" id="data-quality-progress-stack">
                  {/* 1. Consistency Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-505 font-semibold uppercase">
                      <span>CONSISTENCY QUALITY</span>
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
                    <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-505 font-semibold uppercase">
                      <span>STABILITY RATING</span>
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
                    <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-550 font-semibold uppercase">
                      <span>ACCURACY CERTIFICATE</span>
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
              <div className="flex gap-4 mt-6 border-t border-slate-100 pt-5">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-indigo-200 text-indigo-600 bg-white hover:bg-slate-50 active:bg-slate-100 font-mono text-xs hover:border-indigo-300 transition-colors uppercase cursor-pointer flex items-center justify-center gap-2 font-medium tracking-wider"
                  id="btn-reset-simulation"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Simulation
                </button>
                
                <button
                  onClick={handleExport}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-mono text-xs hover:bg-indigo-700 hover:shadow-md transition-all uppercase cursor-pointer shadow-sm flex items-center justify-center gap-2 font-medium tracking-wider"
                  id="btn-export-telemetry"
                >
                  <Download className="w-3.5 h-3.5 text-white/90" />
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* ================= COLUMN 3: FLOW RATE TRENDS & INSIGHTS ================= */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6" id="column-right-insights">
            
            {/* Trends line chart and circular gauge */}
            <FlowTrends
              currentFlowRate={actualFlow}
              theoreticalFlowRate={theoreticalFlow}
              trendHistory={history}
            />

            {/* AI-Inspired dynamic highlights bubble box */}
            <div
              className="flex-grow bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm"
              id="data-insights-bullet-panel"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tracking-widest text-slate-505 uppercase block font-semibold">
                    DATA INSIGHTS
                  </span>
                  <span className="text-[9px] text-amber-600 border border-amber-200/50 bg-amber-50 px-1.5 py-0.5 rounded-full font-mono uppercase font-bold">
                    Dynamic
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono font-medium">
                  <Cpu className="w-3 h-3 text-indigo-600" />
                  <span>AI-DRIVEN SUMMARIES</span>
                </div>
              </div>

              {/* Data Bullets List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-2 text-[11px] sm:text-xs">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 items-start select-none group border-l-2 border-slate-100 pl-4 py-1.5 hover:border-indigo-500/60 transition-colors rounded-r-lg hover:bg-slate-50/40"
                  >
                    <span className="mt-1 text-indigo-600 flex-shrink-0">
                      <Zap className="w-3.5 h-3.5 fill-indigo-100/40" />
                    </span>
                    <p className="text-slate-650 leading-relaxed font-sans">{insight}</p>
                  </div>
                ))}
              </div>

              {/* Diagnostic systems stamp */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between text-[9px] font-mono text-slate-400">
                <div className="flex items-center gap-1 font-medium">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>Fluid Dynamic Model: V3.94</span>
                </div>
                <span className="font-semibold text-indigo-600/90">Live Feed: Nominal</span>
              </div>
            </div>

          </div>

        </main>

        {/* 3. Footer System Integrity Indicators */}
        <footer
          className="w-full bg-white border-t border-slate-200 px-8 py-3.5 flex flex-wrap gap-y-2 items-center justify-between text-[10px] font-mono text-slate-400 select-none z-10 shrink-0"
          id="dashboard-root-footer"
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_5px_#10b981]" />
              SYSTEM STABILIZED
            </span>
            <span className="hidden sm:inline text-slate-200">|</span>
            <span className="hidden sm:inline font-medium">NODES: 6 ONLINE</span>
          </div>

          <div className="flex items-center gap-5 text-slate-450 font-medium">
            <span>PORT: INTERLOCK_CONNECTED</span>
            <span>FPS: 60/60</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
