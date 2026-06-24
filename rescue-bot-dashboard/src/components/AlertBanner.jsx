import { useBot } from '../context/BotContext';
import { AlertTriangle, X } from 'lucide-react';

export function AlertBanner() {
  const { activeAlert, dismissAlert } = useBot();

  if (!activeAlert) return null;

  return (
    <div className="bg-danger/20 border border-danger/50 text-danger p-4 rounded-lg flex items-start sm:items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse mb-4">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="w-6 h-6 text-danger shrink-0" />
        <span className="font-medium text-sm sm:text-base leading-tight">
          {activeAlert}
        </span>
      </div>
      <button 
        onClick={dismissAlert}
        className="ml-4 p-1 hover:bg-danger/30 rounded-md transition-colors shrink-0 cursor-pointer"
        aria-label="Dismiss alert"
      >
        <X className="w-5 h-5 text-danger" />
      </button>
    </div>
  );
}
