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

const ARYA_COLORS = ['#FF7EB6', '#F0A6C8'];
const LEGEND_COLORS = ['#FFD700', '#FFA657'];
const HEART_CORNER = { x: 780, y: 48 };

const ZONES = [
  { xMin: 16, xMax: 260, yMin: 16, yMax: 130 },
  { xMin: 740, xMax: 984, yMin: 16, yMax: 130 },
  { xMin: 16, xMax: 260, yMin: 530, yMax: 664 },
  { xMin: 740, xMax: 984, yMin: 530, yMax: 664 },
  { xMin: 16, xMax: 220, yMin: 200, yMax: 440 },
  { xMin: 780, xMax: 984, yMin: 200, yMax: 440 },
  { xMin: 320, xMax: 680, yMin: 16, yMax: 110 },
  { xMin: 320, xMax: 680, yMin: 300, yMax: 460 },
  { xMin: 320, xMax: 680, yMin: 520, yMax: 664 },
];

class ButterflyRenderer {
  static render(seed = Date.now()) {
    const rng = new Random(seed);
    const count = rng.int(8, 12);
    const seekerIndex = rng.int(0, count - 1);
    const nearMissIndex = rng.int(0, count - 1);
    const hasLegendary = rng.int(1, 20) === 1;
    const showConstellation = rng.int(1, 11) === 1;
    const backLayer = [];
    const frontLayer = [];

    for (let i = 0; i < count; i += 1) {
      const zone = ZONES[i % ZONES.length];
      const isSeeker = i === seekerIndex;
      const isNearMiss = i === nearMissIndex && !isSeeker;
      const butterfly = isNearMiss
        ? this.createNearMissButterfly(rng, zone)
        : this.createButterfly(rng, zone, { seeker: isSeeker });

      if (i % 2 === 0) {
        backLayer.push(butterfly);
      } else {
        frontLayer.push(butterfly);
      }
    }

    if (hasLegendary) {
      backLayer.push(this.createLegendaryButterfly(rng));
    }

    const aryaPath = this.heartCornerPath(rng);
    const aryaDuration = rng.int(52, 72);
    frontLayer.push(this.createAryaButterfly(rng, aryaPath, aryaDuration));

    const totalCount = count + 1 + (hasLegendary ? 1 : 0);

    return {
      back: `<g class="butterflies-back" style="pointer-events:none">${backLayer.join('')}</g>`,
      front: `<g class="butterflies-front" style="pointer-events:none">${frontLayer.join('')}</g>`,
      count: totalCount,
      legendary: hasLegendary,
      aryaDuration,
      showConstellation,
    };
  }

  static renderTailSparkles(rng) {
    const count = rng.int(14, 20);
    const sparkles = [];

    for (let i = 0; i < count; i += 1) {
      const anchorX = rng.float(-3, 3);
      const anchorY = rng.float(9.5, 13.5);
      const driftX = rng.float(-14, 14);
      const driftY = rng.float(8, 26);
      const swayX = driftX * rng.float(0.25, 0.55);
      const midY = driftY * rng.float(0.35, 0.55);
      const dur = rng.float(1.2, 3.4);
      const begin = rng.float(0, 3);
      const rMin = rng.float(0.35, 0.75);
      const rMax = rng.float(1.1, 2);
      const opA = rng.float(0.7, 1);
      const opB = rng.float(0.1, 0.4);
      const opC = rng.float(0.45, 0.85);
      const gold = rng.int(1, 5) === 1 ? '#FFF4A3' : '#FFD700';
      const isStar = rng.int(1, 4) === 1;

      if (isStar) {
        sparkles.push(this.renderTailStar(rng, anchorX, anchorY, driftX, driftY, swayX, midY, dur, begin, gold, opA, opB));
        continue;
      }

      sparkles.push(`
        <circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="${rMin.toFixed(1)}" fill="${gold}" opacity="0" class="arya-tail-sparkle">
          <animate attributeName="opacity" values="0;${opA.toFixed(2)};${opB.toFixed(2)};${opC.toFixed(2)};0" keyTimes="0;0.18;0.42;0.68;1" dur="${dur.toFixed(2)}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" />
          <animate attributeName="r" values="${rMin.toFixed(1)};${rMax.toFixed(1)};${(rMin * 0.8).toFixed(1)};0.2" keyTimes="0;0.3;0.62;1" dur="${dur.toFixed(2)}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" />
          <animateTransform attributeName="transform" type="translate" values="0,0; ${swayX.toFixed(1)},${midY.toFixed(1)}; ${driftX.toFixed(1)},${driftY.toFixed(1)}" keyTimes="0;0.4;1" dur="${dur.toFixed(2)}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" />
        </circle>
      `);
    }

    return `<g class="arya-tail-sparkles">${sparkles.join('')}</g>`;
  }

