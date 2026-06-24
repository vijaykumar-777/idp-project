# RESCUE BOT DASHBOARD — PROJECT JOURNAL

> **Purpose:** This document is a complete handoff brief for any agent, developer, or LLM tasked with implementing the Rescue Bot Monitoring & Control Dashboard. It contains the full system specification, hardware context, frontend architecture, detection logic, control protocol, phased roadmap, and implementation notes. Read this before writing a single line of code.

---

## 1. PROJECT OVERVIEW

### What this project is

An autonomous rubble-crawling rescue robot (caterpillar-tracked, palm-sized) that navigates under collapsed structures to detect unconscious survivors. Detection is based on **CO₂ concentration pockets** (exhaled breath accumulates near an unconscious person) combined with **thermal imaging** (body heat signature). The operator monitors the bot remotely via a **web dashboard** and also **controls the bot's movement** from the same interface using arrow keys or a D-pad UI.

### Core hypothesis

An unconscious person lying in a rubble pocket will:

1. Exhale CO₂, creating a local concentration spike above ambient (~400 ppm) — target detection range: 800–1500+ ppm
2. Emit body heat detectable as a thermal blob in the 34–37 °C range

Both signals must be present simultaneously to trigger an alert (sensor fusion). Single-sensor triggers are treated as noise.

### Operator workflow

1. Deploy bot into rubble via remote start
2. Watch live dashboard: CO₂ chart + thermal heatmap + telemetry
3. Control bot movement using arrow keys / D-pad on the same dashboard
4. When dashboard fires an alert (banner + audio), mark the location and relay to rescue team

---

## 2. HARDWARE INVENTORY

| Component                         | Status   | Notes                                                              |
| --------------------------------- | -------- | ------------------------------------------------------------------ |
| Chassis with caterpillar tracks   | **Have** | Suitable for rubble navigation                                     |
| Lower modules (motor driver etc.) | **Have** | Assumed L298N or similar PWM-capable driver                        |
| ESP32 microcontroller             | **Have** | Wi-Fi + BLE capable; runs WebSocket server                         |
| Battery                           | **Have** | Voltage/capacity unspecified; ensure 5V regulated output for ESP32 |
| Thermal camera                    | **Have** | Module TBD — see section 3                                         |

### Components still needed

**CO₂ sensor** (critical — not yet acquired):

- **MQ-135** — analog output, ~₹200, not calibrated in ppm but usable with lookup table. Good for proof-of-concept "dense vs sparse" detection.
- **SCD40** — I²C, true ppm readings, ~₹1800. Recommended for accurate threshold logic.

**Thermal camera module** (confirm interface compatibility with ESP32):

- **MLX90640** — 32×24 pixel array, I²C, ~₹1800. Best resolution for this use case.
- **AMG8833** — 8×8 pixel array, I²C, ~₹900. Cheaper, lower resolution, still usable.

**Motor driver** (if not already present):

- L298N is standard for dual caterpillar tracks. PWM-capable, 5–35V input.

---

## 3. SYSTEM ARCHITECTURE

### Data flow (sensor → dashboard)

```
[CO₂ sensor] ──I²C/ADC──┐
[Thermal camera] ──I²C───┤──► [ESP32] ──WebSocket (port 81)──► [Browser Dashboard]
[IMU, optional] ──I²C────┘         ▲
                                    │
                          [Browser sends movement commands]
```

The ESP32 acts as both a **WebSocket server** (pushing sensor data) and a **WebSocket message handler** (receiving movement commands). A single persistent WebSocket connection handles both directions.

### JSON payload — ESP32 → Browser (sensor data, ~10 Hz)

```json
{
  "co2_ppm": 1240,
  "thermal": [
    [28.1, 29.3, 30.0, 29.8, 28.5, 27.9, 28.2, 29.0],
    [29.5, 31.2, 33.8, 35.1, 34.9, 33.2, 30.1, 29.4],
    ["...6 more rows for AMG8833 (8x8)"]
  ],
  "timestamp": 1718123456789,
  "battery_mv": 3820
}
```

For MLX90640 (32×24), the `thermal` field is a flat array of 768 floats instead of a 2D array.

### JSON payload — Browser → ESP32 (movement commands)

```json
{ "cmd": "move", "dir": "forward", "speed": 180 }
```

`dir` values: `"forward"` | `"backward"` | `"left"` | `"right"` | `"stop"`  
`speed`: integer 0–255 (PWM value for motor driver)

### Safety stop rule (implement on ESP32 firmware)

If no valid `move` command is received within **500 ms**, the ESP32 must automatically set all motor PWM to 0. This prevents a runaway bot if the Wi-Fi connection drops mid-operation.

