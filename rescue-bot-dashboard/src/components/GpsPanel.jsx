import { useBot } from '../context/BotContext';
import { Navigation, MapPin, Satellite } from 'lucide-react';

export function GpsPanel() {
  const { sensorData } = useBot();

  const gps = sensorData?.gps || { lat: 0, lng: 0, sats: 0, fix: false };
  const hasFix = gps.fix && gps.sats > 3;

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 border-b border-secondary/50 pb-2">
        <h3 className="flex items-center font-medium text-text">
          <Navigation className="w-4 h-4 mr-2 text-cta" />
          GPS Location
        </h3>
        <div className={`flex items-center text-xs font-mono px-2 py-1 rounded ${hasFix ? 'bg-cta/20 text-cta' : 'bg-danger/20 text-danger'}`}>
          <Satellite className="w-3 h-3 mr-1" />
          {hasFix ? `${gps.sats} Sats (3D Fix)` : 'No Fix'}
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center space-y-4">
        <div className="bg-background/50 rounded p-3 border border-secondary/30 flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-text/50 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-xs text-text/50 uppercase tracking-wider mb-1">Coordinates</span>
            <div className="font-mono text-lg text-text tracking-wide">
              {hasFix ? (
                <>
                  <div>{gps.lat.toFixed(6)}° N</div>
                  <div>{Math.abs(gps.lng).toFixed(6)}° {gps.lng < 0 ? 'W' : 'E'}</div>
                </>
              ) : (
                <div className="text-text/30">Acquiring signal...</div>
              )}
            </div>
          </div>
        </div>

        {/* Minimal targeting reticle/grid representation */}
        <div className="flex-grow relative border border-secondary/30 rounded overflow-hidden bg-background/30 flex items-center justify-center min-h-[100px]">
          {/* Grid lines */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
          
          {/* Crosshair */}
          <div className="absolute w-full h-[1px] bg-cta/30"></div>
          <div className="absolute h-full w-[1px] bg-cta/30"></div>
          
          {/* Dot */}
          {hasFix && (
            <div className="absolute w-3 h-3 bg-cta rounded-full shadow-[0_0_10px_rgba(20,184,166,0.8)] animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
}
