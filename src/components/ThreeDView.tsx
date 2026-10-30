/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MaterialType } from '../types';
import { calculateTheoreticalFlow } from '../utils';

interface ThreeDViewProps {
  pressure: number;
  temperature: number;
  dispensingSpeed: number;
  materialType: MaterialType;
}

export default function ThreeDView({
  pressure,
  temperature,
  dispensingSpeed,
  materialType,
}: ThreeDViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rotation angles (radians)
  const [yaw, setYaw] = useState<number>(-0.6); // Z-axis rotation
  const [pitch, setPitch] = useState<number>(0.65); // X-axis tilt
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({
    x: 0,
    y: 0,
    yaw: 0,
    pitch: 0,
  });

  const [dimensions, setDimensions] = useState({ width: 500, height: 350 });
  const animationFrameId = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Handle ResizeObserver on the container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(300, width),
          height: Math.max(250, height),
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handle Drag Interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw,
      pitch,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const yawSpeed = 0.007;
    const pitchSpeed = 0.007;

    setYaw(dragStartRef.current.yaw - dx * yawSpeed);
    setPitch(Math.max(0.15, Math.min(1.4, dragStartRef.current.pitch + dy * pitchSpeed)));
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        yaw,
        pitch,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;

    const yawSpeed = 0.008;
    const pitchSpeed = 0.008;

    setYaw(dragStartRef.current.yaw - dx * yawSpeed);
    setPitch(Math.max(0.15, Math.min(1.4, dragStartRef.current.pitch + dy * pitchSpeed)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetOrientation = () => {
    setYaw(-0.6);
    setPitch(0.65);
  };

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = dimensions.width;
    const height = dimensions.height;

    // Support high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Grid details
    const gridSize = 19; // Number of subdivisions
    const scaleFactor = Math.min(1, Math.min(width / 460, height / 320));
    const scaleX = 140 * scaleFactor; // Size factor X
    const scaleY = 140 * scaleFactor; // Size factor Y
    const scaleZ = 130 * scaleFactor; // Height factor

    // Center of projection space
    const cx = width / 2;
    const cy = height / 2 + 10;

    let localTime = 0;

    const drawFrame = () => {
      localTime += 0.025;
      timeRef.current = localTime;

      ctx.clearRect(0, 0, width, height);

      // Simple 3D projection helper
      const project = (x3d: number, y3d: number, z3d: number) => {
        // Center-align coordinate domains: x3d, y3d are in [-0.5, 0.5], z3d in [-0.5, 0.5]
        // 1. Yaw rotation (around Z-axis)
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const rx = x3d * cosY - y3d * sinY;
        const ry = x3d * sinY + y3d * cosY;

        // 2. Pitch rotation (around X-axis)
        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);
        
        // Depth is along ry, elevation is z3d
        const depth = ry * cosP - z3d * sinP;
        const projY = ry * sinP + z3d * cosP;

        // Apply scale & translate to screen coordinates
        const screenX = cx + rx * scaleX;
        // Negative sign because Y goes down in Canvas, but Z goes UP in 3D
        const screenY = cy - projY * scaleY; 

        return { x: screenX, y: screenY, depth };
      };

      // Define static scatter points on the surface (indigo/amber spheres)
      const dataPoints3D = [
        { x: -0.2, y: -0.3, color: '#4f46e5', progress: 0.1 },
        { x: 0.3, y: -0.2, color: '#f59e0b', progress: 0.4 },
        { x: -0.1, y: 0.25, color: '#6366f1', progress: 0.6 },
        { x: 0.2, y: 0.1, color: '#3b82f6', progress: 0.2 },
        { x: -0.35, y: 0.05, color: '#d97706', progress: 0.8 },
        { x: 0.05, y: -0.15, color: '#818cf8', progress: 0.5 },
      ];

      // Math equation for the flow manifold
      // It shapes a beautiful dynamic ridge based on pressure, temperature, and speed
      const getSurfaceZ = (u: number, v: number) => {
        // u, v are in [-0.5, 0.5]
        
        // Normalize sliders to multipliers
        const pCoeff = pressure / 10; // 0..1
        const tCoeff = (temperature - 15) / 20; // 0..1
        const sCoeff = dispensingSpeed / 30; // 0..1

        // Base parabolic shape: peak near centers + sine ripples
        const r2 = u * u + v * v;
        let z = 0.2 * Math.exp(-4 * r2);

        // Ridge alignment representing pressure/temp correlation
        const ridgeVal = Math.sin((u * 2.5 + pCoeff) * (v * 2.5 + tCoeff) * 2.0);
        z += 0.12 * ridgeVal;

        // Add dynamic ripple wave based on speed
        const waveSpeedFactor = sCoeff * 4 + 1.5;
        const wave = Math.sin(u * 8 + v * 4 - localTime * waveSpeedFactor) * 0.04 * sCoeff;
        z += wave;

        // Apply material characteristics
        if (materialType === 'Polymer-B') {
          z *= 1.2;
          z += Math.sin(v * 12 + localTime * 2) * 0.015;
        }

        // Clamp height properly inside range
        return Math.max(-0.45, Math.min(0.45, z));
      };

      // 1. Draw Grid Floor projection axes & border
      ctx.strokeStyle = 'rgba(203, 213, 222, 0.9)';
      ctx.lineWidth = 1;

      // Draw bounding box / floor square lines
      const floorPoints = [
        project(-0.5, -0.5, -0.4),
        project(0.5, -0.5, -0.4),
        project(0.5, 0.5, -0.4),
        project(-0.5, 0.5, -0.4),
      ];

      ctx.beginPath();
      ctx.moveTo(floorPoints[0].x, floorPoints[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(floorPoints[i].x, floorPoints[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(248, 250, 252, 0.7)';
      ctx.fill();
      ctx.stroke();

      // Floor Gridlines
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
      const subdivisions = 8;
      for (let i = 1; i < subdivisions; i++) {
        const ratio = i / subdivisions - 0.5;
        // Lines parallel to X-axis
        const p1 = project(-0.5, ratio, -0.4);
        const p2 = project(0.5, ratio, -0.4);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Lines parallel to Y-axis
        const p3 = project(ratio, -0.5, -0.4);
        const p4 = project(ratio, 0.5, -0.4);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }

      // Draw contour rings on the floor (High Tech Topography styling)
      ctx.lineWidth = 1.2;
      for (let rIndex = 1; rIndex <= 4; rIndex++) {
        const currentRadius = 0.12 * rIndex + Math.sin(localTime * 1.5 + rIndex) * 0.01;
        ctx.strokeStyle = `rgba(79, 70, 229, ${0.12 - rIndex * 0.02})`;
        ctx.beginPath();
        
        let pathStarted = false;
        for (let th = 0; th <= Math.PI * 2; th += 0.2) {
          const cx_floor = 0.05 * Math.sin(localTime * 0.8 + rIndex);
          const cy_floor = 0.05 * Math.cos(localTime * 0.5);
          const fx = cx_floor + Math.cos(th) * currentRadius;
          const fy = cy_floor + Math.sin(th) * currentRadius;
          
          if (fx >= -0.5 && fx <= 0.5 && fy >= -0.5 && fy <= 0.5) {
            const fp = project(fx, fy, -0.4);
            if (!pathStarted) {
              ctx.moveTo(fp.x, fp.y);
              pathStarted = true;
            } else {
              ctx.lineTo(fp.x, fp.y);
            }
          }
        }
        ctx.stroke();
      }

      // 2. Draw 3D wireframe mesh representing FLOW-RATE manifold
      // We will loop through X and Y and build rows and cols to sort by depth (Painter's Algorithm)
      // For simplified and perfect drawing without overlaps, we draw mesh lines with smart alpha
      ctx.lineWidth = 0.8;
      
      // Compute 2D mesh coordinates and surface height
      const meshGrid: { x: number; y: number; z: number; proj: { x: number; y: number; depth: number } }[][] = [];
      for (let i = 0; i <= gridSize; i++) {
        const u = i / gridSize - 0.5; // [-0.5, 0.5]
        meshGrid[i] = [];
        for (let j = 0; j <= gridSize; j++) {
          const v = j / gridSize - 0.5; // [-0.5, 0.5]
          const z = getSurfaceZ(u, v);
          const proj = project(u, v, z);
          meshGrid[i][j] = { x: u, y: v, z, proj };
        }
      }

      // Draw lines along constant U (X-axis direction)
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
          const p1 = meshGrid[i][j].proj;
          const p2 = meshGrid[i + 1][j].proj;

          // Color gradient blending based on elevation
          const zAvg = (meshGrid[i][j].z + meshGrid[i + 1][j].z) / 2; // -0.45..0.45
          const normalizedZ = (zAvg + 0.45) / 0.9; // 0..1
          
          // Interpolate colors: Bottom (gorgeous violet/indigo) -> Middle (pure indigo) -> Tip (gold/amber)
          let col = 'rgba(129, 140, 248, 0.45)'; // Default slate-indigo
          if (normalizedZ > 0.65) {
            // Gold peak
            col = `rgba(217, 119, 6, ${0.5 + (normalizedZ - 0.65) * 1.0})`;
          } else if (normalizedZ > 0.45) {
            // Hot indigo-violet
            col = `rgba(79, 70, 229, ${0.45 + (normalizedZ - 0.45) * 0.85})`;
          } else {
            // Deep base indigo
            col = `rgba(99, 102, 241, ${0.25 + normalizedZ * 0.35})`;
          }

          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Draw lines along constant V (Y-axis direction)
      for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const p1 = meshGrid[i][j].proj;
          const p2 = meshGrid[i][j + 1].proj;

          const zAvg = (meshGrid[i][j].z + meshGrid[i][j + 1].z) / 2;
          const normalizedZ = (zAvg + 0.45) / 0.9;

          let col = 'rgba(129, 140, 248, 0.45)';
          if (normalizedZ > 0.65) {
            col = `rgba(217, 119, 6, ${0.5 + (normalizedZ - 0.65) * 1.0})`;
          } else if (normalizedZ > 0.45) {
            col = `rgba(79, 70, 229, ${0.45 + (normalizedZ - 0.45) * 0.85})`;
          } else {
            col = `rgba(99, 102, 241, ${0.25 + normalizedZ * 0.35})`;
          }

          ctx.strokeStyle = col;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // 3. Draw Axis Labels & Ticks
      // Draw 3D labels with text styling
      ctx.fillStyle = 'rgba(100, 116, 139, 0.9)';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';

      // 3D Axis: PRESSURE (along the X bounding axis)
      const pLabStart = project(-0.5, 0.5, -0.4);
      const pLabEnd = project(0.5, 0.5, -0.4);
      // Ticks along Pressure
      for (let tick = 0; tick <= 5; tick++) {
        const ratio = tick / 5;
        const pt = project(-0.5 + ratio, 0.52, -0.4);
        ctx.fillText((ratio * 40).toFixed(0), pt.x, pt.y + 11);
      }
      const pAxisLabelLoc = project(0, 0.65, -0.4);
      ctx.fillText('PRESSURE (psi)', pAxisLabelLoc.x, pAxisLabelLoc.y + 16);

      // 3D Axis: TEMPERATURE (along the Y bounding axis)
      const tLabStart = project(0.5, -0.5, -0.4);
      const tLabEnd = project(0.5, 0.5, -0.4);
      // Ticks along Temperature
      for (let tick = 0; tick <= 5; tick++) {
        const ratio = tick / 5;
        const pt = project(0.52, -0.5 + ratio, -0.4);
        const tempLabelVal = 20 + ratio * 10;
        ctx.fillText(tempLabelVal.toFixed(0), pt.x + 13, pt.y + 3);
      }
      const tAxisLabelLoc = project(0.68, 0, -0.4);
      ctx.save();
      ctx.translate(tAxisLabelLoc.x + 14, tAxisLabelLoc.y + 14);
      ctx.rotate(0.35);
      ctx.fillText('TEMPERATURE (°C)', 0, 0);
      ctx.restore();

      // 3D Axis: FLOW RATE Z axis tick labels (vertical)
      const zTickStart = project(-0.5, -0.5, -0.4);
      for (let tick = 0; tick <= 7; tick++) {
        const ratio = tick / 7;
        const zValue = -0.4 + ratio * 0.8;
        const pt = project(-0.52, -0.52, zValue);
        const flowValue = (ratio * 35).toFixed(0);
        ctx.fillText(flowValue, pt.x - 12, pt.y + 3);
      }

      ctx.save();
      const zLabelPos = project(-0.53, -0.53, 0);
      ctx.translate(zLabelPos.x - 24, zLabelPos.y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('FLOW RATE (mg/sec)', 0, 0);
      ctx.restore();

      // Draw structural bounding box vertical lines to anchor the cube
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;

      const corners = [
        { u: -0.5, v: -0.5 },
        { u: 0.5, v: -0.5 },
        { u: 0.5, v: 0.5 },
        { u: -0.5, v: 0.5 },
      ];
      corners.forEach((c) => {
        const pFloor = project(c.u, c.v, -0.4);
        const pTop = project(c.u, c.v, 0.4);
        ctx.beginPath();
        ctx.moveTo(pFloor.x, pFloor.y);
        ctx.lineTo(pTop.x, pTop.y);
        ctx.stroke();
      });

      // 4. Draw Floating Points / Sensor Needles (glowing dots suspended, drop lines to base)
      dataPoints3D.forEach((dp) => {
        // Dynamic oscillation logic to simulate live tracking
        // Update its height dynamically relative to parameters
        const stateZ = getSurfaceZ(dp.x, dp.y);
        
        const ptSurf = project(dp.x, dp.y, stateZ);
        const ptFloor = project(dp.x, dp.y, -0.4);

        // Drawing Drop Needle Line with gradient/dotted effect
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(ptFloor.x, ptFloor.y);
        ctx.lineTo(ptSurf.x, ptSurf.y);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Draw floor anchor dot
        ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
        ctx.beginPath();
        ctx.arc(ptFloor.x, ptFloor.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw surface glowing target point (Spheres)
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = dp.color;
        ctx.fillStyle = dp.color;
        ctx.beginPath();
        ctx.arc(ptSurf.x, ptSurf.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Little outer halo
        ctx.strokeStyle = dp.color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(ptSurf.x, ptSurf.y, 7 + Math.sin(localTime * 4 + dp.progress * 10) * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 5. Draw active parameter line marker indicator
      // Find current state relative coordinates
      const normPX = (pressure / 10) - 0.5; // map 0..10 to -0.5..0.5
      const normTY = ((temperature - 15) / 20) - 0.5; // map 15..35 to -0.5..0.5
      const activeZ = getSurfaceZ(normPX, normTY);

      const realPt = project(normPX, normTY, activeZ);
      const floorPt = project(normPX, normTY, -0.4);

      // Active state vertical anchor line
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(floorPt.x, floorPt.y);
      ctx.lineTo(realPt.x, realPt.y);
      ctx.stroke();

      // Draw the big glowing tracking intersection node
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#4f46e5';
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.arc(realPt.x, realPt.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(realPt.x, realPt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animationFrameId.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [dimensions, yaw, pitch, pressure, temperature, dispensingSpeed, materialType]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[260px] sm:min-h-[300px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      id="three-d-projection-container"
    >
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="w-full h-full drop-shadow-sm"
        id="three-d-wireframe-canvas"
      />
      
      {/* Mobile-friendly reset angle button */}
      <button
        type="button"
        onClick={resetOrientation}
        className="absolute left-3 bottom-3 p-1.5 px-2 bg-white/90 hover:bg-white active:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg shadow-sm border border-slate-200/80 text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer z-10"
        title="Reset 3D View Angle"
        aria-label="Reset View Angle"
      >
        <RotateCcw className="w-3 h-3 text-indigo-600" />
        <span className="font-medium">Reset View</span>
      </button>

      <div className="absolute right-3 bottom-3 text-[10px] font-mono text-slate-500 bg-white/90 px-2.5 py-1 rounded-md shadow-sm border border-slate-200/60 pointer-events-none select-none">
        Drag to Orbit • Yaw: {yaw.toFixed(2)} rad
      </div>
    </div>
  );
}