  static renderTailStar(rng, anchorX, anchorY, driftX, driftY, swayX, midY, dur, begin, gold, opA, opB) {
    const size = rng.float(0.8, 1.6).toFixed(1);
    const x0 = anchorX.toFixed(1);
    const y0 = anchorY.toFixed(1);
    const x1 = (anchorX + swayX).toFixed(1);
    const y1 = (anchorY + midY).toFixed(1);
    const x2 = (anchorX + driftX).toFixed(1);
    const y2 = (anchorY + driftY).toFixed(1);

    return `
      <g opacity="0" class="arya-tail-sparkle arya-tail-star">
        <animate attributeName="opacity" values="0;${opA.toFixed(2)};${opB.toFixed(2)};0" keyTimes="0;0.25;0.55;1" dur="${dur.toFixed(2)}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" />
        <animateTransform attributeName="transform" type="translate" values="${x0},${y0}; ${x1},${y1}; ${x2},${y2}" keyTimes="0;0.4;1" dur="${dur.toFixed(2)}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" />
        <g>
          <line x1="${-size}" y1="0" x2="${size}" y2="0" stroke="${gold}" stroke-width="0.7" stroke-linecap="round" />
          <line x1="0" y1="${-size}" x2="0" y2="${size}" stroke="${gold}" stroke-width="0.7" stroke-linecap="round" />
          <line x1="${(-size * 0.65).toFixed(1)}" y1="${(-size * 0.65).toFixed(1)}" x2="${(size * 0.65).toFixed(1)}" y2="${(size * 0.65).toFixed(1)}" stroke="${gold}" stroke-width="0.5" stroke-linecap="round" />
          <line x1="${(-size * 0.65).toFixed(1)}" y1="${(size * 0.65).toFixed(1)}" x2="${(size * 0.65).toFixed(1)}" y2="${(-size * 0.65).toFixed(1)}" stroke="${gold}" stroke-width="0.5" stroke-linecap="round" />
          <animateTransform attributeName="transform" type="rotate" values="0;${rng.int(50, 130)};${rng.int(180, 300)}" keyTimes="0;0.5;1" dur="${dur.toFixed(2)}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" />
        </g>
      </g>
    `;
  }

  static renderBeaconEffects(_duration, showConstellation) {
    if (!showConstellation) {
      return '';
    }

    const { x, y } = HEART_CORNER;

    return `
      <g class="butterfly-trails" style="pointer-events:none">
        <g class="heart-constellation">
          <line x1="${x - 28}" y1="${y + 12}" x2="${x}" y2="${y}" class="constellation-line" />
          <line x1="${x}" y1="${y}" x2="${x + 24}" y2="${y - 16}" class="constellation-line" />
          <line x1="${x + 24}" y1="${y - 16}" x2="${x + 38}" y2="${y + 8}" class="constellation-line" />
          <circle cx="${x - 28}" cy="${y + 12}" r="1.2" class="constellation-node" />
          <circle cx="${x + 24}" cy="${y - 16}" r="1.2" class="constellation-node" />
          <circle cx="${x + 38}" cy="${y + 8}" r="1.2" class="constellation-node" />
        </g>
      </g>
    `;
  }

  static createAryaButterfly(rng, path, duration) {
    const [colorA, colorB] = ARYA_COLORS;
    const scale = 1.42;
    const flap = rng.float(0.85, 1.05).toFixed(2);

    return `
      <g class="butterfly butterfly-arya">
        <title>she always finds her way back</title>
        <animateMotion dur="${duration}s" repeatCount="indefinite" path="${path}" rotate="auto" />
        <g transform="scale(${scale.toFixed(2)})">
          <circle cx="0" cy="0" r="13" class="butterfly-arya-glow" />
          <ellipse cx="-5" cy="-1" rx="7" ry="9" fill="${colorA}" opacity="0.95">
            <animateTransform attributeName="transform" type="rotate" values="-16 -5 -1; 18 -5 -1; -16 -5 -1" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="5" cy="-1" rx="7" ry="9" fill="${colorB}" opacity="0.95">
            <animateTransform attributeName="transform" type="rotate" values="16 5 -1; -18 5 -1; 16 5 -1" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-4" cy="5" rx="5" ry="6" fill="${colorB}" opacity="0.72">
            <animateTransform attributeName="transform" type="rotate" values="-10 -4 5; 14 -4 5; -10 -4 5" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="4" cy="5" rx="5" ry="6" fill="${colorA}" opacity="0.72">
            <animateTransform attributeName="transform" type="rotate" values="10 4 5; -14 4 5; 10 4 5" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <line x1="0" y1="-4" x2="0" y2="9" class="butterfly-body butterfly-arya-body" stroke-width="1.2" stroke-linecap="round" />
          <circle cx="0" cy="-5" r="1.6" fill="${colorA}" />
          ${this.renderTailSparkles(rng)}
        </g>
      </g>
    `;
  }

