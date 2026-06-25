import { useBot } from '../context/BotContext';
import { Settings2, RotateCcw } from 'lucide-react';

export function ThresholdConfig() {
  const { thresholds, setThresholds, wsUrl, setWsUrl } = useBot();

  const handleChange = (key, value) => {
    setThresholds(prev => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  const resetDefaults = () => {
    setThresholds({
      co2_ppm: 1000,
      temp_celsius: 34.0,
      min_blob_area: 4,
      hold_frames: 3,
    });
  };

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-secondary/50 pb-2">
        <h3 className="flex items-center font-medium text-text">
          <Settings2 className="w-4 h-4 mr-2 text-cta" />
          Settings & Configs
        </h3>
        <button 
          onClick={resetDefaults}
          className="text-xs text-text/80 hover:text-text flex items-center cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </button>
      </div>

      {/* Connection Config */}
      <div className="mb-4 bg-primary/20 p-2.5 rounded border border-secondary/50 flex flex-col">
        <label className="text-xs text-text/80 mb-1 font-semibold">WebSocket Connection URL</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-grow bg-primary border border-secondary/80 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-cta/50 transition-colors text-text"
            placeholder="ws://192.168.4.1:81"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
          />
          {wsUrl && (
            <button 
              onClick={() => setWsUrl('')}
              className="text-[10px] px-2 py-0.5 border border-secondary/80 rounded hover:bg-secondary/30 text-text/80 cursor-pointer transition-colors font-mono"
            >
              SIMULATE
            </button>
          )}
        </div>
        <span className="text-[9px] text-text/60 mt-1">
          Provide your ESP32's endpoint (e.g. <code>ws://192.168.4.1:81/ws</code> or <code>ws://192.168.4.1:81</code>). Clear the field to run the simulator.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-grow">
        <div className="flex flex-col">
          <label className="text-xs text-text/80 mb-1">CO₂ Limit (ppm)</label>
          <input 
            type="number" 
            className="bg-primary border border-secondary/80 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-cta/50 transition-colors"
            value={thresholds.co2_ppm}
            onChange={(e) => handleChange('co2_ppm', e.target.value)}
            step="50"
            min="400"
          />
        </div>
        
        <div className="flex flex-col">
          <label className="text-xs text-text/80 mb-1">Temp Limit (°C)</label>
          <input 
            type="number" 
            className="bg-primary border border-secondary/80 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-cta/50 transition-colors"
            value={thresholds.temp_celsius}
            onChange={(e) => handleChange('temp_celsius', e.target.value)}
            step="0.5"
            min="20"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-text/80 mb-1">Blob Area (px)</label>
          <input 
            type="number" 
            className="bg-primary border border-secondary/80 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-cta/50 transition-colors"
            value={thresholds.min_blob_area}
            onChange={(e) => handleChange('min_blob_area', e.target.value)}
            step="1"
            min="1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-text/80 mb-1">Hold Time (frames)</label>
          <input 
            type="number" 
            className="bg-primary border border-secondary/80 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-cta/50 transition-colors"
            value={thresholds.hold_frames}
            onChange={(e) => handleChange('hold_frames', e.target.value)}
            step="1"
            min="1"
          />
        </div>
      </div>
    </div>
  );
}
