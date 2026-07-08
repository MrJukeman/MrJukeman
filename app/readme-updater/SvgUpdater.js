import fs from 'fs';
import ConfigLoader from './ConfigLoader.js';
import HeatmapRenderer from './renderers/HeatmapRenderer.js';
import ButterflyRenderer from './renderers/ButterflyRenderer.js';
import { formatDelta, getAge, getNptTimestamp } from '../../helpers/functions.js';

const L = {
  x1: 28,
  x2: 510,
  colW: 462,
  col3a: 28,
  col3b: 348,
  col3c: 668,
  col3w: 300,
  col3wLast: 304,
  left: { keyX: 56, valX: 196 },
  right: { keyX: 538, valX: 678 },
  signal: { k1: 538, v1: 612, k2: 730, v2: 804 },
  process: { pidX: 56, loadX: 128, nameX: 196 },
  ports: { portX: 364, nameX: 430 },
  events: { x: 684 },
};

const THEME_ACCENTS = {
  dark: ['#ffa657', '#a5d6ff'],
  light: ['#d81e5b', '#0969da'],
};

class SvgUpdater {
  static updateSVG(stats, username) {
    const config = ConfigLoader.load();
    const syncTime = getNptTimestamp();
    const age = getAge(config.profile.dob);
    const seed = Date.now() ^ Number.parseInt(stats.commitHash.replace(/\D/g, '') || '0', 10);

    config.themes.forEach((theme) => {
      let svgContent = fs.readFileSync('resources/readme-template/main.svg', 'utf8');
      const cssContent = fs.readFileSync(`public/assets/css/readme/${theme}.css`, 'utf8');
      const [accentA, accentB] = THEME_ACCENTS[theme] || THEME_ACCENTS.dark;
      const butterflies = ButterflyRenderer.render(1000, 680, seed);

      const replacements = {
        '{css}': cssContent,
        '{svg_title}': config.svg.title,
        '{accent_a}': accentA,
        '{accent_b}': accentB,
        '{butterflies_back}': butterflies.back,
        '{butterflies_front}': butterflies.front,
        '{panels}': this.renderTopPanels(config, stats, age, syncTime, username),
        '{heatmap}': HeatmapRenderer.render(stats.heatmapWeeks, theme),
        '{sparkline_section}': this.renderPulseSection(stats),
        '{bottom_panels}': this.renderBottomPanels(config, stats),
        '{footer}': this.renderFooter(syncTime, stats.commitHash),
      };

      for (const [token, value] of Object.entries(replacements)) {
        svgContent = svgContent.replaceAll(token, value);
      }

      fs.mkdirSync('dist', { recursive: true });
      fs.writeFileSync(`dist/${theme}.svg`, svgContent);
    });
  }

