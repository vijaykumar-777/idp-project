import { useEffect } from 'react';
import { useBot } from '../context/BotContext';
import { Navigation, MapPin, Satellite } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Resolve leaflet default marker icon path issue in Vite builds
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom helper to re-center Leaflet map dynamically when coordinates change
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function parseGNGGA(sentence) {
  if (!sentence || typeof sentence !== 'string') return null;
  if (!sentence.startsWith('$GNGGA') && !sentence.startsWith('$GPGGA')) return null;

  const parts = sentence.split(',');
  if (parts.length < 8) return null;

  const rawLat = parts[2];
  const latDir = parts[3];
  const rawLng = parts[4];
  const lngDir = parts[5];
  const fixQuality = parseInt(parts[6], 10) || 0;
  const sats = parseInt(parts[7], 10) || 0;

  if (!rawLat || !latDir || !rawLng || !lngDir) {
    return { lat: 0, lng: 0, sats: sats, fix: false };
  }

  // Parse Latitude: DDMM.MMMM
  const latDotIdx = rawLat.indexOf('.');
  const latDegStr = latDotIdx > 2 ? rawLat.substring(0, latDotIdx - 2) : '0';
  const latMinStr = latDotIdx > 2 ? rawLat.substring(latDotIdx - 2) : rawLat;
  const latDegrees = parseFloat(latDegStr) || 0;
  const latMinutes = parseFloat(latMinStr) || 0;
  let lat = latDegrees + (latMinutes / 60);
  if (latDir === 'S') lat = -lat;

  // Parse Longitude: DDDMM.MMMM
  const lngDotIdx = rawLng.indexOf('.');
  const lngDegStr = lngDotIdx > 2 ? rawLng.substring(0, lngDotIdx - 2) : '0';
  const lngMinStr = lngDotIdx > 2 ? rawLng.substring(lngDotIdx - 2) : rawLng;
  const lngDegrees = parseFloat(lngDegStr) || 0;
  const lngMinutes = parseFloat(lngMinStr) || 0;
  let lng = lngDegrees + (lngMinutes / 60);
  if (lngDir === 'W') lng = -lng;

  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
    sats: sats,
    fix: fixQuality > 0
  };
}

export function GpsPanel() {
  const { sensorData } = useBot();

  let gps = { lat: 0, lng: 0, sats: 0, fix: false };
  if (typeof sensorData?.gps === 'string') {
    gps = parseGNGGA(sensorData.gps) || gps;
  } else if (sensorData?.gps && typeof sensorData.gps === 'object') {
    gps = sensorData.gps;
  }

  const hasFix = gps.fix && gps.sats > 3;

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-secondary/50 pb-2 shrink-0">
        <h3 className="flex items-center font-medium text-text">
          <Navigation className="w-4 h-4 mr-2 text-cta" />
          GPS Location
        </h3>
        <div className={`flex items-center text-xs font-mono px-2 py-0.5 rounded ${hasFix ? 'bg-cta/20 text-cta' : 'bg-danger/20 text-danger'}`}>
          <Satellite className="w-3 h-3 mr-1" />
          {hasFix ? `${gps.sats} Sats` : 'No Fix'}
        </div>
      </div>

      {/* Main content side by side */}
      <div className="flex-grow flex flex-row gap-4 min-h-0 h-full">
        {/* Left: Info */}
        <div className="w-[45%] flex flex-col justify-between py-1 min-w-0">
          <div className="bg-background/50 rounded p-2 border border-secondary/30 flex items-start space-x-2 min-h-0">
            <MapPin className="w-4 h-4 text-text/50 mt-0.5 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-text/50 uppercase tracking-wider mb-0.5">Coordinates</span>
              <div className="font-mono text-xs text-text tracking-wide leading-tight">
                {hasFix ? (
                  <>
                    <div className="font-semibold">{gps.lat.toFixed(6)}° N</div>
                    <div className="font-semibold">{Math.abs(gps.lng).toFixed(6)}° {gps.lng < 0 ? 'W' : 'E'}</div>
                  </>
                ) : (
                  <div className="text-text/40 italic">Acquiring coordinates...</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-text/70 mt-1">
            Status: <span className="font-mono uppercase font-semibold">{hasFix ? '3D Fix' : 'No Lock'}</span>
          </div>
        </div>

        {/* Right: Map Container */}
        <div className="w-[55%] relative border border-secondary/30 rounded overflow-hidden bg-background/30 h-full min-h-[100px]">
          {hasFix ? (
            <MapContainer 
              center={[gps.lat, gps.lng]} 
              zoom={16} 
              zoomControl={false}
              attributionControl={false}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[gps.lat, gps.lng]} />
              <RecenterMap center={[gps.lat, gps.lng]} />
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Minimal targeting reticle/grid representation */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)',
                backgroundSize: '15px 15px'
              }}></div>
              <div className="absolute w-full h-[1px] bg-cta/20"></div>
              <div className="absolute h-full w-[1px] bg-cta/20"></div>
              <span className="text-[10px] text-text/40 z-10 animate-pulse font-mono uppercase">Acquiring coordinates</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
