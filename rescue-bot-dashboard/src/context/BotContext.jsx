import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDummyData } from '../hooks/useDummyData';
import { useSessionLog } from '../hooks/useSessionLog';
import { blobDetect } from '../utils/blobDetect';
import { evaluateAlert } from '../utils/alertEngine';

const BotContext = createContext(null);

// Audio context for beep
let audioCtx = null;
function playBeep() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Play 3 short beeps
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + i * 0.4);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.4);
    gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + i * 0.4 + 0.05);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + i * 0.4 + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime + i * 0.4);
    osc.stop(audioCtx.currentTime + i * 0.4 + 0.3);
  }
}

export function BotProvider({ children }) {
  // Use VITE_BOT_IP if defined, else local mock logic
  const botIp = import.meta.env.VITE_BOT_IP;
  const wsUrl = botIp ? `ws://${botIp}:81/ws` : null;
  const useDummy = !botIp; // fallback to dummy data if no IP provided

  const { sensorData: wsData, wsStatus, sendCommand, packetRate } = useWebSocket(wsUrl);
  const dummyData = useDummyData(useDummy);
  
  const sensorData = useDummy ? dummyData : wsData;
  const currentWsStatus = useDummy ? 'simulated' : wsStatus;
  const currentPacketRate = useDummy ? 10 : packetRate;

  const { logs, addLog, clearLogs } = useSessionLog();

  // Thresholds (load from localStorage)
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('rescuebot_thresholds');
    if (saved) return JSON.parse(saved);
    return {
      co2_ppm: 1000,
      temp_celsius: 34.0,
      min_blob_area: 4,
      hold_frames: 3,
    };
  });

  // Save thresholds on change
  useEffect(() => {
    localStorage.setItem('rescuebot_thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  const [activeAlert, setActiveAlert] = useState(null);
  
  // Buffers and Refs to prevent excessive re-renders on every frame just for the engine
  const frameBufferRef = useRef([]);

  // Process every new sensor frame
  useEffect(() => {
    if (!sensorData) return;

    // 1. Run blob detection
    const blobResult = blobDetect(sensorData.thermal, thresholds.temp_celsius, thresholds.min_blob_area);
    
    // 2. Evaluate alert
    const { alert, newBuffer } = evaluateAlert(
      sensorData.co2_ppm, 
      blobResult.detected, 
      blobResult.peakTemp, 
      thresholds, 
      frameBufferRef.current
    );
    
    frameBufferRef.current = newBuffer;

    if (alert) {
      if (!activeAlert) {
        // Fire Audio
        playBeep();
        
        // Show Banner
        setActiveAlert("⚠ Possible unconscious person detected — check thermal panel");
        
        // Log to IndexedDB
        addLog({
          co2_ppm: sensorData.co2_ppm,
          peak_temp: blobResult.peakTemp.toFixed(1),
          blob_area: blobResult.blobArea,
          battery_mv: sensorData.battery_mv
        });
      }
      
      // Clear buffer so it doesn't constantly re-trigger 
      frameBufferRef.current = [];
    }

  }, [sensorData, thresholds, activeAlert, addLog]);

  const dismissAlert = () => setActiveAlert(null);

  const value = {
    sensorData,
    wsStatus: currentWsStatus,
    packetRate: currentPacketRate,
    sendCommand,
    thresholds,
    setThresholds,
    activeAlert,
    dismissAlert,
    logs,
    clearLogs
  };

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  );
}

export const useBot = () => useContext(BotContext);