---

## 4. ESP32 FIRMWARE SPECIFICATION

### Responsibilities

1. Read CO₂ sensor at ~10 Hz and produce a ppm value
2. Read thermal camera at ~10 Hz and produce a pixel temperature array
3. Broadcast JSON sensor payload to all connected WebSocket clients
4. Parse incoming JSON messages and drive motor driver pins via PWM
5. Enforce 500 ms safety stop watchdog

### Firmware structure (Arduino/PlatformIO)

```cpp
// Libraries needed:
// - ESPAsyncWebServer + AsyncTCP (WebSocket server)
// - ArduinoJson (JSON serialization/deserialization)
// - Adafruit_MLX90640 or Adafruit_AMG88xx (thermal camera)
// - Wire (I²C for SCD40 or thermal cam)

// Pins (adjust to your wiring):
#define MOTOR_LEFT_PWM   25
#define MOTOR_LEFT_DIR   26
#define MOTOR_RIGHT_PWM  27
#define MOTOR_RIGHT_DIR  14

// WebSocket server on port 81
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

void setup() {
  WiFi.begin(SSID, PASSWORD);
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.begin();
  // init sensors
}

void loop() {
  // read sensors
  // build JSON
  // ws.textAll(jsonString)  -- broadcast to all clients
  // check safety watchdog
}

void onWsEvent(AsyncWebSocket* s, AsyncWebSocketClient* c,
               AwsEventType t, void* arg, uint8_t* data, size_t len) {
  if (t == WS_EVT_DATA) {
    // parse JSON command
    // set motor PWM based on dir + speed
    // reset watchdog timer
  }
}

void setMotors(String dir, int speed) {
  if (dir == "forward")  { /* both motors forward */ }
  if (dir == "backward") { /* both motors backward */ }
  if (dir == "left")     { /* left motor backward, right forward */ }
  if (dir == "right")    { /* left motor forward, right backward */ }
  if (dir == "stop")     { /* all PWM = 0 */ }
}
```

### PlatformIO dependencies (`platformio.ini`)

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps =
  me-no-dev/AsyncTCP
  me-no-dev/ESPAsyncWebServer
  bblanchon/ArduinoJson
  adafruit/Adafruit AMG88xx Library   ; or MLX90640 equivalent
  adafruit/Adafruit BusIO
monitor_speed = 115200
```

---

## 5. FRONTEND SPECIFICATION

### Tech stack

| Layer            | Choice                             | Reason                                                |
| ---------------- | ---------------------------------- | ----------------------------------------------------- |
| Framework        | React 18 + Vite                    | Component model suits multi-panel dashboard; fast HMR |
| Styling          | Tailwind CSS v3                    | Rapid layout, built-in dark mode                      |
| WebSocket        | Native browser `WebSocket` API     | No library needed                                     |
| Thermal heatmap  | HTML5 `<canvas>`                   | Custom bilinear interpolation + color mapping         |
| CO₂ chart        | Recharts                           | Scrolling time-series, React-native                   |
| Alerts           | Web Audio API + React state banner | In-browser audio, zero dependencies                   |
| Persistence      | IndexedDB via `idb` npm package    | Session logs survive page refresh                     |
| CSV export       | Native `Blob` + anchor download    | No library needed                                     |
| State management | React Context + useReducer         | Lightweight, no Redux needed                          |

### Project scaffold

```
rescue-bot-dashboard/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── hooks/
│   │   ├── useWebSocket.js       ← bidirectional WS hook
│   │   └── useSessionLog.js      ← IndexedDB read/write
│   ├── components/
│   │   ├── StatusBar.jsx         ← connection status, packet rate, battery
│   │   ├── Co2Panel.jsx          ← live ppm + rolling chart
│   │   ├── ThermalPanel.jsx      ← canvas heatmap + blob overlay
│   │   ├── AlertBanner.jsx       ← full-width alert + audio
│   │   ├── ThresholdConfig.jsx   ← configurable limits, saved to localStorage
│   │   ├── ControlPanel.jsx      ← D-pad UI + speed slider + keyboard handler
│   │   └── SessionLog.jsx        ← alert history table + CSV export
│   ├── utils/
│   │   ├── thermalColorMap.js    ← Inferno palette lookup
│   │   ├── blobDetect.js         ← pixel thresholding + bounding box
│   │   └── alertEngine.js        ← sensor fusion logic
│   └── context/
│       └── BotContext.jsx        ← shared state: sensor data, thresholds, alerts
```

### `useWebSocket` hook specification

```javascript
// src/hooks/useWebSocket.js
// Returns: { sensorData, wsStatus, sendCommand, packetRate }

