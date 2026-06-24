import { StatusBar } from './components/StatusBar';
import { AlertBanner } from './components/AlertBanner';
import { Co2Panel } from './components/Co2Panel';
import { ThermalPanel } from './components/ThermalPanel';
import { ThresholdConfig } from './components/ThresholdConfig';
import { ControlPanel } from './components/ControlPanel';
import { SessionLog } from './components/SessionLog';
import { GpsPanel } from './components/GpsPanel';

function App() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-1">
            Rescue Bot Dashboard
          </h1>
          <p className="text-sm text-text/80">Tactical search & rescue monitoring interface</p>
        </div>
        <div className="mt-4 sm:mt-0 font-mono text-xs text-text/70 bg-secondary/30 px-3 py-1.5 rounded border border-secondary/50">
          v1.0.0
        </div>
      </header>

      <StatusBar />
      <AlertBanner />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-grow">
        
        {/* Row 1: Visualizations */}
        <div className="flex flex-col gap-4">
          <div className="h-[250px] lg:h-[300px]">
            <Co2Panel />
          </div>
          <div className="h-[250px] lg:h-[300px]">
            <ThermalPanel />
          </div>
        </div>

        {/* Row 2: Controls & Config */}
        <div className="flex flex-col gap-4">
          <div className="h-[200px] lg:h-[220px]">
            <GpsPanel />
          </div>
          <div className="h-[250px] lg:h-[280px]">
            <ControlPanel />
          </div>
          <div className="h-auto">
            <ThresholdConfig />
          </div>
        </div>

        {/* Row 3: Logs spanning full width */}
        <div className="lg:col-span-2 h-[250px] mt-2">
          <SessionLog />
        </div>
      </div>
    </div>
  );
}

export default App;
