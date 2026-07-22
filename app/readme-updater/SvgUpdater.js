import fs from 'fs';
import ConfigLoader from './ConfigLoader.js';
import ButterflyRenderer from './renderers/ButterflyRenderer.js';
import BootSequenceRenderer from './renderers/BootSequenceRenderer.js';
import NavRenderer, { NAV } from './renderers/NavRenderer.js';
import WallpaperRenderer from './renderers/WallpaperRenderer.js';
import { formatDelta, getAge, getNptTimestamp } from '../../helpers/functions.js';

const PAD = {
  top: 22,
  bottom: 18,
  labelToRow: 24,
  rowStep: 22,
  subToRow: 16,
  gamingHeaderGap: 10,
  gamingColsGap: 13,
  gamingRowStep: 17,
  gamingSectionGap: 13,
};

const NAV_GAP = 14;
const ROW_GAP = 14;
const FOOTER_GAP = 20;

const L = {
  x1: 28,
  x2: 510,
  colW: 462,
  col3a: 28,
  col3w: 300,
  get topRowY() {
    return NAV.bottom + NAV_GAP;
  },
  get topRowH() {
    return PAD.top + PAD.labelToRow + 3 * PAD.rowStep + PAD.bottom;
  },
  get midRowY() {
    return this.topRowY + this.topRowH + ROW_GAP;
  },
  get midRowH() {
    return PAD.top + PAD.labelToRow + 3 * PAD.rowStep + PAD.bottom;
  },
  get topLabelY() {
    return this.topRowY + PAD.top;
  },
  get topFirstRowY() {
    return this.topLabelY + PAD.labelToRow;
  },
  get bottomRowY() {
    return this.midRowY + this.midRowH + ROW_GAP;
  },
  get bottomRowH() {
    return 140;
  },
  get footerY() {
    return this.bottomRowY + this.bottomRowH + FOOTER_GAP;
  },
  get svgHeight() {
    return this.footerY + 14;
  },
  gaming: {
    x: 348,
    w: 624,
    padX: 372,
    rightX: 948,
    barX: 760,
    hoursX: 700,
    get headerY() {
      return L.bottomRowY + PAD.top;
    },
    get dividerY() {
      return this.headerY + PAD.gamingHeaderGap;
    },
    get colsY() {
      return this.dividerY + PAD.gamingColsGap;
    },
    get rowStartY() {
      return this.colsY + PAD.subToRow;
    },
    rowStep: PAD.gamingRowStep,
    get trophyY() {
      return L.bottomRowY + L.bottomRowH - PAD.bottom;
    },
    get trophyDividerY() {
      return this.trophyY - PAD.gamingSectionGap;
    },
  },
  left: { keyX: 56, valX: 172, maxChars: 46 },
  right: { keyX: 538, valX: 662, maxChars: 38 },
  signal: { k1: 538, v1: 662, k2: 810, v2: 890 },
  process: {
    padX: 56,
    pidX: 56,
    loadX: 112,
    loadBarX: 148,
    loadBarW: 28,
    nameX: 186,
    get rightX() {
      return L.col3a + L.col3w - 24;
    },
    get headerY() {
      return L.bottomRowY + PAD.top;
    },
    get dividerY() {
      return this.headerY + PAD.gamingHeaderGap;
    },
    get colsY() {
      return this.dividerY + PAD.gamingColsGap;
    },
    get rowStartY() {
      return this.colsY + PAD.subToRow;
    },
    get maxRows() {
      return 4;
    },
    get rowStep() {
      const lastRowY = L.bottomRowY + L.bottomRowH - PAD.bottom;
      return Math.floor((lastRowY - this.rowStartY) / (this.maxRows - 1));
    },
  },
};

const THEME_ACCENTS = {
  dark: ['#ffa657', '#a5d6ff'],
  light: ['#d81e5b', '#0969da'],
};

const HEART_ROMANCE = {
  dark: '#ff7eb6',
  light: '#bf3989',
};