// Behavior:
// - Connects to ws://<botIp>:81/ws on mount
// - On message: parses JSON, updates sensorData in context
// - On close/error: schedules reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
// - sendCommand(dir, speed): sends { cmd:"move", dir, speed } as JSON string
// - Tracks packet timestamps to compute packetRate (packets/sec)
// - wsStatus: "connecting" | "connected" | "disconnected"
```

### Dashboard layout (responsive grid)

```
┌─────────────────────────────────────────────────────────┐
│  STATUS BAR  │  WS: connected  │  12 pkt/s  │  3.8V    │
├──────────────────────────┬──────────────────────────────┤
│  CO₂ PANEL               │  THERMAL HEATMAP             │
│  1240 ppm  [ALERT]       │  [canvas 300×200]            │
│  [time-series chart]     │  Peak: 36.2°C  Blob: 6px    │
├──────────────────────────┼──────────────────────────────┤
│  THRESHOLD CONFIG        │  BOT CONTROL                 │
│  CO₂ limit: [1000] ppm   │      [▲]                     │
│  Temp limit: [34] °C     │  [◄] [■] [►]                 │
│  Blob area:  [4] px      │      [▼]                     │
│  Hold time:  [3] frames  │  Speed: [●───] Medium        │
├──────────────────────────┴──────────────────────────────┤
│  SESSION LOG  │  12:34:05 │ 1240ppm │ 36.2°C │ [ALERT] │
│               │  [Export CSV]                           │
└─────────────────────────────────────────────────────────┘
```

On mobile (< 768px), panels stack vertically. Control panel is touch-optimized (48px minimum button size).

---

## 6. COMPONENT SPECIFICATIONS

### 6.1 ThermalPanel — Canvas Heatmap

```javascript
// Props: pixelArray (flat float[] of length 64 or 768), threshold (°C), minBlobArea (px)
// Canvas renders at 300×200px (CSS), internal resolution 8×8 or 32×24

// Algorithm:
// 1. Bilinear interpolation: upscale raw grid to canvas resolution
// 2. For each output pixel, map temperature to color via Inferno palette
// 3. Run blob detection (see blobDetect.js)
// 4. Draw bounding box on canvas if blob detected

// Inferno palette (perceptually uniform, colorblind-accessible):
// Low temp → deep purple (#0d0887)
// Mid temp → orange (#f0f921 at hot end)
// Map: t_normalized = (t - t_min) / (t_max - t_min), clamp [0,1]
```

### 6.2 blobDetect.js

```javascript
// Input: pixelArray[], threshold (°C), minArea (number of pixels)
// Output: { detected: bool, boundingBox: {x, y, w, h}, peakTemp, blobArea }

// Algorithm:
// 1. Threshold: mark pixels where temp > threshold as "hot"
// 2. Find connected components (4-connectivity flood fill)
// 3. Return largest component; if area >= minArea, detected = true
// 4. boundingBox is in raw pixel coords (scale to canvas for drawing)
```

### 6.3 alertEngine.js

```javascript
// Input: co2_ppm, blobDetected, blobPeakTemp, thresholds, frameBuffer[]
// Output: { alert: bool, reason: string }

// Detection condition (ALL must be true for >= holdFrames consecutive frames):
//   co2_ppm > thresholds.co2
//   blobDetected === true
//   blobPeakTemp > thresholds.temp

// holdFrames default: 3 (prevents single-frame false positives from sensor noise)

// When alert fires:
// - Web Audio API: oscillator at 880Hz, 0.3s beep, repeated 3 times
// - AlertBanner shows: "⚠ Possible unconscious person detected — check thermal panel"
// - Log entry written to IndexedDB
```

### 6.4 ControlPanel — Keyboard + D-Pad

```javascript
// Keyboard handler (attach to window on mount, remove on unmount):
// keydown → sendCommand(dir, speed)   [immediate, no throttle]
// keyup   → sendCommand("stop", 0)    [immediate, unthrottled — safety critical]

// Key mappings:
// ArrowUp / W  → "forward"
// ArrowDown / S → "backward"
// ArrowLeft / A → "left"
// ArrowRight / D → "right"

// D-pad buttons: onPointerDown → sendCommand, onPointerUp → stop
// Use onPointerDown/Up (not onClick) so touch hold works correctly

// Speed slider: Low=100, Medium=180, High=255 (maps to PWM)
// Disable all controls when wsStatus !== "connected"

