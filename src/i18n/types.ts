/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'zh';

export interface TranslationDictionary {
  common: {
    reset: string;
    export: string;
    exportData: string;
    exportCsv: string;
    notifications: string;
    onlineMonitoring: string;
    connectionStatus: string;
    collapseSidebar: string;
    expandSidebar: string;
    engineerRole: string;
    nominal: string;
    openMenu: string;
    closeMenu: string;
    systemStabilized: string;
    nodesOnline: string;
    portInterlock: string;
    fps: string;
    systemV3: string;
    systemVer: string;
    modelVer: string;
    feedNominal: string;
    unitMgSec: string;
  };
  header: {
    title: string;
    subtitle: string;
    breadcrumbsRoot: string;
    breadcrumbsSub: string;
    langSwitch: string;
    langZh: string;
    langEn: string;
  };
  navigation: {
    mainConsoles: string;
    systemStatus: string;
    overview: string;
    overviewShort: string;
    trends: string;
    trendsShort: string;
    threed: string;
    threedShort: string;
    controls: string;
    controlsShort: string;
  };
  parameters: {
    title: string;
    liveInput: string;
    pressure: string;
    temperature: string;
    dispensingSpeed: string;
    materialType: string;
    highViscosity: string;
    lowViscosity: string;
    historicalData: string;
    archivalSmoothing: string;
    liveSensorStream: string;
    activeTarget: string;
    stateLog: string;
    archival: string;
    liveFeedTelemetry: string;
    decreasePressure: string;
    increasePressure: string;
    decreaseTemperature: string;
    increaseTemperature: string;
    decreaseSpeed: string;
    increaseSpeed: string;
  };
  manifold3d: {
    title: string;
    wireframeBadge: string;
    axisPressure: string;
    axisTemperature: string;
    axisFlowRate: string;
    consistencyQuality: string;
    stabilityRating: string;
    accuracyCertificate: string;
    resetView: string;
    dragToOrbit: string;
    minimize: string;
    maximize: string;
    tunerTitle: string;
    surfaceDeformation: string;
  };
  trends: {
    title: string;
    actual: string;
    theoretical: string;
  };
  sensitivity: {
    viscosityTitle: string;
    needleTitle: string;
    levelHigh: string;
    levelMedium: string;
    levelLow: string;
  };
  insights: {
    title: string;
    dynamicBadge: string;
    aiDrivenSummaries: string;
  };
  telemetryTable: {
    title: string;
    time: string;
    actual: string;
    theoretical: string;
    delta: string;
    downloadCsv: string;
  };
  csv: {
    headerTimestamp: string;
    headerPressure: string;
    headerTemperature: string;
    headerSpeed: string;
    headerMaterial: string;
    headerActualFlow: string;
    headerTheoreticalFlow: string;
  };
}
