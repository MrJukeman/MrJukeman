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

const CANVAS = { xMin: 24, xMax: 976, yMin: 18, yMax: 548 };

class ButterflyRenderer {
  static render(seed = Date.now()) {
    const rng = new Random(seed);
    const count = rng.int(4, 7);
    const seekerIndex = rng.int(0, count - 1);
    const nearMissIndex = rng.int(0, count - 1);
    const hasLegendary = rng.int(1, 20) === 1;
    const showConstellation = rng.int(1, 11) === 1;
    const backLayer = [];
    const frontLayer = [];

    for (let i = 0; i < count; i += 1) {
      const isSeeker = i === seekerIndex;
      const isNearMiss = i === nearMissIndex && !isSeeker;
      const butterfly = isNearMiss
        ? this.createNearMissButterfly(rng)
        : this.createButterfly(rng, { seeker: isSeeker });

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
    // Original was 52–72s; a bit faster so she reaches home sooner
    const aryaDuration = rng.int(38, 52);
    frontLayer.push(this.createAryaButterfly(rng, aryaPath, aryaDuration));

    const totalCount = count + 1 + (hasLegendary ? 1 : 0);

    return {
      back: `<g class="butterflies-back" style="pointer-events:none">${backLayer.join('')}</g>`,
      front: `<g class="butterflies-front" style="pointer-events:none">${frontLayer.join('')}</g>`,
      count: totalCount,
      legendary: hasLegendary,
      aryaDuration,
      aryaHomecomings: [0.92],
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

  static renderBeaconEffects(showConstellation) {
    if (!showConstellation) {
      return '';
    }

    const { x, y } = HEART_CORNER;

    return `
      <g class="butterfly-trails" style="pointer-events:none">
        <g class="heart-constellation">
          <line x1="${x - 28}" y1="${y + 12}" x2="${x}" y2="${y}" class="constellation-line">
            <animate attributeName="opacity" values="0.06;0.22;0.06" dur="4.8s" repeatCount="indefinite" />
          </line>
          <line x1="${x}" y1="${y}" x2="${x + 24}" y2="${y - 16}" class="constellation-line">
            <animate attributeName="opacity" values="0.06;0.22;0.06" dur="4.8s" begin="0.4s" repeatCount="indefinite" />
          </line>
          <line x1="${x + 24}" y1="${y - 16}" x2="${x + 38}" y2="${y + 8}" class="constellation-line">
            <animate attributeName="opacity" values="0.06;0.22;0.06" dur="4.8s" begin="0.8s" repeatCount="indefinite" />
          </line>
          <circle cx="${x - 28}" cy="${y + 12}" r="1.2" class="constellation-node">
            <animate attributeName="opacity" values="0.1;0.55;0.1" dur="4.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="${x + 24}" cy="${y - 16}" r="1.2" class="constellation-node">
            <animate attributeName="opacity" values="0.1;0.55;0.1" dur="4.8s" begin="0.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="${x + 38}" cy="${y + 8}" r="1.2" class="constellation-node">
            <animate attributeName="opacity" values="0.1;0.55;0.1" dur="4.8s" begin="0.8s" repeatCount="indefinite" />
          </circle>
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

  static createLegendaryButterfly(rng) {
    const [colorA, colorB] = LEGEND_COLORS;
    const scale = rng.float(0.9, 1.15);
    const flap = rng.float(0.55, 0.75).toFixed(2);
    const { path, duration } = this.endlessWander(rng, { waypoints: rng.int(22, 32), speed: 0.09 });

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

  static createNearMissButterfly(rng) {
    const colorA = PALETTE[rng.int(0, PALETTE.length - 1)];
    const colorB = PALETTE[rng.int(0, PALETTE.length - 1)];
    const scale = rng.float(0.7, 1.05);
    const flap = rng.float(0.75, 1.05).toFixed(2);
    const opacity = rng.float(0.28, 0.48).toFixed(2);
    const { path, duration } = this.endlessWander(rng, {
      waypoints: rng.int(20, 28),
      speed: 0.1,
      nearMiss: true,
    });

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

  static createButterfly(rng, options = {}) {
    const { seeker = false } = options;
    const colorA = seeker ? ARYA_COLORS[0] : PALETTE[rng.int(0, PALETTE.length - 1)];
    const colorB = seeker ? PALETTE[rng.int(0, PALETTE.length - 1)] : PALETTE[rng.int(0, PALETTE.length - 1)];
    const scale = rng.float(0.65, 1.25);
    const flap = rng.float(0.7, 1.2).toFixed(2);
    const opacity = rng.float(0.35, 0.72).toFixed(2);
    const { path, duration } = this.endlessWander(rng, {
      waypoints: rng.int(18, 30),
      speed: rng.float(0.08, 0.12),
      seeker,
    });
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

  /** Long canvas-wide wander that closes on itself — no visible teleport reset. */
  static endlessWander(rng, options = {}) {
    const waypoints = options.waypoints ?? rng.int(18, 28);
    const speed = options.speed ?? 0.1;
    const start = this.randomCanvasPoint(rng);
    const points = [start];
    let x = start.x;
    let y = start.y;
    let weight = 0;

    for (let i = 0; i < waypoints; i += 1) {
      let next;
      if (options.nearMiss && i > 0 && i % rng.int(5, 8) === 0) {
        next = {
          x: HEART_CORNER.x + rng.int(-55, 55),
          y: HEART_CORNER.y + rng.int(12, 48),
        };
      } else if (options.seeker && rng.int(1, 6) === 1) {
        next = {
          x: HEART_CORNER.x + rng.int(-120, 80),
          y: HEART_CORNER.y + rng.int(20, 160),
        };
        next = this.clampPoint(next);
      } else {
        next = this.randomCanvasPoint(rng);
      }

      points.push(next);
      weight += this.dist(x, y, next.x, next.y);
      x = next.x;
      y = next.y;
    }

    // Close the loop back to start without a jump
    points.push(start);
    weight += this.dist(x, y, start.x, start.y);

    const commands = [`M ${start.x} ${start.y}`];
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      commands.push(this.organicCurve(rng, prev.x, prev.y, curr.x, curr.y));
    }

    const duration = Math.round(Math.max(140, Math.min(320, weight * speed)));

    return { path: commands.join(' '), duration };
  }

  static organicCurve(rng, x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const spread = Math.max(20, Math.round(Math.min(160, this.dist(x1, y1, x2, y2) * 0.45)));
    const c1 = this.clampPoint({
      x: Math.round(mx) + rng.int(-spread, spread),
      y: Math.round(my) + rng.int(-spread, spread),
    });
    const c2 = this.clampPoint({
      x: Math.round(mx) + rng.int(-spread, spread),
      y: Math.round(my) + rng.int(-spread, spread),
    });
    return `C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${Math.round(x2)} ${Math.round(y2)}`;
  }

  static randomCanvasPoint(rng) {
    return {
      x: rng.int(CANVAS.xMin, CANVAS.xMax),
      y: rng.int(CANVAS.yMin, CANVAS.yMax),
    };
  }

  static clampPoint(point) {
    return {
      x: Math.max(CANVAS.xMin, Math.min(CANVAS.xMax, Math.round(point.x))),
      y: Math.max(CANVAS.yMin, Math.min(CANVAS.yMax, Math.round(point.y))),
    };
  }

  static dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
}

export default ButterflyRenderer;