// Command echo: show last sent command + elapsed time since sent
```

### 6.5 ThresholdConfig

```javascript
// Fields (all saved to localStorage key "rescuebot_thresholds"):
const defaultThresholds = {
  co2_ppm: 1000, // Alert above this CO₂ level
  temp_celsius: 34.0, // Alert when thermal blob exceeds this
  min_blob_area: 4, // Minimum pixel count to count as a blob (raw grid pixels)
  hold_frames: 3, // Consecutive frames all conditions must hold
};

// UI: labeled number inputs with min/max validation + a "Reset to defaults" button
// Changes take effect immediately (no save button needed)
```

---

## 7. DETECTION LOGIC — COMPLETE ALGORITHM

```
Every sensor frame received from ESP32:

1. Parse { co2_ppm, thermal[], timestamp }

2. Run blobDetect(thermal, thresholds.temp_celsius, thresholds.min_blob_area)
   → { detected, peakTemp, blobArea, boundingBox }

3. Evaluate alert conditions:
   condMet = (co2_ppm > thresholds.co2_ppm)
          && (detected === true)
          && (peakTemp > thresholds.temp_celsius)

4. Push condMet into a rolling frameBuffer (length = thresholds.hold_frames)

5. If ALL entries in frameBuffer are true:
   → Fire alert (banner + audio + log entry)
   → Clear frameBuffer (prevent re-trigger until conditions reset and re-meet)

6. Update UI: CO₂ chart, thermal canvas, status bar
```

This ensures a single sensor spike (electrical noise, passing warm object) does not trigger a false alarm.

---

## 8. PHASED ROADMAP

### Phase 1 — ESP32 firmware (Week 1)

- [ ] Read CO₂ sensor (MQ-135 via ADC or SCD40 via I²C), output ppm value
- [ ] Read thermal camera (AMG8833 or MLX90640) via I²C, output pixel array
- [ ] Stand up AsyncWebSocket server on port 81
- [ ] Broadcast JSON sensor payload at 10 Hz to all connected clients
- [ ] Parse incoming JSON movement commands, drive L298N motor driver via PWM
- [ ] Implement 500 ms safety stop watchdog
- [ ] Test stream end-to-end with `wscat -c ws://192.168.x.x:81/ws` before frontend work

### Phase 2 — Dashboard shell + WebSocket hook (Week 1–2)

- [ ] Vite + React + Tailwind scaffold (`npm create vite@latest rescue-bot -- --template react`)
- [ ] Install: `npm i recharts idb tailwindcss @tailwindcss/forms`
- [ ] Implement `useWebSocket` hook: connect, receive, send, auto-reconnect with backoff
- [ ] Build `BotContext` for shared state (sensorData, thresholds, alerts, wsStatus)
- [ ] Build `StatusBar` component (WS status, packet rate, battery voltage)
- [ ] Create dummy data injector (`useDummyData` flag) so UI development doesn't require the bot

### Phase 3 — Thermal heatmap renderer (Week 2)

- [ ] `ThermalPanel` canvas component with bilinear upscaling
- [ ] Inferno/Turbo color palette implementation (`thermalColorMap.js`)
- [ ] `blobDetect.js`: threshold → connected components → bounding box
- [ ] Draw bounding box overlay on canvas
- [ ] Display peak temperature and blob pixel count below canvas

### Phase 4 — CO₂ chart + alert engine + threshold config (Week 2–3)

- [ ] Rolling time-series chart with Recharts (60-second window, 3 color zones)
- [ ] `alertEngine.js`: sensor fusion with hold-frame buffer
- [ ] `AlertBanner` component: full-width red bar, dismissible, Web Audio API beep
- [ ] `ThresholdConfig` panel: all 4 configurable parameters, localStorage persistence
- [ ] Wire alert engine into frame processing loop in `BotContext`

### Phase 5 — Bot control panel (Week 3) ← NEW

- [ ] `ControlPanel` D-pad UI: 4 directional buttons + centre stop, 48px touch targets
- [ ] Keyboard event listener: arrow keys + WASD, keydown→move, keyup→stop
- [ ] Speed slider with Low/Medium/High presets (PWM 100/180/255)
- [ ] Command echo: last sent command + ms elapsed
- [ ] Disable all controls when WebSocket is disconnected
- [ ] Optional: Gamepad API support (`navigator.getGamepads()`) for USB/BT controllers

### Phase 6 — Session logging, export, hardening (Week 3–4)

