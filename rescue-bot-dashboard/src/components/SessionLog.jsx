import { useBot } from '../context/BotContext';
import { Database, Download, Trash2 } from 'lucide-react';

export function SessionLog() {
  const { logs, clearLogs } = useBot();

  const handleExport = () => {
    if (logs.length === 0) return;

    // Create CSV content
    const headers = ['Timestamp', 'Time', 'CO2_ppm', 'Peak_Temp_C', 'Blob_Area_px', 'Battery_mV'];
    const rows = logs.map(l => {
      const date = new Date(l.timestamp);
      return [
        l.timestamp,
        date.toISOString(),
        l.co2_ppm,
        l.peak_temp,
        l.blob_area,
        l.battery_mv || ''
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rescue_bot_session_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-secondary/50 pb-2 shrink-0">
        <h3 className="flex items-center font-medium text-text">
          <Database className="w-4 h-4 mr-2 text-cta" />
          Session Log
        </h3>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={clearLogs}
            disabled={logs.length === 0}
            className="p-1.5 text-text/80 hover:text-danger hover:bg-danger/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center px-3 py-1.5 text-xs font-medium bg-primary text-text/90 hover:bg-secondary hover:text-text border border-secondary/80 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Download className="w-3 h-3 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto min-h-[150px]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-text/70 italic">
            No alerts logged in this session.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#060B19] text-text/80 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2 px-3 font-medium border-b border-secondary/50">Time</th>
                <th className="py-2 px-3 font-medium border-b border-secondary/50">CO₂ (ppm)</th>
                <th className="py-2 px-3 font-medium border-b border-secondary/50">Peak Temp</th>
                <th className="py-2 px-3 font-medium border-b border-secondary/50 hidden sm:table-cell">Blob Area</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/30">
              {logs.map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
                return (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs text-text/90">{timeStr}</td>
                    <td className="py-2 px-3 font-mono text-xs text-danger">{log.co2_ppm}</td>
                    <td className="py-2 px-3 font-mono text-xs text-danger">{log.peak_temp}°C</td>
                    <td className="py-2 px-3 font-mono text-xs text-text/90 hidden sm:table-cell">{log.blob_area}px</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
