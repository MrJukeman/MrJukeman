import { Random } from 'random';

const PALETTE = [
  '#FF6B9D',
  '#C44DFF',
  '#4DC9FF',
  '#FFE66D',
  '#6BFF8E',
  '#FF9F43',
  '#FF5757',
  '#00D4AA',
  '#A78BFA',
  '#F472B6',
];

const ZONES = [
  { id: 'top-left', xMin: 16, xMax: 260, yMin: 16, yMax: 130 },
  { id: 'top-right', xMin: 740, xMax: 984, yMin: 16, yMax: 130 },
  { id: 'bottom-left', xMin: 16, xMax: 260, yMin: 530, yMax: 664 },
  { id: 'bottom-right', xMin: 740, xMax: 984, yMin: 530, yMax: 664 },
  { id: 'mid-left', xMin: 16, xMax: 220, yMin: 200, yMax: 440 },
  { id: 'mid-right', xMin: 780, xMax: 984, yMin: 200, yMax: 440 },
  { id: 'center-top', xMin: 320, xMax: 680, yMin: 16, yMax: 110 },
  { id: 'center-mid', xMin: 320, xMax: 680, yMin: 300, yMax: 460 },
  { id: 'center-bottom', xMin: 320, xMax: 680, yMin: 520, yMax: 664 },
];

class ButterflyRenderer {
  static render(width = 1000, height = 680, seed = Date.now()) {
    const rng = new Random(seed);
    const count = rng.int(16, 22);
    const backLayer = [];
    const frontLayer = [];

    for (let i = 0; i < count; i += 1) {
      const zone = ZONES[i % ZONES.length];
      const butterfly = this.createButterfly(rng, zone, i);
      if (i % 2 === 0) {
        backLayer.push(butterfly);
      } else {
        frontLayer.push(butterfly);
      }
    }

    return {
      back: `<g class="butterflies-back" style="pointer-events:none">${backLayer.join('')}</g>`,
      front: `<g class="butterflies-front" style="pointer-events:none">${frontLayer.join('')}</g>`,
    };
  }

  static createButterfly(rng, zone, index) {
    const colorA = PALETTE[rng.int(0, PALETTE.length - 1)];
    const colorB = PALETTE[rng.int(0, PALETTE.length - 1)];
    const scale = rng.float(0.65, 1.25);
    const duration = rng.int(42, 68);
    const flap = rng.float(0.7, 1.2).toFixed(2);
    const opacity = rng.float(0.35, 0.72).toFixed(2);
    const path = this.zonePath(rng, zone);

    return `
      <g class="butterfly" opacity="${opacity}">
        <animateMotion dur="${duration}s" repeatCount="indefinite" path="${path}" rotate="auto" />
        <g transform="scale(${scale.toFixed(2)})">
          <ellipse cx="-5" cy="-1" rx="7" ry="9" fill="${colorA}" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate" values="-16 -5 -1; 18 -5 -1; -16 -5 -1" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="5" cy="-1" rx="7" ry="9" fill="${colorB}" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate" values="16 5 -1; -18 5 -1; 16 5 -1" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-4" cy="5" rx="5" ry="6" fill="${colorB}" opacity="0.65">
            <animateTransform attributeName="transform" type="rotate" values="-10 -4 5; 14 -4 5; -10 -4 5" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="4" cy="5" rx="5" ry="6" fill="${colorA}" opacity="0.65">
            <animateTransform attributeName="transform" type="rotate" values="10 4 5; -14 4 5; 10 4 5" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <line x1="0" y1="-4" x2="0" y2="9" class="butterfly-body" stroke-width="1.2" stroke-linecap="round" />
          <circle cx="0" cy="-5" r="1.6" fill="${colorA}" />
        </g>
      </g>
    `;
  }

  static zonePath(rng, zone) {
    const segments = rng.int(4, 6);
    let x = rng.int(zone.xMin, zone.xMax);
    let y = rng.int(zone.yMin, zone.yMax);
    const points = [`M ${x} ${y}`];

    for (let i = 0; i < segments; i += 1) {
      const cx1 = rng.int(zone.xMin, zone.xMax);
      const cy1 = rng.int(zone.yMin, zone.yMax);
      const cx2 = rng.int(zone.xMin, zone.xMax);
      const cy2 = rng.int(zone.yMin, zone.yMax);
      x = rng.int(zone.xMin, zone.xMax);
      y = rng.int(zone.yMin, zone.yMax);
      points.push(`C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`);
    }

    return points.join(' ');
  }
}

export default ButterflyRenderer;
