# Hardware Integration Steps

Follow these steps once you have completed your hardware assembly and wiring to connect the ESP32 to the React frontend dashboard.

## 1. Prepare the ESP32 Firmware
Before connecting to the frontend, ensure your ESP32 is correctly programmed to act as a WebSocket server.
- The ESP32 must connect to the **same Wi-Fi network** as your computer, OR it must create its own Access Point (Hotspot) that your computer connects to.
- Ensure the ESP32 is running an `AsyncWebSocket` server on **port 81**.
- The ESP32 should broadcast sensor data as a JSON string at roughly 10Hz in this exact format:
  ```json
  {
    "co2_ppm": 1240,
    "thermal": [28.1, 29.3, ...], 
    "timestamp": 1718123456789,
    "battery_mv": 3820
  }
  ```
- *Note: The `thermal` array should be a flat list of floats (length 64 for AMG8833, or 768 for MLX90640).*

## 2. Find the ESP32 IP Address
You need to know the IP address assigned to your ESP32.
- If using Arduino IDE or PlatformIO, open the Serial Monitor (baud rate `115200`).
- Reset the ESP32.
- The firmware should print its assigned IP address upon successful Wi-Fi connection (e.g., `192.168.1.42`).

## 3. Configure the Frontend Environment
The frontend uses a dummy simulator by default if no IP is provided. You must provide the ESP32's IP address using an environment variable.

1. Open your terminal and navigate to the frontend folder:
   ```bash
   cd rescue-bot-dashboard
   ```
2. Create a new file named `.env` in this directory.
3. Add the following line to the `.env` file, replacing the IP with your actual ESP32 IP:
   ```env
   VITE_BOT_IP=192.168.1.42
   ```

## 4. Launch the Dashboard
With the `.env` file in place, restart the development server so Vite can load the new environment variable.

1. Stop the currently running server in your terminal by pressing `Ctrl+C`.
2. Start the server again:
   ```bash
   npm run dev
   ```
3. Open your browser and go to the local URL provided (usually `http://localhost:5173`).

## 5. Verify the Connection
Look at the **Status Bar** at the top left of the dashboard.
- If successful, it should say **CONNECTED** in green text next to a Wi-Fi icon.
- You should immediately start seeing the CO₂ graph updating and the Thermal Heatmap reacting to the physical camera.
- Try pressing the arrow keys on your keyboard; the "Command Echo" on the Bot Control panel should update, and the ESP32 Serial Monitor should show incoming `{"cmd": "move", "dir": "forward", "speed": 180}` messages.

## Troubleshooting
- **Status stays "DISCONNECTED"**: Ensure your computer and ESP32 are on the exact same Wi-Fi network. Check the Serial Monitor to ensure the ESP32 hasn't crashed.
- **Canvas is black/graph is flat**: Open the browser's Developer Tools (F12) -> Console. Look for JSON parsing errors. Ensure your ESP32 is formatting the JSON payload correctly with double quotes around keys.
- **Controls feel laggy**: Make sure you aren't adding delays (`delay()`) inside the ESP32's main `loop()` which would block the WebSocket receiver.
