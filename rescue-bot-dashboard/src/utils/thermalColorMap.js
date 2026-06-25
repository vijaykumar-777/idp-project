/**
 * Maps a normalized temperature value [0, 1] to an RGB color using the standard Ironbow thermal camera palette.
 * Sequence: dark navy blue -> purple -> magenta/red -> orange -> yellow -> white.
 * 
 * @param {number} t Normalized temperature (0 to 1)
 * @returns {number[]} [R, G, B, A]
 */
export function getIronbowColor(t) {
  t = Math.max(0, Math.min(1, t)); // clamp

  let r = 0, g = 0, b = 0;

  if (t < 0.2) {
    // Dark Navy Blue [0, 0, 80] to Purple [100, 0, 150]
    const frac = t / 0.2;
    r = Math.floor(0 + 100 * frac);
    g = 0;
    b = Math.floor(80 + 70 * frac);
  } else if (t < 0.45) {
    // Purple [100, 0, 150] to Magenta/Red [220, 0, 80]
    const frac = (t - 0.2) / 0.25;
    r = Math.floor(100 + 120 * frac);
    g = 0;
    b = Math.floor(150 - 70 * frac);
  } else if (t < 0.75) {
    // Magenta/Red [220, 0, 80] to Orange [255, 120, 0]
    const frac = (t - 0.45) / 0.3;
    r = Math.floor(220 + 35 * frac);
    g = Math.floor(0 + 120 * frac);
    b = Math.floor(80 - 80 * frac);
  } else if (t < 0.92) {
    // Orange [255, 120, 0] to Yellow [255, 230, 100]
    const frac = (t - 0.75) / 0.17;
    r = 255;
    g = Math.floor(120 + 110 * frac);
    b = Math.floor(0 + 100 * frac);
  } else {
    // Yellow [255, 230, 100] to White [255, 255, 255]
    const frac = (t - 0.92) / 0.08;
    r = 255;
    g = Math.floor(230 + 25 * frac);
    b = Math.floor(100 + 155 * frac);
  }

  return [r, g, b, 255];
}

/**
 * Maps a normalized temperature value [0, 1] to an RGB color using the standard Jet/Rainbow thermal camera palette.
 * Sequence: deep blue (0.0) -> cyan (0.25) -> green (0.5) -> yellow (0.75) -> red (1.0).
 * 
 * @param {number} t Normalized temperature (0 to 1)
 * @returns {number[]} [R, G, B, A]
 */
export function getRainbowColor(t) {
  t = Math.max(0, Math.min(1, t)); // clamp

  let r = 0, g = 0, b = 0;

  if (t < 0.25) {
    // Deep Blue [0, 0, 140] to Cyan [0, 255, 255]
    const frac = t / 0.25;
    r = 0;
    g = Math.floor(255 * frac);
    b = Math.floor(140 + 115 * frac);
  } else if (t < 0.5) {
    // Cyan [0, 255, 255] to Green [0, 255, 0]
    const frac = (t - 0.25) / 0.25;
    r = 0;
    g = 255;
    b = Math.floor(255 * (1 - frac));
  } else if (t < 0.75) {
    // Green [0, 255, 0] to Yellow [255, 255, 0]
    const frac = (t - 0.5) / 0.25;
    r = Math.floor(255 * frac);
    g = 255;
    b = 0;
  } else {
    // Yellow [255, 255, 0] to Red [255, 0, 0]
    const frac = (t - 0.75) / 0.25;
    r = 255;
    g = Math.floor(255 * (1 - frac));
    b = 0;
  }

  return [r, g, b, 255];
}

