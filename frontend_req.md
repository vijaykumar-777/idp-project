# Frontend Requirements: Rescue Bot Dashboard

Based on the project journal, here are the detailed frontend requirements for the Rescue Bot Monitoring & Control Dashboard.

## 1. Technology Stack
- **Framework**: React 18 + Vite (for fast HMR and component-based architecture)
- **Styling**: Tailwind CSS v3 (for rapid responsive layout and built-in dark mode)
- **Real-time Data**: Native browser `WebSocket` API (bidirectional communication)
- **Visualizations**:
  - **Thermal Heatmap**: HTML5 `<canvas>` (for high-performance bilinear interpolation + color mapping)
  - **CO₂ Chart**: Recharts (for scrolling time-series data)
- **Alert System**: Web Audio API + React state banner (in-browser audio without dependencies)
- **Data Persistence**:
  - **Session Logs**: IndexedDB via `idb` npm package (survives page refreshes)
  - **Configurations**: `localStorage` (for threshold settings)
- **State Management**: React Context + `useReducer`
- **File Export**: Native `Blob` + anchor download (for CSV export)

## 2. Core Features & Components

### 2.1 Connection & Status (`StatusBar.jsx`)
- Display current WebSocket connection status ("connecting", "connected", "disconnected").
- Show real-time packet rate (packets/sec).
- Show bot battery voltage.
- Handle automatic WebSocket reconnection with exponential backoff (1s, 2s, 4s, 8s, up to max 30s).

### 2.2 Sensor Visualizations
- **Thermal Panel (`ThermalPanel.jsx`)**: 
  - Render an upscaled canvas heatmap using the raw pixel array (8x8 or 32x24).
  - Map temperatures to an Inferno/Turbo color palette.
  - Run blob detection (connected components) to identify potential heat signatures.
  - Draw bounding box overlays on the canvas for detected blobs (scaling from raw grid to canvas pixels).
  - Display the peak temperature and blob pixel count.
- **CO₂ Panel (`Co2Panel.jsx`)**: 
  - Display live CO₂ ppm readings.
  - Render a rolling time-series chart representing a 60-second window, mapped to 3 color zones.

### 2.3 Alerting Engine (`alertEngine.js` & `AlertBanner.jsx`)
- Trigger alerts using **sensor fusion** where ALL of the following conditions are met for a set number of consecutive frames (to avoid noise):
  1. CO₂ ppm > configured threshold.
  2. Thermal blob detected.
  3. Blob peak temperature > configured threshold.
- UI Indication: Show a dismissible, full-width red banner alert.
- Audio Indication: Trigger a Web Audio API beep (e.g., oscillator at 880Hz, 0.3s beep, repeated 3 times).
- Automatically log the alert event into IndexedDB.

### 2.4 Remote Control (`ControlPanel.jsx`)
- **D-pad UI**: 4 directional buttons + a center stop button. Must be touch-optimized with at least 48px target sizes.
- **Keyboard Handling**: Listen to arrow keys and WASD. 
  - `keydown` sends movement commands immediately without throttling.
  - `keyup` sends an immediate "stop" command (safety-critical).
- **Speed Control**: Slider mapping to motor PWM values (Low=100, Medium=180, High=255).
- **Command Output**: Send JSON movement commands via the existing WebSocket connection (e.g., `{ "cmd": "move", "dir": "forward", "speed": 180 }`).
- **Telemetry**: Display a command echo showing the last sent command and time elapsed.
- Ensure all controls are disabled when the WebSocket is disconnected.

### 2.5 Configuration & Logs
- **Threshold Configuration (`ThresholdConfig.jsx`)**: 
  - Input fields for CO₂ limit, Temperature limit, Minimum blob area, and Hold frames.
  - Automatically persist changes to `localStorage` (no save button required).
- **Session Log (`SessionLog.jsx`)**: 
  - A table displaying the history of alerts (timestamp, CO₂ ppm, peak temp, blob area).
  - Functionality to export the session log table to a CSV file.

## 3. UI/UX & Responsive Layout

**Desktop Layout (Grid):**
- **Top Row**: Status Bar
- **Middle Row**: CO₂ Panel (left) | Thermal Heatmap (right)
- **Lower Middle Row**: Threshold Config (left) | Bot Control (right)
- **Bottom Row**: Session Log with CSV export

**Mobile Layout (< 768px):**
- All panels stack vertically for narrow viewports.

## 4. Critical Implementation Constraints
- **Single WebSocket Connection**: The dashboard must use a single bidirectional WebSocket for both receiving sensor data and sending movement commands.
- **No Input Latency**: Do NOT debounce or throttle keydown movement commands.
- **Canvas Performance**: The thermal canvas must be updated via direct `canvas.getContext('2d')` calls within `requestAnimationFrame`. **Do not** use React state re-renders for the canvas to avoid 60fps performance jank.
- **Grid Coordinates**: Blob detection is processed on the raw sensor grid. Bounding box coordinates must be correctly scaled to the canvas CSS pixel dimensions before drawing.
