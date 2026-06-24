import { useState, useEffect } from 'react';

/**
 * Injects dummy sensor data at ~10Hz for UI testing without the bot.
 */
export function useDummyData(enabled = false) {
  const [sensorData, setSensorData] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    let interval;
    let t = 0;
    
    interval = setInterval(() => {
      t += 0.1;
      
      // Simulate CO2 with some sine wave + noise
      const baseCo2 = 400;
      const co2 = Math.floor(baseCo2 + Math.max(0, Math.sin(t * 0.5) * 800) + (Math.random() * 50));
      
      // Simulate 8x8 thermal array
      const thermal = Array.from({ length: 64 }, (_, i) => {
        const x = i % 8;
        const y = Math.floor(i / 8);
        
        // Moving hot blob
        const blobX = 4 + Math.sin(t) * 2;
        const blobY = 4 + Math.cos(t) * 2;
        const dist = Math.sqrt(Math.pow(x - blobX, 2) + Math.pow(y - blobY, 2));
        
        // Background temp ~25, blob peak ~36
        return 25 + Math.random() * 2 + Math.max(0, 10 - dist * 3);
      });

      // Simulate GPS data
      const baseLat = 37.7749;
      const baseLng = -122.4194;

      setSensorData({
        co2_ppm: co2,
        thermal,
        timestamp: Date.now(),
        battery_mv: 3700 + Math.sin(t*0.1) * 300, // 3.4V to 4.0V
        gps: {
          lat: +(baseLat + Math.sin(t * 0.05) * 0.001).toFixed(6),
          lng: +(baseLng + Math.cos(t * 0.05) * 0.001).toFixed(6),
          sats: Math.floor(6 + Math.random() * 4), // 6 to 9 satellites
          fix: true
        }
      });
    }, 100); // 10Hz

    return () => clearInterval(interval);
  }, [enabled]);

  return sensorData;
}
