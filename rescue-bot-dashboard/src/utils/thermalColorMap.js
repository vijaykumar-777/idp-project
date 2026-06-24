/**
 * Maps a normalized temperature value [0, 1] to an RGB color using an Inferno-like palette.
 * Inferno is a perceptually uniform colormap ranging from black -> purple -> red -> yellow.
 * 
 * @param {number} t Normalized temperature (0 to 1)
 * @returns {number[]} [R, G, B, A]
 */
export function getInfernoColor(t) {
  t = Math.max(0, Math.min(1, t)); // clamp

  // A simplified Inferno approximation
  // Break into segments for interpolation
  let r = 0, g = 0, b = 0;

  if (t < 0.2) {
    // Black to Deep Purple
    const frac = t / 0.2;
    r = Math.floor(66 * frac);
    g = Math.floor(10 * frac);
    b = Math.floor(104 * frac);
  } else if (t < 0.5) {
    // Deep Purple to Red/Orange
    const frac = (t - 0.2) / 0.3;
    r = Math.floor(66 + (221 - 66) * frac);
    g = Math.floor(10 + (81 - 10) * frac);
    b = Math.floor(104 + (58 - 104) * frac);
  } else if (t < 0.8) {
    // Red/Orange to Orange/Yellow
    const frac = (t - 0.5) / 0.3;
    r = Math.floor(221 + (252 - 221) * frac);
    g = Math.floor(81 + (166 - 81) * frac);
    b = Math.floor(58 + (54 - 58) * frac);
  } else {
    // Orange/Yellow to Light Yellow
    const frac = (t - 0.8) / 0.2;
    r = Math.floor(252 + (252 - 252) * frac);
    g = Math.floor(166 + (255 - 166) * frac);
    b = Math.floor(54 + (164 - 54) * frac);
  }

  return [r, g, b, 255];
}
