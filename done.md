# Rescue Bot Dashboard — Project Handoff & Summary

This document provides a comprehensive summary of the **Rescue Bot Monitoring & Control Dashboard** project. It details the system architecture, frontend layout, data flow, core algorithms, and the current implementation status of all software components.

---

## 1. Project Overview

The project is a search-and-rescue dashboard designed to interface with an autonomous, caterpillar-tracked, palm-sized robot. The robot crawls under collapsed structures to locate unconscious survivors. 

### Core Features:
- **Sensor Fusion Alerting:** Combines **CO₂ concentration** (respiratory gas accumulation) and **thermal infrared blobs** (body heat signature) to detect human presence while filtering out environmental noise.
- **Bi-Directional Telemetry & Navigation:** Receives live sensor feeds and sends real-time movement commands over a single WebSocket connection.
- **Web-Based Mission Control:** Visualizes time-series gas levels, renders an upscaled thermal heatmap with target-tracking overlays, displays GPS navigation telemetry, and provides config and persistent logging tools.

---

## 2. System Architecture & Data Flow

```
   ┌─────────────────┐
   │   CO₂ Sensor    │◄─── I²C/ADC ───┐
   └─────────────────┘                │
   ┌─────────────────┐                ▼
   │ Thermal Camera  │◄───── I²C ─────┤  [ESP32 Microcontroller]
   └─────────────────┘                │  (Websocket Server, Port 81)
   ┌─────────────────┐                │
   │       GPS       │◄───── UART ────┘
   └─────────────────┘
            │                                 ▲
            ▼                                 │
     JSON Telemetry Feed (~10Hz)       Movement Commands
            │                                 │
            ▼                                 │
   ┌────────────────────────────────────────────────────────┐
   │             React Browser Dashboard (Vite)             │
   └────────────────────────────────────────────────────────┘
```

### Telemetry Payload (ESP32 → Browser)
A single JSON broadcast pushed at ~10 Hz containing:
- `co2_ppm`: Carbon dioxide concentration in parts per million.
- `thermal`: Flat array of temperature readings (64 floats for AMG8833 8x8, or 768 floats for MLX90640 32x24).
- `battery_mv`: Battery capacity indicators (millivolts).
- `gps`: Location object containing latitude, longitude, satellite count, and 3D fix status.

### Control Payload (Browser → ESP32)
Command packets sent to direct motor PWM outputs:
```json
{ "cmd": "move", "dir": "forward", "speed": 180 }
```
* **Directions (`dir`):** `"forward"` | `"backward"` | `"left"` | `"right"` | `"stop"`
* **Speed (`speed`):** PWM duty cycle represented as an integer from `0` to `255`.
* **Safety Watchdog:** The ESP32 is designed with a 500 ms safety timeout. If no movement packet is received within 500 ms, the motors automatically cut power (`stop`) to prevent a runaway condition in case of network dropouts.

---

## 3. Project Directory Structure

The workspace is structured as a standard Vite React workspace utilizing Tailwind CSS:

```
idp-project/
├── PROJECT_JOURNAL.md           # Handoff spec and technical overview
├── frontend_req.md              # Detailed UI/UX and functional requirements
├── hardware_connection_steps.md # Instructions for connecting the physical bot to the web app
├── done.md                      # [THIS FILE] Project summary documentation
└── rescue-bot-dashboard/
    ├── index.html               # Main page template (loads Google Fonts)
    ├── vite.config.js           # Vite development server configuration
    ├── tailwind.config.js       # Tailwind CSS theme setup (palette mapping)
    ├── package.json             # NPM dependencies & task configurations
    └── src/
        ├── main.jsx             # React application entry point
        ├── App.jsx              # Main layout grid & panel assembly
        ├── index.css            # Global stylesheets & canvas styles
        ├── context/
        │   └── BotContext.jsx   # State machine, WebSocket connector, alert processor
        ├── hooks/
        │   ├── useWebSocket.js  # Low-latency bi-directional WebSocket client hook
        │   ├── useDummyData.js  # Local simulator injecting periodic test streams
        │   └── useSessionLog.js # IndexedDB logger for saving alarm histories
        ├── utils/
        │   ├── alertEngine.js   # Multi-sensor fusion threshold checker
        │   ├── blobDetect.js    # 4-connectivity BFS thermal blob extractor
        │   └── thermalColorMap.js # Temperature to Inferno color lookup
        └── components/
            ├── StatusBar.jsx    # Battery bar, status tags, and packet rate
            ├── AlertBanner.jsx  # Pulsing visual warning banner
            ├── Co2Panel.jsx     # Scrolling line chart (Recharts)
            ├── ThermalPanel.jsx # HTML5 `<canvas>` heatmap + bounding box renderer
            ├── GpsPanel.jsx     # Leaflet.js live map tracker & NMEA parser
            ├── ControlPanel.jsx # D-pad and arrow/WASD key listener
            ├── ThresholdConfig.jsx # Parameter tuning with localStorage backup
            └── SessionLog.jsx   # Mission logs database viewer + CSV exporter
```

---

## 4. Frontend Implementation Details

### A. Context & State Management (`BotContext.jsx`)
Acts as the central communication hub. It checks the environment variable `VITE_BOT_IP` to determine whether to spin up the real WebSocket connector or launch the simulated data injector. It processes every incoming frame, evaluates the state against safety thresholds, updates statistics, triggers audible warnings, and saves records. It also scales raw 12-bit analog CO₂ sensor inputs (0–4095) from live hardware frames into estimated parts-per-million (ppm) using the linear mapping: `ppm = (rawValue / 4095) * 2000 + 400` to maintain downstream compatibility.