  static createLegendaryButterfly(rng) {
    const [colorA, colorB] = LEGEND_COLORS;
    const zone = ZONES[rng.int(0, ZONES.length - 1)];
    const scale = rng.float(0.9, 1.15);
    const duration = rng.int(28, 38);
    const flap = rng.float(0.55, 0.75).toFixed(2);
    const path = this.zonePath(rng, zone);

    return `
      <g class="butterfly butterfly-legendary" opacity="0.62">
        <title>legendary spawn · once in a while the kernel glints gold</title>
        <animateMotion dur="${duration}s" repeatCount="indefinite" path="${path}" rotate="auto" />
        <g transform="scale(${scale.toFixed(2)})">
          <ellipse cx="-5" cy="-1" rx="7" ry="9" fill="${colorA}" opacity="0.95">
            <animateTransform attributeName="transform" type="rotate" values="-16 -5 -1; 18 -5 -1; -16 -5 -1" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="5" cy="-1" rx="7" ry="9" fill="${colorB}" opacity="0.95">
            <animateTransform attributeName="transform" type="rotate" values="16 5 -1; -18 5 -1; 16 5 -1" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-4" cy="5" rx="5" ry="6" fill="${colorB}" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" values="-10 -4 5; 14 -4 5; -10 -4 5" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="4" cy="5" rx="5" ry="6" fill="${colorA}" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" values="10 4 5; -14 4 5; 10 4 5" dur="${flap}s" repeatCount="indefinite" />
          </ellipse>
          <line x1="0" y1="-4" x2="0" y2="9" class="butterfly-body butterfly-legendary-body" stroke-width="1.2" stroke-linecap="round" />
          <circle cx="0" cy="-5" r="1.6" fill="${colorA}" />
        </g>
      </g>
    `;
  }

  static createNearMissButterfly(rng, zone) {
    const colorA = PALETTE[rng.int(0, PALETTE.length - 1)];
    const colorB = PALETTE[rng.int(0, PALETTE.length - 1)];
    const scale = rng.float(0.7, 1.05);
    const duration = rng.int(38, 56);
    const flap = rng.float(0.75, 1.05).toFixed(2);
    const opacity = rng.float(0.28, 0.48).toFixed(2);
    const path = this.nearMissPath(rng, zone);

    return `
      <g class="butterfly butterfly-nearmiss" opacity="${opacity}">
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

  static nearMissPath(rng, zone) {
    const { x, y } = HEART_CORNER;
    const startX = rng.int(zone.xMin, zone.xMax);
    const startY = rng.int(zone.yMin, zone.yMax);
    const endX = rng.int(zone.xMin, zone.xMax);
    const endY = rng.int(zone.yMin, zone.yMax);

    return [
      `M ${startX} ${startY}`,
      `C ${rng.int(500, 700)} ${rng.int(80, 180)}, ${x + rng.int(-20, 20)} ${y + rng.int(-8, 8)}, ${x + rng.int(-35, 35)} ${y + rng.int(10, 30)}`,
      `C ${x + rng.int(40, 80)} ${y + rng.int(40, 80)}, ${endX} ${endY}, ${endX} ${endY}`,
    ].join(' ');
  }

  static heartCornerPath(rng) {
    const startX = rng.int(120, 280);
    const startY = rng.int(480, 640);
    const midX = rng.int(420, 620);
    const midY = rng.int(220, 360);
    const { x, y } = HEART_CORNER;

    return [
      `M ${startX} ${startY}`,
      `C ${startX + 80} ${startY - 120}, ${midX} ${midY}, ${x - 40} ${y + 20}`,
      `C ${x - 10} ${y - 10}, ${x + 20} ${y}, ${x} ${y}`,
    ].join(' ');
  }

  static createButterfly(rng, zone, options = {}) {
    const { seeker = false } = options;
    const colorA = seeker ? ARYA_COLORS[0] : PALETTE[rng.int(0, PALETTE.length - 1)];
    const colorB = seeker ? PALETTE[rng.int(0, PALETTE.length - 1)] : PALETTE[rng.int(0, PALETTE.length - 1)];
    const scale = rng.float(0.65, 1.25);
    const duration = rng.int(42, 68);
    const flap = rng.float(0.7, 1.2).toFixed(2);
    const opacity = rng.float(0.35, 0.72).toFixed(2);
    const path = this.zonePath(rng, zone);
    const seekerClass = seeker ? ' butterfly-seeker' : '';

    return `
      <g class="butterfly${seekerClass}" opacity="${opacity}">
        ${seeker ? '<title>seeker · one wing remembers the way home</title>' : ''}
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
