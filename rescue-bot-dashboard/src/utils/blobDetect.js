/**
 * Detects the largest connected component (blob) of pixels above a certain temperature.
 * 
 * @param {number[]} pixelArray Flat array of temperature values
 * @param {number} threshold Temperature threshold in Celsius
 * @param {number} minArea Minimum number of pixels to be considered a blob
 * @returns {object} { detected, boundingBox, peakTemp, blobArea }
 */
export function blobDetect(pixelArray, threshold, minArea) {
  const len = pixelArray.length;
  // Determine dimensions (assume 8x8 or 32x24)
  const cols = len === 768 ? 32 : 8;
  const rows = len === 768 ? 24 : 8;

  const visited = new Array(len).fill(false);
  let maxBlob = { area: 0, peakTemp: 0, minX: cols, maxX: 0, minY: rows, maxY: 0 };

  for (let i = 0; i < len; i++) {
    if (pixelArray[i] > threshold && !visited[i]) {
      const blob = bfs(i, pixelArray, threshold, visited, cols, rows);
      if (blob.area > maxBlob.area) {
        maxBlob = blob;
      }
    }
  }

  const detected = maxBlob.area >= minArea;

  return {
    detected,
    peakTemp: maxBlob.peakTemp,
    blobArea: maxBlob.area,
    boundingBox: detected ? {
      x: maxBlob.minX,
      y: maxBlob.minY,
      w: maxBlob.maxX - maxBlob.minX + 1,
      h: maxBlob.maxY - maxBlob.minY + 1
    } : null
  };
}

function bfs(startIndex, pixelArray, threshold, visited, cols, rows) {
  const queue = [startIndex];
  visited[startIndex] = true;

  let area = 0;
  let peakTemp = pixelArray[startIndex];
  let minX = cols, maxX = 0, minY = rows, maxY = 0;

  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // up, down, left, right
  ];

  while (queue.length > 0) {
    const idx = queue.shift();
    area++;
    const temp = pixelArray[idx];
    if (temp > peakTemp) peakTemp = temp;

    const x = idx % cols;
    const y = Math.floor(idx / cols);

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const nIdx = ny * cols + nx;
        if (!visited[nIdx] && pixelArray[nIdx] > threshold) {
          visited[nIdx] = true;
          queue.push(nIdx);
        }
      }
    }
  }

  return { area, peakTemp, minX, maxX, minY, maxY };
}
