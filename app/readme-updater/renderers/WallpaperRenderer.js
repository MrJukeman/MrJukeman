import { Random } from 'random';

class WallpaperRenderer {
  static render(seed) {
    const rng = new Random(seed);
    const gridOpacity = rng.float(0.024, 0.048).toFixed(3);
    const driftA = rng.float(0.015, 0.06).toFixed(3);
    const driftB = rng.float(0.01, 0.04).toFixed(3);
    const driftX = rng.int(180, 820);
    const driftY = rng.int(80, 420);
    const driftR = rng.int(220, 420);
    const wallpaperId = `0x${(seed >>> 0).toString(16).slice(0, 4).padStart(4, '0')}`;

    const gradient = `
      <radialGradient id="wallpaper-drift" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="{accent_a}" stop-opacity="${driftA}" />
        <stop offset="100%" stop-color="{accent_b}" stop-opacity="0" />
      </radialGradient>
    `;

    const overlay = `
      <circle cx="${driftX}" cy="${driftY}" r="${driftR}" fill="url(#wallpaper-drift)" opacity="${driftB}" />
    `;

    return {
      wallpaperId,
      gridOpacity,
      gradient,
      overlay,
    };
  }
}

export default WallpaperRenderer;
