import { useRef, useEffect, useState } from 'react';
import { useBot } from '../context/BotContext';
import { getInfernoColor } from '../utils/thermalColorMap';
import { blobDetect } from '../utils/blobDetect';
import { Flame, Info } from 'lucide-react';

export function ThermalPanel() {
  const { sensorData, thresholds } = useBot();
  const canvasRef = useRef(null);
  
  // Keep some local state just for the label (peak temp, blob area)
  // But we won't re-render the canvas from state to save performance.
  const [stats, setStats] = useState({ peak: 0, area: 0 });

  useEffect(() => {
    if (!sensorData || !sensorData.thermal || !canvasRef.current) return;
    
    const thermal = sensorData.thermal;
    const len = thermal.length;
    // Assume 8x8 or 32x24
    const cols = len === 768 ? 32 : 8;
    const rows = len === 768 ? 24 : 8;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const width = canvas.width;
    const height = canvas.height;
    
    // Scale factors from raw grid to canvas pixels
    const scaleX = width / cols;
    const scaleY = height / rows;

    let animationFrameId;

    const render = () => {
      // 1. Find min/max for normalization (or use fixed range 20C-40C)
      let minT = 20;
      let maxT = 40;
      
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      // Simple Bilinear Interpolation upscale
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Map canvas pixel back to raw grid float coords
          const gx = (x / width) * cols - 0.5;
          const gy = (y / height) * rows - 0.5;
          
          const x0 = Math.max(0, Math.floor(gx));
          const x1 = Math.min(cols - 1, x0 + 1);
          const y0 = Math.max(0, Math.floor(gy));
          const y1 = Math.min(rows - 1, y0 + 1);
          
          const tx = gx - x0;
          const ty = gy - y0;
          
          const p00 = thermal[y0 * cols + x0];
          const p10 = thermal[y0 * cols + x1];
          const p01 = thermal[y1 * cols + x0];
          const p11 = thermal[y1 * cols + x1];
          
          const interp = p00 * (1 - tx) * (1 - ty) +
                         p10 * tx * (1 - ty) +
                         p01 * (1 - tx) * ty +
                         p11 * tx * ty;
          
          // Normalize to 0-1 for colormap
          const norm = (interp - minT) / (maxT - minT);
          const color = getInfernoColor(norm);
          
          const idx = (y * width + x) * 4;
          data[idx] = color[0];
          data[idx+1] = color[1];
          data[idx+2] = color[2];
          data[idx+3] = 255;
        }
      }
      
      ctx.putImageData(imgData, 0, 0);

      // 2. Blob Detection & Bounding Box Overlays
      const blobResult = blobDetect(thermal, thresholds.temp_celsius, thresholds.min_blob_area);
      
      if (blobResult.detected && blobResult.boundingBox) {
        const bb = blobResult.boundingBox;
        ctx.strokeStyle = '#EF4444'; // Tailwind danger
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        // Convert grid coords to canvas coords
        const cx = bb.x * scaleX;
        const cy = bb.y * scaleY;
        const cw = bb.w * scaleX;
        const ch = bb.h * scaleY;
        
        ctx.strokeRect(cx, cy, cw, ch);
        
        // Update stats state occasionally (throttle to avoid massive re-renders)
        setStats(prev => {
          if (Math.abs(prev.peak - blobResult.peakTemp) > 0.5 || prev.area !== blobResult.blobArea) {
            return { peak: blobResult.peakTemp, area: blobResult.blobArea };
          }
          return prev;
        });
      } else {
        setStats(prev => prev.area > 0 ? { peak: 0, area: 0 } : prev);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [sensorData, thresholds]);

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full">
      <h3 className="flex items-center font-medium text-text mb-4 border-b border-secondary/50 pb-2">
        <Flame className="w-4 h-4 mr-2 text-cta" />
        Thermal Heatmap
      </h3>
      
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="relative w-full max-w-[300px] aspect-[3/2] bg-primary rounded overflow-hidden border border-secondary">
          <canvas 
            ref={canvasRef} 
            width={300} 
            height={200}
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className="mt-4 flex w-full justify-between items-center text-xs text-text/80 max-w-[300px]">
          <span className="flex items-center">
            <Info className="w-3 h-3 mr-1" />
            Peak: <span className="font-mono text-text ml-1">{stats.peak.toFixed(1)}°C</span>
          </span>
          <span>
            Blob Area: <span className="font-mono text-text ml-1">{stats.area}px</span>
          </span>
        </div>
      </div>
    </div>
  );
}