class SvgUpdater {
  static updateSVG(stats, username, meta = {}) {
    const config = ConfigLoader.load();
    const syncTime = getNptTimestamp();
    const age = getAge(config.profile.dob);
    const seed = Date.now() ^ Number.parseInt(stats.commitHash.replace(/\D/g, '') || '0', 10);
    const daySeed = seed ^ new Date().getDate() * 9973;
    const template = fs.readFileSync('resources/readme-template/main.svg', 'utf8');
    const cssByTheme = Object.fromEntries(
      config.themes.map((theme) => [
        theme,
        fs.readFileSync(`public/assets/css/readme/${theme}.css`, 'utf8'),
      ]),
    );
    const butterflies = ButterflyRenderer.render(seed);
    const wallpaper = WallpaperRenderer.render(daySeed);
    const bottomPanels = this.renderBottomPanels(config, stats);
    const playingName = stats.steam?.presence?.state === 'in-game' ? stats.steam.presence.gameName : null;
    const bootLine = BootSequenceRenderer.render(seed, {
      username,
      butterflyCount: butterflies.count,
      perfectTotal: stats.steam?.perfectTotal ?? 0,
      steamOnline: stats.steam?.status === 'online',
      steamPlaying: playingName ? this.truncate(playingName, 18) : null,
      wallpaperId: wallpaper.wallpaperId,
      legendary: butterflies.legendary,
    });
    const footer = this.renderFooter(syncTime, stats.commitHash, bootLine, meta.newAchievement);

    fs.mkdirSync('dist', { recursive: true });

    for (const theme of config.themes) {
      const [accentA, accentB] = THEME_ACCENTS[theme] || THEME_ACCENTS.dark;
      const romancePink = HEART_ROMANCE[theme] || HEART_ROMANCE.dark;
      const panels = this.renderTopPanels(
        config,
        stats,
        age,
        syncTime,
        username,
        butterflies,
        romancePink,
        meta,
        accentA,
      );
      const trails = ButterflyRenderer.renderBeaconEffects(butterflies.showConstellation);
      const replacements = {
        '{css}': cssByTheme[theme],
        '{svg_title}': config.svg.title,
        '{svg_height}': String(L.svgHeight),
        '{footer_y}': String(L.footerY),
        '{accent_a}': accentA,
        '{accent_b}': accentB,
        '{grid_opacity}': wallpaper.gridOpacity,
        '{wallpaper_gradient}': wallpaper.gradient.replaceAll('{accent_a}', accentA).replaceAll('{accent_b}', accentB),
        '{wallpaper_overlay}': wallpaper.overlay,
        '{butterfly_trails}': trails,
        '{butterflies_back}': butterflies.back,
        '{butterflies_front}': butterflies.front,
        '{panels}': panels,
        '{bottom_panels}': bottomPanels,
        '{footer}': footer,
      };

      let svgContent = template;
      for (const [token, value] of Object.entries(replacements)) {
        svgContent = svgContent.replaceAll(token, value);
      }

      fs.writeFileSync(`dist/${theme}.svg`, svgContent);
    }
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

  static renderTopPanels(config, stats, age, syncTime, username, butterflies, romancePink, meta = {}, accent = '#ffa657') {
    return `
      ${this.renderAchievementCeremony(meta.newAchievement, accent)}
      ${NavRenderer.render(config, stats, username, {
        aryaDuration: butterflies.aryaDuration,
        aryaHomecomings: butterflies.aryaHomecomings,
        romancePink,
      })}
      ${this.panel(L.x1, L.topRowY, L.colW, L.topRowH)}
      ${this.panel(L.x2, L.topRowY, L.colW, L.topRowH)}
      ${this.panel(L.x1, L.midRowY, L.colW, L.midRowH)}
      ${this.panel(L.x2, L.midRowY, L.colW, L.midRowH)}
      ${this.renderIdentityPanel(config, age, stats)}
      ${this.renderRuntimePanel(config, stats, syncTime)}
      ${this.renderArsenalPanel(config)}
      ${this.renderSignalPanel(stats)}
    `;
  }

  static renderAchievementCeremony(achievement, accent = '#ffa657') {
    if (!achievement) {
      return '';
    }

    const label = this.escapeXml(achievement);
    return `
      <g class="achievement-ceremony" style="pointer-events:none">
        <rect x="20" y="6" width="960" height="${L.svgHeight - 12}" rx="18" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0">
          <animate attributeName="opacity" values="0;0.75;0.2;0.55;0" keyTimes="0;0.1;0.4;0.65;1" dur="3.6s" fill="freeze" />
        </rect>
        <rect x="28" y="14" width="944" height="82" rx="10" fill="${accent}" opacity="0">
          <animate attributeName="opacity" values="0;0.12;0.04;0.1;0" keyTimes="0;0.12;0.45;0.7;1" dur="3.6s" fill="freeze" />
        </rect>
        <text x="500" y="58" text-anchor="middle" class="achievement-banner" opacity="0">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.72;1" dur="3.6s" fill="freeze" />
          ★ ACHIEVEMENT UNLOCKED · ${label}
        </text>
      </g>
    `;
  }

  static renderIdentityPanel(config, age, stats) {
    const labelY = L.topLabelY;
    const firstRowY = L.topFirstRowY;
    return `
      <text x="${L.left.keyX}" y="${labelY}" class="section-label">◈ IDENTITY</text>
      ${this.kvRow(firstRowY, 'Platform', config.profile.os)}
      ${this.kvRow(firstRowY + PAD.rowStep, 'Role', config.profile.kernel)}
      ${this.renderCrewRow(firstRowY + 2 * PAD.rowStep, stats.crewMesh || [], config.profile.hosts)}
      ${this.kvRow(firstRowY + 3 * PAD.rowStep, 'Age', age)}
    `;
  }

  static renderCrewRow(y, nodes, fallbackHosts) {
    if (!nodes.length) {
      return this.kvRow(y, 'Crew', fallbackHosts);
    }

    return `<text y="${y}" class="row"><tspan x="${L.left.keyX}" class="keyColor">Crew</tspan>${this.renderCrewMesh(nodes)}</text>`;
  }

  static renderCrewMesh(nodes) {
    const parts = nodes.map((node, index) => {
      const nameClass = node.active ? 'crew-name-active' : 'crew-name-idle';
      const prefix = index === 0 ? '' : '<tspan class="dim" dx="8">·</tspan>';
      return `${prefix}<tspan class="${nameClass}" dx="${index === 0 ? 0 : 4}">${this.escapeXml(node.label)}</tspan>`;
    });

    return `<tspan x="${L.left.valX}">${parts.join('')}</tspan>`;
  }

  static renderRuntimePanel(config, stats, syncTime) {
    const labelY = L.topLabelY;
    const firstRowY = L.topFirstRowY;
    return `
      <text x="${L.right.keyX}" y="${labelY}" class="section-label">◈ RUNTIME</text>
      ${this.kvRow(firstRowY, 'Clock.NPT', syncTime, 'right')}
      ${this.kvRow(firstRowY + PAD.rowStep, 'Build.Channel', stats.kernelVersion, 'right')}
      ${this.kvRow(firstRowY + 2 * PAD.rowStep, 'Sync.Status', `online · hash ${stats.commitHash}`, 'right')}
      ${this.kvRow(firstRowY + 3 * PAD.rowStep, 'Toolkit', config.stack.utility, 'right')}
    `;
  }

  static renderArsenalPanel(config) {
    const labelY = L.midRowY + PAD.top;
    const firstRowY = labelY + PAD.labelToRow;
    return `
      <text x="${L.left.keyX}" y="${labelY}" class="section-label">◈ ARSENAL</text>
      ${this.kvRow(firstRowY, 'Syntax', config.stack.core)}
      ${this.kvRow(firstRowY + PAD.rowStep, 'Speech', config.stack.human)}
      ${this.kvRow(firstRowY + 2 * PAD.rowStep, 'Systems', config.stack.framework)}
      ${this.kvRow(firstRowY + 3 * PAD.rowStep, 'Data', config.stack.database)}
    `;
  }

  static renderSignalPanel(stats) {
    const d = stats.deltas || {};
    const delta = (key) => formatDelta(d[key]);
    const trendArrow = stats.velocityTrend === 'up' ? '▲' : stats.velocityTrend === 'down' ? '▼' : '▬';
    const trendClass =
      stats.velocityTrend === 'up' ? 'addColor' : stats.velocityTrend === 'down' ? 'delColor' : 'valueColor';
    const { k1, v1, k2, v2 } = L.signal;
    const labelY = L.midRowY + PAD.top;
    const firstRowY = labelY + PAD.labelToRow;

    const lastRowY = firstRowY + 3 * PAD.rowStep;

    return `
      <text x="${k1}" y="${labelY}" class="section-label">◈ SIGNAL.FEED</text>
      <text y="${firstRowY}" class="row">
        <tspan x="${k1}" class="keyColor">Repos</tspan><tspan x="${v1}" class="valueColor">${stats.totalRepos}</tspan><tspan class="addColor">${delta('totalRepos')}</tspan>
        <tspan x="${k2}" class="keyColor">Stars</tspan><tspan x="${v2}" class="valueColor">${stats.totalStars}</tspan><tspan class="addColor">${delta('totalStars')}</tspan>
      </text>
      <text y="${firstRowY + PAD.rowStep}" class="row">
        <tspan x="${k1}" class="keyColor">Commits</tspan><tspan x="${v1}" class="valueColor">${stats.totalCommits}</tspan><tspan class="addColor">${delta('totalCommits')}</tspan>
        <tspan x="${k2}" class="keyColor">Followers</tspan><tspan x="${v2}" class="valueColor">${stats.followers}</tspan><tspan class="addColor">${delta('followers')}</tspan>
      </text>
      <text y="${firstRowY + 2 * PAD.rowStep}" class="row">
        <tspan x="${k1}" class="keyColor">Contrib</tspan><tspan x="${v1}" class="valueColor">${stats.totalContributions}</tspan><tspan class="addColor">${delta('totalContributions')}</tspan>
        <tspan x="${k2}" class="keyColor">Pulse</tspan><tspan x="${v2}" class="${trendClass}">${trendArrow} ${stats.velocityPercent}%</tspan>
      </text>
      <text y="${lastRowY}" class="row">
        <tspan x="${k1}" class="keyColor">LOC Delta</tspan><tspan x="${v1}" class="valueColor">${stats.totalLinesChanged}</tspan><tspan class="dim"> (</tspan><tspan class="addColor">+${stats.totalAdditions}</tspan><tspan class="dim">/</tspan><tspan class="delColor">-${stats.totalDeletions}</tspan><tspan class="dim">)</tspan>
      </text>
      <text y="${lastRowY}" class="row">
        <tspan x="${k2}" class="keyColor">Streak</tspan><tspan x="${v2}" class="valueColor">${stats.currentStreak ?? 0}d</tspan><tspan class="dim"> / </tspan><tspan class="valueColor">${stats.longestStreak ?? 0}d</tspan>
      </text>
    `;
  }

  static renderBottomPanels(config, stats) {
    const { x, w } = L.gaming;
    return `
      ${this.panel(L.col3a, L.bottomRowY, L.col3w, L.bottomRowH)}
      ${this.panel(x, L.bottomRowY, w, L.bottomRowH)}
      ${this.renderProcessPanel(stats.languages, config)}
      ${this.renderGamingPanel(stats.steam, config)}
    `;
  }

  static renderProcessPanel(languages, config = {}) {
    const p = L.process;
    const displayCount = config.process?.displayCount ?? p.maxRows;
    const title = config.process?.panelTitle || 'PROCESS.MONITOR';
    const rows = (languages || []).slice(0, displayCount);
    const statsLine = `${rows.length} runtime`;

    const header = `
      <text x="${p.padX}" y="${p.headerY}" class="section-label">◈ ${title}</text>
      <text x="${p.rightX}" y="${p.headerY}" text-anchor="end" class="gaming-stats">${statsLine}</text>
      <line x1="${p.padX}" y1="${p.dividerY}" x2="${p.rightX}" y2="${p.dividerY}" class="gaming-divider" />
      <text y="${p.colsY}" class="muted">
        <tspan x="${p.pidX}">PID</tspan>
        <tspan x="${p.loadX}">LOAD</tspan>
        <tspan x="${p.nameX}">RUNTIME</tspan>
      </text>
    `;

    if (!rows.length) {
      return header + `<text x="${p.padX}" y="${p.rowStartY + 8}" class="dmesg">no runtime telemetry</text>`;
    }

    const dataRows = rows
      .map((lang, i) => {
        const rowY = p.rowStartY + i * p.rowStep;
        const barY = rowY - 8;
        const cpu = Math.max(0, Math.min(100, Number(lang.cpu) || 0));
        const fillW = Math.max(cpu > 0 ? 2 : 0, Math.round((p.loadBarW * cpu) / 100));
        const pulse =
          i === 0
            ? `<animate attributeName="opacity" values="0.75;1;0.75" dur="2.4s" repeatCount="indefinite" />`
            : '';

        return `
          <text y="${rowY}" class="mono">
            <tspan x="${p.pidX}" class="keyColor">${lang.pid}</tspan>
            <tspan x="${p.loadX}" class="valueColor">${String(cpu).padStart(2)}%</tspan>
            <tspan x="${p.nameX}">${this.escapeXml(lang.name)}</tspan>
          </text>
          <rect x="${p.loadBarX}" y="${barY}" width="${p.loadBarW}" height="5" rx="1.5" class="proc-bar-bg" />
          <rect x="${p.loadBarX}" y="${barY}" width="${fillW}" height="5" rx="1.5" class="proc-bar-fill">
            ${pulse}
          </rect>
        `;
      })
      .join('');

    return header + dataRows;
  }

  static renderGamingPanel(steam = {}, config = {}) {
    const g = L.gaming;
    const barTrackW = 148;
    const profileUrl = steam.profileUrl || 'https://steamcommunity.com/id/MrJukeman';
    const presence = steam.presence || {};
    const inGame = presence.state === 'in-game' && Boolean(presence.gameName);
    const title = inGame ? 'NOW.PLAYING' : config.steam?.panelTitle || 'GAMING.DOCK';
    const titleClass = inGame ? 'section-label link game-live-label' : 'section-label link';
    const perfectTotal = steam.perfectTotal ?? steam.perfectGames?.length ?? 0;
    const totalHours = steam.totalPlaytimeHours || null;
    const statsLine = inGame
      ? this.truncate(presence.gameName, 28)
      : totalHours
        ? `${totalHours}h logged · ${perfectTotal} perfect`
        : `${perfectTotal} perfect games`;

    const header = `
      <a href="${profileUrl}">
        <text x="${g.padX}" y="${g.headerY}" class="${titleClass}">◈ ${title}</text>
      </a>
      <text x="${g.rightX}" y="${g.headerY}" text-anchor="end" class="gaming-stats">${this.escapeXml(statsLine)}</text>
      <line x1="${g.padX}" y1="${g.dividerY}" x2="${g.rightX}" y2="${g.dividerY}" class="gaming-divider" />
      <text y="${g.colsY}" class="muted">
        <tspan x="${g.padX}">#</tspan>
        <tspan x="${g.padX + 28}">TITLE</tspan>
        <tspan x="${g.hoursX}">HRS</tspan>
        <tspan x="${g.barX}">ACHIEVEMENTS</tspan>
      </text>
    `;

    const games = this.resolveDockGames(steam, config.steam?.displayCount ?? 3);

    if (!games.length) {
      const hint =
        steam.status === 'offline'
          ? steam.message || 'add STEAM_API_KEY secret'
          : 'no in-progress games to show';
      return header + `<text x="${g.padX}" y="${g.rowStartY + 8}" class="dmesg">${this.escapeXml(hint)}</text>`;
    }

    const rows = games
      .map((game, index) => {
        const rowY = g.rowStartY + index * g.rowStep;
        const barY = rowY - 8;
        const live = Boolean(game.live);
        const rank = live ? '▶' : String(index + 1).padStart(2, '0');
        const titleText = this.truncate(game.name, live ? 30 : 32);
        const hoursLabel = game.hours == null || game.hours === '—' ? '—' : `${game.hours}h`;
        const unlocked = game.achievementsUnlocked ?? 0;
        const total = game.achievementsTotal ?? 0;
        const hasAchievements = total > 0;
        const barPercent = hasAchievements ? Math.max(4, Math.round((unlocked / total) * 100)) : 0;
        const barWidth = hasAchievements ? Math.round((barTrackW * barPercent) / 100) : 0;
        const countLabel = hasAchievements ? `${unlocked}/${total}` : '—';
        const rowOpacity = inGame && !live ? '0.42' : '1';
        const titleClassName = live ? 'game-title game-title-live' : 'game-title';
        const rankClass = live ? 'game-rank game-rank-live' : 'game-rank';
        const barFill = hasAchievements
          ? `<rect x="${g.barX}" y="${barY}" width="${barWidth}" height="5" rx="2" class="${live ? 'game-bar-fill game-bar-live' : 'game-bar-fill'}">${
              live
                ? '<animate attributeName="opacity" values="0.65;1;0.65" dur="1.6s" repeatCount="indefinite" />'
                : ''
            }</rect>`
          : '';

        return `
          <g opacity="${rowOpacity}">
            <text y="${rowY}" class="gaming-row">
              <tspan x="${g.padX}" class="${rankClass}">${rank}</tspan>
              <tspan x="${g.padX + 28}" class="${titleClassName}">${this.escapeXml(titleText)}</tspan>
              <tspan x="${g.hoursX}" class="game-hours">${hoursLabel}</tspan>
            </text>
            <rect x="${g.barX}" y="${barY}" width="${barTrackW}" height="5" rx="2" class="game-bar-bg" />
            ${barFill}
            <text x="${g.barX + barTrackW + 6}" y="${rowY}" class="game-ach-count">${countLabel}</text>
          </g>
        `;
      })
      .join('');

    const trophyLine = this.renderTrophyLine(
      steam.perfectGames || [],
      g.padX,
      g.trophyY,
      g.rightX,
      config.steam?.trophyScrollSeconds ?? 18,
    );
    const footer = trophyLine
      ? `<line x1="${g.padX}" y1="${g.trophyDividerY}" x2="${g.rightX}" y2="${g.trophyDividerY}" class="gaming-divider" />${trophyLine}`
      : '';

    return header + rows + footer;
  }

  static isPlayingGame(game, presence = {}) {
    if (presence.state !== 'in-game') {
      return false;
    }
    if (presence.gameId && game.appId != null && String(game.appId) === String(presence.gameId)) {
      return true;
    }
    if (!presence.gameName || !game.name) {
      return false;
    }
    const live = presence.gameName.toLowerCase();
    const name = game.name.toLowerCase();
    return name.includes(live) || live.includes(name.slice(0, Math.min(14, name.length)));
  }

  static resolveDockGames(steam, displayCount = 3) {
    const presence = steam.presence || {};
    const inGame = presence.state === 'in-game' && Boolean(presence.gameName);
    let games = steam.dockGames?.length
      ? [...steam.dockGames]
      : (() => {
          const perfectIds = new Set((steam.perfectGames || []).map((game) => game.appId));
          return (steam.topGames || []).filter((game) => !perfectIds.has(game.appId));
        })();

    if (inGame) {
      const matchIndex = games.findIndex((game) => this.isPlayingGame(game, presence));
      if (matchIndex >= 0) {
        const [match] = games.splice(matchIndex, 1);
        games.unshift({ ...match, live: true });
      } else {
        games.unshift({
          appId: presence.gameId || null,
          name: presence.gameName,
          hours: '—',
          achievementsUnlocked: 0,
          achievementsTotal: 0,
          live: true,
        });
      }
    }

    return games.slice(0, displayCount);
  }

  static trophyEntryMeta(game, maxNameChars = 36) {
    const total = game.achievementsTotal ?? 0;
    const unlocked = game.achievementsUnlocked ?? total;
    const name = this.truncate(game.name, maxNameChars);
    const perfectLabel = total > 0 ? `${unlocked}/${total} Perfect` : 'Perfect';
    const crownW = 11;
    const gap = 4;
    const nameW = name.length * 6.05;
    const perfectW = perfectLabel.length * 5.45;
    const width = crownW + gap + nameW + gap + perfectW;

    return {
      name,
      perfectLabel,
      width,
      markup: `<tspan class="game-trophy-crown">♔</tspan><tspan dx="4">${this.escapeXml(name)}</tspan><tspan class="game-trophy-perfect" dx="4">${perfectLabel}</tspan>`,
    };
  }

  static renderTrophyLine(perfectGames, x, y, rightX = x + 576, scrollSeconds = 18) {
    if (!perfectGames.length) {
      return '';
    }

    const labelWidth = 118;
    const contentX = x + labelWidth;
    const clipW = Math.max(40, rightX - contentX);
    const clipId = 'trophy-case-clip';
    const sepW = 22;
    const entries = perfectGames.map((game) => this.trophyEntryMeta(game));

    let segment = [...entries];
    let segmentWidth = segment.reduce((sum, entry, i) => sum + entry.width + (i > 0 ? sepW : 0), 0) + sepW;
    while (segmentWidth < clipW + 40) {
      segment = segment.concat(entries);
      segmentWidth = segment.reduce((sum, entry, i) => sum + entry.width + (i > 0 ? sepW : 0), 0) + sepW;
    }

    const renderSegment = (startX) => {
      let cursor = startX;
      const parts = [];
      segment.forEach((entry) => {
        parts.push(`<text x="${cursor.toFixed(1)}" y="${y}" class="gaming-trophy">${entry.markup}</text>`);
        cursor += entry.width;
        parts.push(
          `<text x="${cursor.toFixed(1)}" y="${y}" class="gaming-trophy muted">·</text>`,
        );
        cursor += sepW;
      });
      return parts.join('');
    };

    // scrollSeconds ≈ time to move ~400px; scales with chain length for steady speed
    const dur = Math.max(8, Number(scrollSeconds) * (segmentWidth / 400)).toFixed(1);

    const label = `<text x="${x}" y="${y}" class="gaming-trophy"><tspan class="game-trophy-label">TROPHY CASE</tspan><tspan class="muted" dx="10">·</tspan></text>`;
    const clip = `<defs><clipPath id="${clipId}"><rect x="${contentX}" y="${y - 12}" width="${clipW}" height="18" /></clipPath></defs>`;
    const track = `
      <g clip-path="url(#${clipId})">
        <g>
          <animateTransform attributeName="transform" type="translate" from="0 0" to="${(-segmentWidth).toFixed(1)} 0" dur="${dur}s" repeatCount="indefinite" />
          ${renderSegment(contentX)}
          ${renderSegment(contentX + segmentWidth)}
        </g>
      </g>`;

    return `${label}${clip}${track}`;
  }

  static renderFooter(syncTime, commitHash, bootLine, achievement = null) {
    const achievementPart = achievement
      ? `<tspan class="achievement-toast">achievement unlocked: ${this.escapeXml(achievement)} · <animate attributeName="opacity" values="0.55;1;0.55" dur="1.4s" repeatCount="indefinite" /></tspan>`
      : '';
    return `${achievementPart}build ${commitHash} · synced ${syncTime} NPT · ${bootLine} · <tspan class="cursor">█</tspan>`;
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
