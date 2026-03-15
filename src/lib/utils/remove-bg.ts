import sharp from "sharp";

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function getPixel(
  data: Buffer,
  x: number,
  y: number,
  width: number,
  channels: number
): RGBA {
  const idx = (y * width + x) * channels;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: channels >= 4 ? data[idx + 3] : 255,
  };
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Sample border pixels to determine the background color.
 * Samples corners + edge midpoints for better accuracy.
 */
function detectBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): RGBA | null {
  const samplePoints: [number, number][] = [
    // Corners
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    // Edge midpoints
    [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
    // Quarter points on edges
    [Math.floor(width / 4), 0], [Math.floor(width * 3 / 4), 0],
    [Math.floor(width / 4), height - 1], [Math.floor(width * 3 / 4), height - 1],
  ];

  const samples = samplePoints.map(([x, y]) => getPixel(data, x, y, width, channels));

  // Check if most samples are already transparent
  const transparentCount = samples.filter((s) => s.a < 128).length;
  if (transparentCount > samples.length * 0.6) {
    return null; // Already has transparent background
  }

  // Find the most common color among opaque samples
  const opaqueSamples = samples.filter((s) => s.a >= 128);
  if (opaqueSamples.length === 0) return null;

  // Group similar colors and find the dominant one
  const groups: { color: RGBA; count: number }[] = [];
  for (const sample of opaqueSamples) {
    const existing = groups.find(
      (g) => colorDistance(g.color.r, g.color.g, g.color.b, sample.r, sample.g, sample.b) < 30
    );
    if (existing) {
      existing.count++;
    } else {
      groups.push({ color: sample, count: 1 });
    }
  }

  groups.sort((a, b) => b.count - a.count);
  const dominant = groups[0];

  // Only proceed if the dominant color appears in at least half the samples
  if (dominant.count < opaqueSamples.length * 0.5) {
    return null; // No clear background color
  }

  return dominant.color;
}

/**
 * Remove solid background from an image buffer.
 * Returns a PNG buffer with transparent background.
 * If the image already has transparency or no clear background, returns null.
 */
export async function removeBackground(buffer: Buffer): Promise<Buffer | null> {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const bgColor = detectBackgroundColor(data, width, height, channels);
  if (!bgColor) {
    return null; // Already transparent or no clear background
  }

  const threshold = 35;
  const edgeThreshold = threshold * 1.8;
  let modifiedCount = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = colorDistance(r, g, b, bgColor.r, bgColor.g, bgColor.b);

    if (dist < threshold) {
      data[i + 3] = 0;
      modifiedCount++;
    } else if (dist < edgeThreshold) {
      // Smooth edge transition
      const alpha = Math.round(((dist - threshold) / (edgeThreshold - threshold)) * 255);
      data[i + 3] = Math.min(data[i + 3], alpha);
      modifiedCount++;
    }
  }

  const totalPixels = width * height;
  // If barely any pixels were changed, skip (background was not uniform)
  if (modifiedCount < totalPixels * 0.05) {
    return null;
  }

  return sharp(data, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}
