import { useRef, useEffect, useState } from 'react';
import { useBot } from '../context/BotContext';
import { blobDetect } from '../utils/blobDetect';
import { Flame, Info } from 'lucide-react';

// Exact bilinear interpolation requested by the user
function bilinearInterpolate(grid, rows, cols, r, c) {
  const r0 = Math.floor(r);
  const r1 = Math.min(r0 + 1, rows - 1);
  const c0 = Math.floor(c);
  const c1 = Math.min(c0 + 1, cols - 1);
  const tr = r - r0;
  const tc = c - c0;
  return (
    grid[r0 * cols + c0] * (1 - tr) * (1 - tc) +
    grid[r0 * cols + c1] * (1 - tr) * tc +
    grid[r1 * cols + c0] * tr * (1 - tc) +
    grid[r1 * cols + c1] * tr * tc
  );
}

// Exact Jet color palette mapping requested by the user
function tempToColor(t) {
  const r = Math.max(0, Math.min(255, Math.round(255 * (1.5 - Math.abs(t * 4 - 3)))));
  const g = Math.max(0, Math.min(255, Math.round(255 * (1.5 - Math.abs(t * 4 - 2)))));
  const b = Math.max(0, Math.min(255, Math.round(255 * (1.5 - Math.abs(t * 4 - 1)))));
  return [r, g, b];
}

