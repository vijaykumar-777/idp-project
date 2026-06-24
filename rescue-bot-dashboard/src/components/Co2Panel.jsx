import { useState, useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { Wind } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

export function Co2Panel() {
  const { sensorData, thresholds } = useBot();
  const [dataHistory, setDataHistory] = useState([]);

  useEffect(() => {
    if (!sensorData) return;
    
    setDataHistory(prev => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      
      const newPoint = {
        time: timeStr,
        ppm: sensorData.co2_ppm,
        timestamp: sensorData.timestamp
      };
      
      const newHistory = [...prev, newPoint];
      // Keep only the last 60 points (~6 seconds at 10Hz, or throttle it if we want 60s)
      // To show 60 seconds at 10Hz would be 600 points. We'll keep 60 for performance.
      if (newHistory.length > 60) {
        newHistory.shift();
      }
      return newHistory;
    });
  }, [sensorData]);

  const currentPpm = sensorData?.co2_ppm || 400;
  const isAlert = currentPpm > thresholds.co2_ppm;

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 border-b border-secondary/50 pb-2">
        <h3 className="flex items-center font-medium text-text">
          <Wind className="w-4 h-4 mr-2 text-cta" />
          CO₂ Level
        </h3>
        <div className={`font-mono text-xl ${isAlert ? 'text-danger glow-text' : 'text-text'}`}>
          {currentPpm} <span className="text-sm text-text/80">ppm</span>
        </div>
      </div>

      <div className="flex-grow min-h-[160px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataHistory} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#475569" 
              fontSize={10} 
              tick={{fill: '#475569'}} 
              tickMargin={5}
              minTickGap={20}
            />
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              tick={{fill: '#475569'}} 
              domain={[400, 'auto']}
            />
            <ReferenceLine 
              y={thresholds.co2_ppm} 
              stroke="#EF4444" 
              strokeDasharray="3 3" 
              label={{ position: 'insideTopLeft', value: 'Threshold', fill: '#EF4444', fontSize: 10 }} 
            />
            <Line 
              type="monotone" 
              dataKey="ppm" 
              stroke={isAlert ? '#EF4444' : '#22C55E'} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