### B. Custom Hooks
1. **`useWebSocket.js`:**
   - Initiates a persistent client connection to `ws://<bot-ip>:81`.
   - Monitors incoming messages and computes the packet arrival rate.
   - Implements **exponential backoff** for auto-reconnection (starts at 1s, doubling up to a maximum of 30s) to withstand signal losses.
   - Provides an unthrottled `sendCommand` callback to transmit motor commands.
2. **`useDummyData.js`:**
   - Simulates telemetry streams at 10 Hz for testing.
   - Models CO₂ levels using mathematical sine waves + noise, battery drainage, orbital GPS walking, and a moving thermal heat source.
3. **`useSessionLog.js`:**
   - Wraps standard IndexedDB using the lightweight `idb` library.
   - Ensures logged events persist across page refreshes and browser crashes.

### C. Processing Utilities
1. **Thermal Color Mapping (`thermalColorMap.js`):**
   - Implements a segmented lookup algorithm mapping normalized values `[0.0, 1.0]` to the **Inferno palette** (gradient moving from Black → Deep Purple → Orange → Bright Yellow). 
   - This palette is chosen for its high contrast, linear luminance, and suitability for colorblind operators.
2. **Thermal Blob Detector (`blobDetect.js`):**
   - Automatically determines grid dimensions based on payload length (8x8 or 32x24).
   - Scans the matrix to locate pixels exceeding the configurable temperature limit.
   - Performs a **4-connectivity Breadth-First Search (BFS)** (flood fill) to isolate connected hot clusters.
   - Extracts the largest component, computes its bounding box (`minX`, `maxX`, `minY`, `maxY`), peak temperature, and area (in px).
3. **Fusion Alert Engine (`alertEngine.js`):**
   - Evaluates a composite condition: `CO₂ ppm > threshold AND Valid thermal blob found AND Peak temp > threshold`.
   - Pushes findings into a rolling frame buffer of size `hold_frames`.
   - Fires a true warning only if **all frames in the buffer are positive** (default 3 consecutive frames). This filtering structure prevents false positives caused by single-frame transmission spikes or stray electrical noise.

---

## 5. UI Components Breakdown

The dashboard is built on a responsive grid layout. The colors follow a custom, low-fatigue military aesthetic configured in `tailwind.config.js` (`#fefae0` background, `#4a5d23` forest text, `#ccd5ae` active markers).

* **`StatusBar.jsx`:** Shows connection tags (`simulated` / `connecting` / `connected`), packet throughput (e.g., `10 pkt/s`), and converts raw millivolts (`battery_mv`) into a dynamic battery status bar with safety warnings under `3.4V`.
* **`AlertBanner.jsx`:** A pulsing danger-alert box that slides in whenever human life indicators are verified. Includes a manual dismiss button.
* **`Co2Panel.jsx`:** Integrates `Recharts` to draw a scrolling line chart representing the last 60 data frames. Renders a red threshold reference line to clearly display when gas concentration exceeds bounds.
* **`ThermalPanel.jsx`:**
  - Uses an HTML5 `<canvas>` rendering at 320x320px.
  - Upscales raw sensor matrices (8x8 or 32x24) using a smooth **2D Bilinear Interpolation** algorithm to eliminate blockiness and create smooth heat gradients.
  - Renders temperatures using the standard **Jet colormap** sequence (blue → cyan → green → yellow → red).
  - Pairs with a sleek HTML **vertical color scale bar** directly on the right side of the canvas showing min to max temperatures.
  - Performs **dynamic min/max auto-scaling** on each frame to map temperatures to color ranges, displaying the live detected minimum and maximum temperatures.
  - Uses a React `useRef` rendering loop running inside `requestAnimationFrame` to paint canvas updates directly, avoiding performance bottlenecks.
  - Superimposes a dashed bounding box around the active target area by scaling raw detection grid points into canvas coordinates.
* **`GpsPanel.jsx`:** Parses NMEA GNGGA string sentences manually to extract latitude, longitude, satellite count, and fix status in real time. It embeds a live Leaflet.js map with OpenStreetMap tiles that centers on the bot's coordinates and updates its marker dynamically, with a fallback radar reticle displayed when waiting for a 3D signal lock.
* **`ControlPanel.jsx`:**
  - Features a multi-directional D-pad optimized for touch controls.
  - Listens globally to Keyboard inputs (WASD and Arrow keys).
  - Uses pointer events (`onPointerDown` / `onPointerUp`) to track presses.
  - **Zero Input Latency:** Direction commands are issued instantly without throttling for highly responsive maneuvering.
  - **Safety Release:** Releasing a key or lifting a touch finger instantly triggers a `stop` packet to prevent runaway states.
  - Integrates a speed adjustment slider mapping values to motor PWM inputs (`100` to `255`).
  - Displays a latency counter measuring the time elapsed since the last transmission.
* **`ThresholdConfig.jsx`:** Simple inputs for tuning settings (CO₂ limit, target peak temp, minimum size, hold duration). All modifications are updated immediately and saved directly to `localStorage`.
* **`SessionLog.jsx`:** Displays active logs in a clean table format. Features a tool to compile and export the history into a standard `.csv` file.

---

## 6. Verification & Deployment

### Local Testing (Simulator Mode)
If no environment variable is provided, the dashboard launches in simulation mode automatically:
```bash
cd rescue-bot-dashboard
npm install
npm run dev
```
Open `http://localhost:5173` to test all dashboard telemetry components using simulated inputs.

### Physical Bot Integration (Live Mode)
1. Flash the ESP32 code and check the serial monitor at `115200` baud rate to locate its IP (e.g., `192.168.4.1`).
2. Add a `.env` configuration file in the project's root folder:
   ```env
   VITE_BOT_IP=192.168.4.1
   ```
3. Restart the server:
   ```bash
   npm run dev
   ```
4. Verify connection status changes to **CONNECTED** in the dashboard.
