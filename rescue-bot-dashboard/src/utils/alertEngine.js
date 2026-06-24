/**
 * Evaluates sensor data against thresholds to determine if an alert should be fired.
 * Uses a rolling buffer to require multiple consecutive positive frames.
 * 
 * @param {number} co2_ppm Current CO2 level
 * @param {boolean} blobDetected Is a valid thermal blob detected?
 * @param {number} blobPeakTemp Peak temperature of the detected blob
 * @param {object} thresholds { co2_ppm, temp_celsius, hold_frames }
 * @param {boolean[]} frameBuffer The rolling buffer array of boolean states
 * @returns {object} { alert: boolean, newBuffer: boolean[] }
 */
export function evaluateAlert(co2_ppm, blobDetected, blobPeakTemp, thresholds, frameBuffer) {
  // 1. Evaluate current frame condition
  const condMet = (
    co2_ppm > thresholds.co2_ppm &&
    blobDetected === true &&
    blobPeakTemp > thresholds.temp_celsius
  );

  // 2. Push to rolling buffer
  const newBuffer = [...frameBuffer, condMet];
  if (newBuffer.length > thresholds.hold_frames) {
    newBuffer.shift(); // keep it to size
  }

  // 3. Fire alert if ALL entries in the buffer are true and buffer is full
  const alert = newBuffer.length === thresholds.hold_frames && newBuffer.every(val => val === true);

  // If alert fired, we should probably clear the buffer so it doesn't fire continuously every frame,
  // but we can let the context handle clearing it.
  
  return { alert, newBuffer };
}
