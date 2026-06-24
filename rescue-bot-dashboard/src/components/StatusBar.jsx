import { useBot } from '../context/BotContext';
import { Wifi, WifiOff, Battery, Zap } from 'lucide-react';

export function StatusBar() {
  const { wsStatus, packetRate, sensorData } = useBot();

  const isConnected = wsStatus === 'connected' || wsStatus === 'simulated';
  
  // Calculate battery percentage (assuming 3.2V min, 4.2V max)
  const mv = sensorData?.battery_mv || 0;
  const batteryPct = Math.max(0, Math.min(100, ((mv - 3200) / (4200 - 3200)) * 100));
  const volts = (mv / 1000).toFixed(1);

  return (
    <div className="flex items-center justify-between bg-secondary/50 backdrop-blur-sm border border-secondary/80 rounded-lg p-3 shadow-sm mb-4">
      <div className="flex items-center space-x-6">
        
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-cta glow-green" />
          ) : (
            <WifiOff className="w-5 h-5 text-danger" />
          )}
          <span className="font-mono text-sm uppercase tracking-wider text-text">
            {wsStatus}
          </span>
        </div>

        {/* Packet Rate */}
        <div className="hidden sm:flex items-center space-x-2 text-text/80">
          <Zap className="w-4 h-4" />
          <span className="font-mono text-sm">{packetRate} pkt/s</span>
        </div>
      </div>

      {/* Battery */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Battery className={`w-5 h-5 ${batteryPct > 20 ? 'text-cta' : 'text-danger'}`} />
          <span className="font-mono text-sm">{volts}V</span>
        </div>
        <div className="w-20 h-2 bg-primary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${batteryPct > 20 ? 'bg-cta' : 'bg-danger'}`} 
            style={{ width: `${batteryPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