- [ ] `useSessionLog` hook: IndexedDB write on every alert event
- [ ] `SessionLog` table component: timestamp, CO₂ ppm, peak temp, blob area per event
- [ ] CSV export: `Blob` + `<a download="session.csv">` pattern
- [ ] Auto-reconnect WebSocket: exponential backoff (1s → 2s → 4s → ... → 30s max)
- [ ] Packet loss indicator: warn if gap between frames > 2 s
- [ ] Mobile-responsive layout: test on 390px viewport (iPhone) and 768px (tablet)
- [ ] Optional: PWA manifest + service worker for installable offline-capable app

---

## 9. KEY IMPLEMENTATION NOTES FOR AGENTS

### WebSocket bidirectionality

The same `WebSocket` object handles both directions. Do not open two separate connections. The ESP32 `ws.onEvent` handler fires for both `WS_EVT_DATA` (incoming commands) and handles the outgoing broadcast in the main `loop()`.

### Control panel latency

Do NOT debounce or throttle keydown events for movement commands. Even 50 ms of throttling makes the bot feel laggy. Only the stop command (keyup) needs to be guaranteed immediate — it is safety-critical.

### Thermal canvas — do not use React re-renders

The thermal canvas must be updated via direct `canvas.getContext('2d')` calls inside a `useEffect` / `useRef` — not by re-rendering a React component. React re-renders at 60 fps would cause jank. Use `requestAnimationFrame` to draw.

### Blob detection grid coordinates

The blob detection operates on the **raw sensor grid** (8×8 or 32×24). The bounding box returned is in raw grid coordinates. Scale these to canvas CSS pixels before drawing:

```javascript
const scaleX = canvasWidth / gridCols; // e.g., 300 / 8 = 37.5
const scaleY = canvasHeight / gridRows; // e.g., 200 / 8 = 25
```

### localStorage vs IndexedDB

- **Thresholds** → `localStorage` (small, synchronous, fine for config)
- **Session log entries** → `IndexedDB` via `idb` (async, handles large event histories)

### ESP32 Wi-Fi discovery

The browser needs to know the ESP32's IP. Options (simplest first):

1. Hardcode in `vite.config.js` as a `.env` variable (`VITE_BOT_IP=192.168.1.42`)
2. mDNS: configure ESP32 as `rescuebot.local`, connect to `ws://rescuebot.local:81/ws`
3. QR code on bot: scan to open dashboard with IP pre-filled in URL param

### CORS / mixed content

If the dashboard is served over HTTPS (e.g., deployed to Vercel), browsers will block `ws://` (plain WebSocket). For field use, serve the dashboard locally over HTTP or use `wss://` with a self-signed cert on the ESP32.

---

## 10. ENVIRONMENT SETUP COMMANDS

```bash
# Scaffold frontend
npm create vite@latest rescue-bot-dashboard -- --template react
cd rescue-bot-dashboard
npm install recharts idb

# Tailwind setup
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Dev server (connects to bot at local IP)
VITE_BOT_IP=192.168.1.42 npm run dev

# Build for production (deploy to any static host or serve locally)
npm run build
npx serve dist
```

```bash
# PlatformIO ESP32 firmware
pip install platformio
pio project init --board esp32dev
# Add lib_deps to platformio.ini (see Section 4)
pio run --target upload
pio device monitor
```

---

## 11. OPEN QUESTIONS (resolve before Phase 1)

1. **Which CO₂ sensor?** MQ-135 (cheap, uncalibrated) or SCD40 (accurate ppm)? This affects threshold config defaults significantly.
2. **Which thermal camera?** AMG8833 (8×8) or MLX90640 (32×24)? Affects blob detection resolution and JSON payload size.
3. **Motor driver model?** Confirm L298N or equivalent — firmware PWM pin mapping depends on this.
4. **What is the ESP32's network mode?** Does it join an existing Wi-Fi network (station mode) or create its own hotspot (AP mode)? AP mode is simpler for field deployment (no router needed).
5. **Single operator or multi-operator?** If multiple team members need to see the dashboard simultaneously, a lightweight FastAPI + SQLite relay server is needed. For single operator, browser-direct WebSocket to ESP32 is sufficient.

---

## 12. FUTURE EXTENSIONS (out of scope for v1)

- **Map overlay:** Log GPS/IMU coordinates of each alert and plot on a site floorplan image
- **Multi-bot:** WebSocket relay server to aggregate feeds from multiple bots
- **Audio detection:** Add acoustic sensor (microphone) to detect tapping/voice from survivors
- **Recorded playback:** Save full sensor streams to IndexedDB, replay any session
- **Computer vision:** Run TensorFlow.js on the thermal stream for automated human silhouette detection

---

_Document generated from design session. Last updated: June 2026. Author: Vijaykumar (RVCE, CSE 7th Semester). Project: Search-and-Rescue Autonomous Bot — Experiential Learning._
