import { heatmapColor } from '../../../helpers/functions.js';

const HEATMAP_X = 28;
const HEATMAP_Y = 376;

class HeatmapRenderer {
  static render(weeks, theme) {
    const cellSize = 7;
    const gap = 2;
    const step = cellSize + gap;
    const visibleWeeks = weeks.slice(-52);

    let rects = '';
    visibleWeeks.forEach((week, weekIndex) => {
      week.contributionDays.forEach((day, dayIndex) => {
        const px = HEATMAP_X + weekIndex * step;
        const py = HEATMAP_Y + dayIndex * step;
        const fill = heatmapColor(day.contributionCount, theme);
        rects += `<rect x="${px}" y="${py}" width="${cellSize}" height="${cellSize}" rx="2" fill="${fill}"/>`;
      });
    });

    const height = 7 * step;

    return `
      <text x="${HEATMAP_X}" y="${HEATMAP_Y - 12}" class="section-label">CONTRIBUTION MAP</text>
      <text x="${HEATMAP_X + 200}" y="${HEATMAP_Y - 12}" class="muted">52-week signal density</text>
      <g class="heatmap">${rects}</g>
      <text x="${HEATMAP_X}" y="${HEATMAP_Y + height + 18}" class="muted">darker = quiet · greener = shipping code</text>
    `;
  }

  static renderSparkline(weeks, x, y, width = 944, height = 28) {
    const days = weeks.flatMap((week) => week.contributionDays).slice(-14);
    const max = Math.max(...days.map((d) => d.contributionCount), 1);

    const barWidth = width / days.length;
    let bars = '';

    days.forEach((day, index) => {
      const barHeight = Math.max(3, (day.contributionCount / max) * height);
      const bx = x + index * barWidth;
      const by = y + height - barHeight;
      bars += `<rect x="${bx}" y="${by}" width="${Math.max(4, barWidth - 3)}" height="${barHeight}" class="spark-bar" rx="2"/>`;
    });

    return `<g class="sparkline">${bars}</g>`;
  }
}

export default HeatmapRenderer;