  static panel(x, y, w, h) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="panel" />`;
  }

  static kvRow(y, key, value, col = 'left') {
    const { keyX, valX } = L[col] || L.left;
    const valueMarkup =
      typeof value === 'string'
        ? `<tspan x="${valX}" class="valueColor">${this.escapeXml(value)}</tspan>`
        : value;

    return `<text y="${y}" class="row"><tspan x="${keyX}" class="keyColor">${key}</tspan>${valueMarkup}</text>`;
  }

  static renderTopPanels(config, stats, age, syncTime, username) {
    return `
      ${this.renderHeader(config, stats, username)}
      <line x1="28" y1="94" x2="972" y2="94" class="header-divider" />
      ${this.panel(L.x1, 100, L.colW, 118)}
      ${this.panel(L.x2, 100, L.colW, 118)}
      ${this.panel(L.x1, 230, L.colW, 112)}
      ${this.panel(L.x2, 230, L.colW, 112)}
      ${this.renderIdentityPanel(config, age)}
      ${this.renderRuntimePanel(config, stats, syncTime)}
      ${this.renderArsenalPanel(config)}
      ${this.renderSignalPanel(stats)}
    `;
  }

  static renderHeader(config, stats, username) {
    const boot = this.renderBootStatus(stats);
    return `
      <text x="28" y="36" class="hero-title"><tspan>ARYAOS</tspan><tspan class="hero-version" dx="18">v${stats.kernelVersion}</tspan></text>
      <text x="28" y="56" class="hero-sub">${config.profile.tagline}</text>
      <text x="28" y="76" class="hero-user">@${username} · live engineering interface</text>
      <text x="972" y="42" text-anchor="end" class="boot-line">${boot}</text>
    `;
  }

  static renderIdentityPanel(config, age) {
    return `
      <text x="${L.left.keyX}" y="122" class="section-label">◈ IDENTITY</text>
      ${this.kvRow(146, 'Platform', config.profile.os)}
      ${this.kvRow(168, 'Role', config.profile.kernel)}
      ${this.kvRow(190, 'Crew', config.profile.hosts)}
      ${this.kvRow(212, 'Runtime.Age', age)}
    `;
  }

  static renderRuntimePanel(config, stats, syncTime) {
    return `
      <text x="${L.right.keyX}" y="122" class="section-label">◈ RUNTIME</text>
      ${this.kvRow(146, 'Clock.NPT', syncTime, 'right')}
      ${this.kvRow(168, 'Build.Channel', stats.kernelVersion, 'right')}
      ${this.kvRow(190, 'Sync.Status', `online · hash ${stats.commitHash}`, 'right')}
      ${this.kvRow(212, 'Toolkit', config.stack.utility, 'right')}
    `;
  }

  static renderArsenalPanel(config) {
    return `
      <text x="${L.left.keyX}" y="252" class="section-label">◈ ARSENAL</text>
      ${this.kvRow(274, 'Syntax', config.stack.core)}
      ${this.kvRow(294, 'Speech', config.stack.human)}
      ${this.kvRow(314, 'Systems', config.stack.framework)}
      ${this.kvRow(334, 'Data', config.stack.database)}
    `;
  }

  static renderSignalPanel(stats) {
    const d = stats.deltas || {};
    const delta = (key) => formatDelta(d[key]);
    const trendArrow = stats.velocityTrend === 'up' ? '▲' : stats.velocityTrend === 'down' ? '▼' : '▬';
    const trendClass =
      stats.velocityTrend === 'up' ? 'addColor' : stats.velocityTrend === 'down' ? 'delColor' : 'valueColor';
    const { k1, v1, k2, v2 } = L.signal;

    return `
      <text x="${k1}" y="252" class="section-label">◈ SIGNAL.FEED</text>
      <text y="274" class="row">
        <tspan x="${k1}" class="keyColor">Repos</tspan><tspan x="${v1}" class="valueColor">${stats.totalRepos}</tspan><tspan class="addColor">${delta('totalRepos')}</tspan>
        <tspan x="${k2}" class="keyColor">Stars</tspan><tspan x="${v2}" class="valueColor">${stats.totalStars}</tspan><tspan class="addColor">${delta('totalStars')}</tspan>
      </text>
      <text y="294" class="row">
        <tspan x="${k1}" class="keyColor">Commits</tspan><tspan x="${v1}" class="valueColor">${stats.totalCommits}</tspan><tspan class="addColor">${delta('totalCommits')}</tspan>
        <tspan x="${k2}" class="keyColor">Followers</tspan><tspan x="${v2}" class="valueColor">${stats.followers}</tspan><tspan class="addColor">${delta('followers')}</tspan>
      </text>
      <text y="314" class="row">
        <tspan x="${k1}" class="keyColor">Contributions</tspan><tspan x="${v1}" class="valueColor">${stats.totalContributions}</tspan><tspan class="addColor">${delta('totalContributions')}</tspan>
        <tspan x="${k2}" class="keyColor">Pulse</tspan><tspan x="${v2}" class="${trendClass}">${trendArrow} ${stats.velocityPercent}%</tspan>
      </text>
      <text y="334" class="row">
        <tspan x="${k1}" class="keyColor">LOC Delta</tspan><tspan x="${v1}" class="valueColor">${stats.totalLinesChanged}</tspan><tspan class="dim"> (</tspan><tspan class="addColor">+${stats.totalAdditions}</tspan><tspan class="dim"> / </tspan><tspan class="delColor">-${stats.totalDeletions}</tspan><tspan class="dim">)</tspan>
        <tspan x="${k2}" class="keyColor">Streak</tspan><tspan x="${v2}" class="valueColor">${stats.currentStreak}d</tspan><tspan class="dim"> / </tspan><tspan class="valueColor">${stats.longestStreak}d</tspan>
      </text>
    `;
  }

  static renderPulseSection(stats) {
    return `
      ${this.panel(28, 466, 944, 48)}
      <text x="${L.left.keyX}" y="486" class="section-label">PULSE · 14-DAY OUTPUT</text>
      ${HeatmapRenderer.renderSparkline(stats.heatmapWeeks, 56, 490, 900, 22)}
    `;
  }

  static renderBottomPanels(config, stats) {
    return `
      ${this.panel(L.col3a, 528, L.col3w, 132)}
      ${this.panel(L.col3b, 528, L.col3w, 132)}
      ${this.panel(L.col3c, 528, L.col3wLast, 132)}
      ${this.renderProcessPanel(stats.languages)}
      ${this.renderPortsPanel(config.network)}
      ${this.renderEventsPanel(stats.events)}
    `;
  }

  static renderProcessPanel(languages) {
    const { pidX, loadX, nameX } = L.process;
    const header = `
      <text x="${pidX}" y="550" class="section-label">PROCESS.MONITOR</text>
      <text y="568" class="muted">
        <tspan x="${pidX}">PID</tspan>
        <tspan x="${loadX}">LOAD</tspan>
        <tspan x="${nameX}">RUNTIME</tspan>
      </text>
    `;
    const rows = languages
      .map(
        (lang, i) =>
          `<text y="${586 + i * 18}" class="mono"><tspan x="${pidX}" class="keyColor">${lang.pid}</tspan><tspan x="${loadX}" class="valueColor">${String(lang.cpu).padStart(2)}%</tspan><tspan x="${nameX}">${lang.name}</tspan></text>`,
      )
      .join('');
    return header + rows;
  }

  static renderPortsPanel(ports) {
    const { portX, nameX } = L.ports;
    const header = `
      <text x="${portX}" y="550" class="section-label">OPEN.PORTS</text>
      <text y="568" class="muted">
        <tspan x="${portX}">PORT</tspan>
        <tspan x="${nameX}">SERVICE</tspan>
      </text>
    `;
    const rows = ports
      .map((entry, i) => {
        const y = 586 + i * 20;
        return `<a href="${entry.url}"><text y="${y}" class="link"><tspan x="${portX}">:${entry.port}</tspan><tspan x="${nameX}">${entry.name}</tspan></text></a>`;
      })
      .join('');
    return header + rows;
  }

  static renderEventsPanel(events) {
    const header = `<text x="${L.events.x}" y="550" class="section-label">EVENT.STREAM</text>`;
    const rows = events
      .slice(0, 4)
      .map((line, i) => `<text x="${L.events.x}" y="${574 + i * 20}" class="dmesg">${this.escapeXml(line)}</text>`)
      .join('');
    return header + rows;
  }

  static renderBootStatus(stats) {
    const today = new Date();
    const isBirthday = today.getMonth() === 5 && today.getDate() === 13;
    const birthday = isBirthday ? ' · birthday kernel unlocked' : '';
    return `boot ▸ aryaos ${stats.kernelVersion} ▸ github mounted ▸ telemetry live${birthday}`;
  }

  static renderFooter(syncTime, commitHash) {
    return `build ${commitHash} · synced ${syncTime} NPT · butterflies in flight · <tspan class="cursor">█</tspan>`;
  }

  static escapeXml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}

export default SvgUpdater;
