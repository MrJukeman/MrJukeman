import fs from 'fs';
import ConfigLoader from './ConfigLoader.js';
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
  left: { keyX: 56, valX: 172, maxChars: 46 },
  right: { keyX: 538, valX: 662, maxChars: 38 },
  signal: { k1: 538, v1: 662, k2: 772, v2: 852 },
  process: { pidX: 56, loadX: 128, nameX: 196 },
  steamTop: { hrsX: 364, nameX: 430 },
  steamPerfect: { x: 684 },
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
      const butterflies = ButterflyRenderer.render(1000, 540, seed);

      const replacements = {
        '{css}': cssContent,
        '{svg_title}': config.svg.title,
        '{accent_a}': accentA,
        '{accent_b}': accentB,
        '{butterflies_back}': butterflies.back,
        '{butterflies_front}': butterflies.front,
        '{panels}': this.renderTopPanels(config, stats, age, syncTime, username),
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

  static truncate(text, max = 42) {
    const value = String(text);
    if (value.length <= max) {
      return value;
    }
    return `${value.slice(0, max - 1)}…`;
  }

  static kvRow(y, key, value, col = 'left') {
    const { keyX, valX, maxChars } = L[col] || L.left;
    const displayValue = typeof value === 'string' ? this.truncate(value, maxChars) : value;
    const valueMarkup =
      typeof displayValue === 'string'
        ? `<tspan x="${valX}" class="valueColor">${this.escapeXml(displayValue)}</tspan>`
        : displayValue;

    return `<text y="${y}" class="row"><tspan x="${keyX}" class="keyColor">${key}</tspan>${valueMarkup}</text>`;
  }

  static renderTopPanels(config, stats, age, syncTime, username) {
    return `
      ${this.renderHeader(config, stats, username)}
      <line x1="28" y1="94" x2="972" y2="94" class="header-divider" />
      ${this.panel(L.x1, 100, L.colW, 118)}
      ${this.panel(L.x2, 100, L.colW, 118)}
      ${this.panel(L.x1, 230, L.colW, 124)}
      ${this.panel(L.x2, 230, L.colW, 124)}
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
      ${this.kvRow(276, 'Syntax', config.stack.core)}
      ${this.kvRow(298, 'Speech', config.stack.human)}
      ${this.kvRow(320, 'Systems', config.stack.framework)}
      ${this.kvRow(342, 'Data', config.stack.database)}
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
      <text y="276" class="row">
        <tspan x="${k1}" class="keyColor">Repos</tspan><tspan x="${v1}" class="valueColor">${stats.totalRepos}</tspan><tspan class="addColor">${delta('totalRepos')}</tspan>
        <tspan x="${k2}" class="keyColor">Stars</tspan><tspan x="${v2}" class="valueColor">${stats.totalStars}</tspan><tspan class="addColor">${delta('totalStars')}</tspan>
      </text>
      <text y="298" class="row">
        <tspan x="${k1}" class="keyColor">Commits</tspan><tspan x="${v1}" class="valueColor">${stats.totalCommits}</tspan><tspan class="addColor">${delta('totalCommits')}</tspan>
        <tspan x="${k2}" class="keyColor">Followers</tspan><tspan x="${v2}" class="valueColor">${stats.followers}</tspan><tspan class="addColor">${delta('followers')}</tspan>
      </text>
      <text y="320" class="row">
        <tspan x="${k1}" class="keyColor">Contrib</tspan><tspan x="${v1}" class="valueColor">${stats.totalContributions}</tspan><tspan class="addColor">${delta('totalContributions')}</tspan>
        <tspan x="${k2}" class="keyColor">Pulse</tspan><tspan x="${v2}" class="${trendClass}">${trendArrow} ${stats.velocityPercent}%</tspan>
      </text>
      <text y="342" class="row">
        <tspan x="${k1}" class="keyColor">LOC Delta</tspan><tspan x="${v1}" class="valueColor">${stats.totalLinesChanged}</tspan><tspan class="dim"> (</tspan><tspan class="addColor">+${stats.totalAdditions}</tspan><tspan class="dim"> / </tspan><tspan class="delColor">-${stats.totalDeletions}</tspan><tspan class="dim">)</tspan>
        <tspan x="${k2}" class="keyColor">Streak</tspan><tspan x="${v2}" class="valueColor">${stats.currentStreak}d</tspan><tspan class="dim"> / </tspan><tspan class="valueColor">${stats.longestStreak}d</tspan>
      </text>
    `;
  }

  static renderBottomPanels(config, stats) {
    return `
      ${this.panel(L.col3a, 368, L.col3w, 132)}
      ${this.panel(L.col3b, 368, L.col3w, 132)}
      ${this.panel(L.col3c, 368, L.col3wLast, 132)}
      ${this.renderProcessPanel(stats.languages)}
      ${this.renderSteamTopPanel(stats.steam)}
      ${this.renderSteamPerfectPanel(stats.steam)}
    `;
  }

  static renderProcessPanel(languages) {
    const { pidX, loadX, nameX } = L.process;
    const header = `
      <text x="${pidX}" y="390" class="section-label">PROCESS.MONITOR</text>
      <text y="408" class="muted">
        <tspan x="${pidX}">PID</tspan>
        <tspan x="${loadX}">LOAD</tspan>
        <tspan x="${nameX}">RUNTIME</tspan>
      </text>
    `;
    const rows = languages
      .map(
        (lang, i) =>
          `<text y="${426 + i * 18}" class="mono"><tspan x="${pidX}" class="keyColor">${lang.pid}</tspan><tspan x="${loadX}" class="valueColor">${String(lang.cpu).padStart(2)}%</tspan><tspan x="${nameX}">${lang.name}</tspan></text>`,
      )
      .join('');
    return header + rows;
  }

  static renderSteamTopPanel(steam = {}) {
    const { hrsX, nameX } = L.steamTop;
    const profileUrl = steam.profileUrl || 'https://steamcommunity.com/id/MrJukeman';
    const header = `
      <a href="${profileUrl}">
        <text x="${hrsX}" y="390" class="section-label link">◈ STEAM.TOP</text>
      </a>
      <text y="408" class="muted">
        <tspan x="${hrsX}">HRS</tspan>
        <tspan x="${nameX}">TITLE</tspan>
      </text>
    `;

    if (!steam.topGames?.length) {
      const hint =
        steam.status === 'offline' || steam.status === 'cached'
          ? steam.message || 'add STEAM_API_KEY secret'
          : 'no playtime data';
      return `${header}<text x="${hrsX}" y="430" class="dmesg">${this.escapeXml(hint)}</text>`;
    }

    const rows = steam.topGames
      .map((game, i) => {
        const y = 426 + i * 20;
        const title = this.truncate(game.name, 24);
        return `<text y="${y}" class="mono"><tspan x="${hrsX}" class="valueColor">${game.hours}</tspan><tspan x="${nameX}">${this.escapeXml(title)}</tspan></text>`;
      })
      .join('');

    return header + rows;
  }

  static renderSteamPerfectPanel(steam = {}) {
    const x = L.steamPerfect.x;
    const profileUrl = steam.profileUrl || 'https://steamcommunity.com/id/MrJukeman/games/?tab=perfect';
    const total = steam.perfectTotal ?? steam.perfectGames?.length ?? 0;
    const header = `
      <a href="${profileUrl}">
        <text x="${x}" y="390" class="section-label link">◈ STEAM.PERFECT</text>
      </a>
      <text x="${x}" y="408" class="muted">${total} games · 100% achievements</text>
    `;

    if (!steam.perfectGames?.length) {
      const hint =
        steam.status === 'offline' || steam.status === 'cached'
          ? steam.message || 'add STEAM_API_KEY secret'
          : 'scanning library for 100% games…';
      return `${header}<text x="${x}" y="430" class="dmesg">${this.escapeXml(hint)}</text>`;
    }

    const rows = steam.perfectGames
      .map((game, i) => {
        const title = this.truncate(game.name, 26);
        return `<text x="${x}" y="${426 + i * 20}" class="mono"><tspan class="addColor">✓</tspan><tspan dx="8">${this.escapeXml(title)}</tspan></text>`;
      })
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
