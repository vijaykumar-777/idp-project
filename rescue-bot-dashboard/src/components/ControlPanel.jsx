import { useState, useEffect, useRef } from 'react';
import { useBot } from '../context/BotContext';
import { Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square } from 'lucide-react';

export function ControlPanel() {
  const { wsStatus, sendCommand } = useBot();
  const isConnected = wsStatus === 'connected' || wsStatus === 'simulated';

  const [speed, setSpeed] = useState(180); // Default Medium
  const [lastCmd, setLastCmd] = useState(null);
  
  // Track time since last command
  const [msElapsed, setMsElapsed] = useState(0);
  const timerRef = useRef(null);

  const handleCommand = (dir) => {
    if (!isConnected) return;
    
    // Only send if it's "stop" or a movement command
    const spd = dir === 'stop' ? 0 : speed;
    sendCommand(dir, spd);
    
    setLastCmd({ dir, speed: spd, time: Date.now() });
    
    // Reset timer
    if (timerRef.current) clearInterval(timerRef.current);
    setMsElapsed(0);
    timerRef.current = setInterval(() => {
      setMsElapsed(prev => prev + 100);
    }, 100);
  };

  useEffect(() => {
    if (!isConnected) return;

    const handleKeyDown = (e) => {
      // Prevent default scrolling for arrows
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Avoid repeated keydown events if held
      if (e.repeat) return;

      switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w': handleCommand('forward'); break;
        case 'arrowdown':
        case 's': handleCommand('backward'); break;
        case 'arrowleft':
        case 'a': handleCommand('left'); break;
        case 'arrowright':
        case 'd': handleCommand('right'); break;
      }
    };

    const handleKeyUp = (e) => {
      if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(e.key.toLowerCase())) {
        handleCommand('stop');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, speed, sendCommand]);

  return (
    <div className="bg-secondary/30 border border-secondary/50 rounded-lg p-4 flex flex-col h-full opacity-100 transition-opacity" style={{ opacity: isConnected ? 1 : 0.5 }}>
      <div className="flex items-center justify-between mb-4 border-b border-secondary/50 pb-2">
        <h3 className="flex items-center font-medium text-text">
          <Gamepad2 className="w-4 h-4 mr-2 text-cta" />
          Bot Control
        </h3>
        {lastCmd && (
          <div className="font-mono text-xs text-text/80">
            {lastCmd.dir.toUpperCase()} <span className="mx-1 text-text/60">|</span> {msElapsed}ms
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 flex-grow">
        
        {/* D-Pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2">
          <div />
          <ControlButton 
            icon={<ArrowUp className="w-6 h-6" />} 
            dir="forward" 
            onCommand={handleCommand} 
            disabled={!isConnected} 
          />
          <div />
          
          <ControlButton 
            icon={<ArrowLeft className="w-6 h-6" />} 
            dir="left" 
            onCommand={handleCommand} 
            disabled={!isConnected} 
          />
          <ControlButton 
            icon={<Square className="w-4 h-4 text-danger" />} 
            dir="stop" 
            onCommand={handleCommand} 
            disabled={!isConnected} 
            className="bg-primary hover:bg-danger/20 border-danger/50"
          />
          <ControlButton 
            icon={<ArrowRight className="w-6 h-6" />} 
            dir="right" 
            onCommand={handleCommand} 
            disabled={!isConnected} 
          />
          
          <div />
          <ControlButton 
            icon={<ArrowDown className="w-6 h-6" />} 
            dir="backward" 
            onCommand={handleCommand} 
            disabled={!isConnected} 
          />
          <div />
        </div>

        {/* Speed & Settings */}
        <div className="flex flex-col w-full max-w-[200px] mt-4 sm:mt-0">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-text/80">Speed (PWM)</label>
            <span className="font-mono text-xs text-cta">{speed}</span>
          </div>
          <input 
            type="range" 
            min="100" 
            max="255" 
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            disabled={!isConnected}
            className="w-full h-2 bg-primary rounded-lg appearance-none cursor-pointer accent-cta"
          />
          <div className="flex justify-between text-[10px] text-text/70 mt-1 uppercase">
            <span>Low</span>
            <span>Med</span>
            <span>High</span>
          </div>
        </div>

      </div>
    </div>
  );
}

function ControlButton({ icon, dir, onCommand, disabled, className = "" }) {
  // Use pointer events for robust touch/mouse support (press & hold)
  return (
    <button
      disabled={disabled}
      onPointerDown={() => onCommand(dir)}
      onPointerUp={() => onCommand('stop')}
      onPointerLeave={() => onCommand('stop')}
      className={`w-12 h-12 flex items-center justify-center bg-primary border border-secondary rounded-lg text-text/90 hover:bg-secondary hover:text-text transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  );
}