export function ThermalPanel() {
  const { sensorData, thresholds } = useBot();
  const canvasRef = useRef(null);
  
  // Keep some local state just for the label (peak temp, min, max, blob area)
  const [stats, setStats] = useState({ peak: 0, min: 28, max: 38, area: 0 });

  useEffect(() => {
    if (!sensorData || !sensorData.thermal || !canvasRef.current) return;
    
    let thermal = sensorData.thermal;
    const len = thermal.length;
    // Assume 8x8 (AMG8833) or 32x24 (MLX90640)
    const cols = len === 768 ? 32 : 8;
    const rows = len === 768 ? 24 : 8;

    // Check if the array is empty or all values are 0.0 (fallback logic)
    const allZero = thermal.every(v => v === 0);
    if (allZero) {
      const fallbackThermal = new Array(len);
      const t = Date.now() / 1000;
      
      // Dynamic center coordinates for the simulation blob
      const blobX = cols / 2 + Math.sin(t) * (cols / 4);
      const blobY = rows / 2 + Math.cos(t) * (rows / 4);

      for (let i = 0; i < len; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const dist = Math.sqrt(Math.pow(x - blobX, 2) + Math.pow(y - blobY, 2));
        
        // Background 28-31C, blob peak up to 38C
        fallbackThermal[i] = 28 + Math.random() * 0.5 + Math.max(0, 9.5 - dist * 2);
      }
      thermal = fallbackThermal;
    }
    
    // Clamp every pixel value: temp = Math.max(15, Math.min(45, temp))
    const clampedThermal = thermal.map(v => Math.max(15, Math.min(45, v)));
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    let animationFrameId;

    const render = () => {
      // 1. Dynamic min/max calculation for frame auto-scaling (from clamped values)
      let minT = Infinity;
      let maxT = -Infinity;
      for (let i = 0; i < len; i++) {
        const val = clampedThermal[i];
        if (val < minT) minT = val;
        if (val > maxT) maxT = val;
      }
      
      // Avoid division by zero
      if (maxT === minT) {
        maxT = minT + 1.0;
      }

      const imgData = ctx.createImageData(320, 320);
      const data = imgData.data;

      // 2. Bilinear Interpolation upscale to 320x320
      for (let y = 0; y < 320; y++) {
        for (let x = 0; x < 320; x++) {
          const r = Math.max(0, Math.min(rows - 1, (y / 320) * rows));
          const c = Math.max(0, Math.min(cols - 1, (x / 320) * cols));
          
          const interp = bilinearInterpolate(clampedThermal, rows, cols, r, c);
          
          // Normalize using fixed range: normalized = (temp - 15) / (45 - 15)
          const norm = (interp - 15) / (45 - 15);
          const color = tempToColor(norm);
          
          const idx = (y * 320 + x) * 4;
          data[idx] = color[0];
          data[idx+1] = color[1];
          data[idx+2] = color[2];
          data[idx+3] = 255;
        }
      }
      
      ctx.putImageData(imgData, 0, 0);

      // 3. Blob Detection & Bounding Box Overlays
      const blobResult = blobDetect(clampedThermal, thresholds.temp_celsius, thresholds.min_blob_area);
      
      if (blobResult.detected && blobResult.boundingBox) {
        const bb = blobResult.boundingBox;
        ctx.strokeStyle = '#EF4444'; // Red outline
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        
        // Convert raw grid coordinates to 320x320 heatmap coordinates
        const cx = bb.x * (320 / cols);
        const cy = bb.y * (320 / rows);
        const cw = bb.w * (320 / cols);
        const ch = bb.h * (320 / rows);
        
        ctx.strokeRect(cx, cy, cw, ch);
      }

      // 4. Update Stats UI Component (throttled to limit re-renders)
      const peakVal = blobResult.detected ? blobResult.peakTemp : 0;
      const areaVal = blobResult.detected ? blobResult.blobArea : 0;
      
      setStats(prev => {
        if (
          Math.abs(prev.peak - peakVal) > 0.5 ||
          prev.area !== areaVal ||
          Math.abs(prev.min - minT) > 0.5 ||
          Math.abs(prev.max - maxT) > 0.5
        ) {
          return { peak: peakVal, min: minT, max: maxT, area: areaVal };
        }
        return prev;
      });
    };

    animationFrameId = requestAnimationFrame(render);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [sensorData, thresholds]);

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full overflow-hidden">
      <h3 className="flex items-center font-medium text-text mb-4 border-b border-secondary/50 pb-2 shrink-0">
        <Flame className="w-4 h-4 mr-2 text-cta" />
        Thermal Heatmap
      </h3>
      
      <div className="flex-grow flex flex-col items-center justify-center min-h-0">
        <div className="flex flex-row items-center justify-center w-full max-w-[370px] gap-4 min-h-0">
          {/* Canvas Wrapper */}
          <div className="relative w-full max-w-[320px] aspect-square bg-primary rounded overflow-hidden border border-secondary flex items-center justify-center">
            <canvas 
              ref={canvasRef} 
              width={320} 
              height={320}
              className="w-full h-full object-contain"
            />
          </div>
          
          {/* HTML-based Scale Bar */}
          <div className="flex flex-col items-center h-[320px] justify-between py-2 text-[10px] font-mono text-text font-bold shrink-0">
            <span>45.0°C</span>
            <div 
              className="w-3.5 flex-grow my-2 rounded border border-secondary/60 shadow-inner" 
              style={{
                background: 'linear-gradient(to top, rgb(0,0,140), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))'
              }} 
            />
            <span>15.0°C</span>
          </div>
        </div>
        
        <div className="mt-3 flex w-full justify-between items-center text-xs text-text/80 max-w-[370px] shrink-0">
          <span className="flex items-center flex-wrap gap-x-2.5">
            <span className="flex items-center">
              <Info className="w-3.5 h-3.5 mr-1 text-text/60" />
              Min: <span className="font-mono text-text font-bold ml-0.5">{stats.min.toFixed(1)}°C</span>
            </span>
            <span>
              Max: <span className="font-mono text-text font-bold">{stats.max.toFixed(1)}°C</span>
            </span>
            {stats.peak > 0 && (
              <span className="text-danger font-semibold">
                Peak: <span className="font-mono font-bold">{stats.peak.toFixed(1)}°C</span>
              </span>
            )}
          </span>
          <span>
            Blob: <span className="font-mono text-text font-bold">{stats.area}px</span>
          </span>
        </div>
      </div>
    </div>
  );
}
