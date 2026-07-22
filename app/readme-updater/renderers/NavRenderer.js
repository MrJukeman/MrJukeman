const NAV = {
  x: 28,
  y: 14,
  w: 944,
  h: 82,
  bottom: 96,
  padX: 56,
  rightX: 948,
  leftValX: 172,
  rightKeyX: 538,
  rightValX: 662,
  rightCol: {
    markX: 662,
    word1X: 675,
    dot1X: 711,
    word2X: 725,
    dot2X: 779,
    word3X: 791,
    dot3X: 878,
    word4X: 890,
  },
};

class NavRenderer {
  static escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  static truncate(text, max = 42) {
    const value = String(text);
    if (value.length <= max) {
      return value;
    }
    return `${value.slice(0, max - 1)}…`;
  }

  static render(config, stats, username, sync = {}) {
    const version = stats.kernelVersion;
    const tagline = this.escapeXml(this.truncate(config.profile.tagline, 52));
    const romance = this.renderRomanceCorner(config.romance);
    const hash = stats.commitHash || 'unknown';
    const profileUrl = `https://github.com/${this.escapeXml(username)}`;
    const { x, y, w, h, padX, rightX, leftValX, rightKeyX, rightCol } = NAV;
    const { markX, word1X, dot1X, word2X, dot2X, word3X, dot3X, word4X } = rightCol;
    const headerY = y + 22;
    const dividerY = headerY + 10;
    const row1Y = dividerY + 16;
    const row2Y = row1Y + 18;
    const pulseY = y + h - 8;
    const steamStatus = this.renderSteamStatus(stats.steam, word3X);
    const heartbeatIntensity = this.computeHeartbeatIntensity(stats);
    const heartSync = this.renderHeartSync(markX, row1Y, {
      aryaDuration: sync.aryaDuration,
      aryaHomecomings: sync.aryaHomecomings,
      romancePink: sync.romancePink,
    });

    return `
      <g class="nav-group">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="panel nav-panel" />
        <text x="${padX}" y="${headerY}" class="section-label">◈ SYSTEM.HEADER</text>
        <text x="${rightX}" y="${headerY}" text-anchor="end" class="gaming-stats">${tagline}</text>
        <line x1="${padX}" y1="${dividerY}" x2="${rightX}" y2="${dividerY}" class="gaming-divider" />

        ${heartSync.strike}
        <text y="${row1Y}" class="row">
          <tspan x="${padX}" class="keyColor">Kernel</tspan>
          <tspan x="${leftValX}" class="valueColor">ARYAOS v${version}</tspan>
          <tspan x="${rightKeyX}" class="keyColor nav-romance">${romance.label}</tspan>
          ${heartSync.heart}
          <tspan x="${word1X}" class="nav-romance">${romance.name}</tspan>
          <tspan x="${dot1X}" class="dim">·</tspan>
          <tspan x="${word2X}" class="nav-romance-soft">${romance.note}</tspan>
        </text>

        <text y="${row2Y}" class="row">
          <tspan x="${padX}" class="keyColor">Operator</tspan>
          <a href="${profileUrl}">
            <tspan x="${leftValX}" class="nav-link">@${this.escapeXml(username)}</tspan>
          </a>
          <tspan x="${rightKeyX}" class="keyColor">Uplink</tspan>
          <tspan x="${markX}" class="addColor">●</tspan>
          <tspan x="${word1X}" class="valueColor">Live</tspan>
          <tspan x="${dot1X}" class="dim">·</tspan>
          <tspan x="${word2X}" class="valueColor">GitHub</tspan>
          <tspan x="${dot2X}" class="dim">·</tspan>
          <!-- steam-uplink:start -->${steamStatus}<!-- steam-uplink:end -->
          <tspan x="${dot3X}" class="dim">·</tspan>
          <tspan x="${word4X}" class="dim">${hash}</tspan>
        </text>

        ${this.renderHeartbeat(padX, rightX, pulseY, heartbeatIntensity)}
      </g>
    `;
  }

  static renderHeartSync(markX, rowY, sync = {}) {
    const { aryaDuration: duration, aryaHomecomings } = sync;
    const heart = `<tspan x="${markX}" class="nav-romance heart-beacon">♥</tspan>`;

    if (!duration) {
      return { heart, strike: '' };
    }

    return {
      heart,
      strike: this.renderRomanceHomecomingStrike(rowY, duration, aryaHomecomings),
    };
  }

  static renderRomanceHomecomingStrike(rowY, duration, homecomings = null) {
    const x1 = NAV.rightKeyX;
    const x2 = 848;
    const lineY = rowY + 3;
    const bandY = rowY - 12;
    const bandH = 18;
    const dur = `${duration}s`;
    const arrivals = (Array.isArray(homecomings) && homecomings.length ? homecomings : [0.92])
      .map((t) => Math.max(0.04, Math.min(0.96, Number(t) || 0.92)))
      .sort((a, b) => a - b);

    const keyTimes = ['0'];
    const sheenValues = ['0'];
    const lineOpacity = ['0'];
    const tipOpacity = ['0'];
    const x2Values = [String(x1)];
    const cxValues = [String(x1)];
    const rValues = ['1.2'];
    let last = 0;

    for (const t of arrivals) {
      let appear = Math.max(last + 0.002, t - 0.018);
      let peak = Math.max(appear + 0.002, t);
      let settle = Math.max(peak + 0.002, Math.min(0.997, t + 0.028));
      if (settle >= 0.998) {
        break;
      }
      keyTimes.push(appear.toFixed(4), peak.toFixed(4), settle.toFixed(4));
      sheenValues.push('0', '0.65', '0');
      lineOpacity.push('0', '0.92', '0');
      tipOpacity.push('0', '1', '0');
      x2Values.push(String(x1), String(x2), String(x2));
      cxValues.push(String(x1), String(x2), String(x2));
      rValues.push('1.2', '2.4', '1.2');
      last = settle;
    }

    keyTimes.push('1');
    sheenValues.push('0');
    lineOpacity.push('0');
    tipOpacity.push('0');
    x2Values.push(String(x1));
    cxValues.push(String(x1));
    rValues.push('1.2');

    const kt = keyTimes.join(';');

    return `
      <g class="romance-homecoming" style="pointer-events:none">
        <defs>
          <linearGradient id="homecoming-sheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#FFD700" stop-opacity="0" />
            <stop offset="42%" stop-color="#FFF4A3" stop-opacity="0.5" />
            <stop offset="58%" stop-color="#FFD700" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#FFD700" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect x="${x1}" y="${bandY}" width="${x2 - x1}" height="${bandH}" rx="4" fill="url(#homecoming-sheen)" opacity="0">
          <animate attributeName="opacity" values="${sheenValues.join(';')}" keyTimes="${kt}" dur="${dur}" repeatCount="indefinite" />
        </rect>
        <line x1="${x1}" y1="${lineY}" x2="${x1}" y2="${lineY}" class="romance-strike-line" stroke="#FFD700" stroke-width="1.2" stroke-linecap="round" opacity="0">
          <animate attributeName="x2" values="${x2Values.join(';')}" keyTimes="${kt}" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="opacity" values="${lineOpacity.join(';')}" keyTimes="${kt}" dur="${dur}" repeatCount="indefinite" />
        </line>
        <circle cx="${x1}" cy="${lineY}" r="2.1" fill="#FFF4A3" opacity="0">
          <animate attributeName="cx" values="${cxValues.join(';')}" keyTimes="${kt}" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="opacity" values="${tipOpacity.join(';')}" keyTimes="${kt}" dur="${dur}" repeatCount="indefinite" />
          <animate attributeName="r" values="${rValues.join(';')}" keyTimes="${kt}" dur="${dur}" repeatCount="indefinite" />
        </circle>
      </g>
    `;
  }

  static renderSteamStatus(steam = {}, word3X) {
    const presence = steam.presence || {};
    const online = steam.status === 'online';

    if (presence.state === 'in-game' && presence.gameName) {
      const game = this.escapeXml(this.truncate(presence.gameName, 16));
      return `<tspan x="${word3X}" class="valueColor">Playing </tspan><tspan class="addColor">${game}</tspan>`;
    }

    const stateClass = online ? 'addColor' : 'dim';
    const stateLabel = online ? 'Online' : 'Offline';
    return `<tspan x="${word3X}" class="valueColor">Steam </tspan><tspan class="${stateClass}">${stateLabel}</tspan>`;
  }

  static computeHeartbeatIntensity(stats = {}) {
    const streak = stats.currentStreak ?? stats.raw?.currentStreak ?? 0;
    const today = stats.todayContributions ?? 0;
    const inGame = stats.steam?.presence?.state === 'in-game';

    if (streak === 0 && today === 0 && !inGame) {
      return 0.18;
    }

    const streakBoost = Math.min(streak / 21, 0.45);
    const todayBoost = Math.min(today / 8, 0.35);
    const playBoost = inGame ? 0.22 : 0;
    return Math.min(1, 0.28 + streakBoost + todayBoost + playBoost);
  }

  static renderRomanceCorner(romance = {}) {
    return {
      label: this.escapeXml(romance.label || 'Heart.Corner'),
      name: this.escapeXml(this.truncate(romance.name || 'you', 4)),
      note: this.escapeXml(this.truncate(romance.note || 'always', 18)),
    };
  }

  static renderHeartbeat(startX, endX, y, intensity = 0.5) {
    const spike = Math.max(2, Math.round(7 * intensity));
    const minor = Math.max(1, Math.round(4 * intensity));
    const beats = [];
    let cx = startX;

    while (cx < endX - 24) {
      beats.push(`${cx},${y}`);
      cx += 20;
      beats.push(`${cx},${y}`);
      cx += 5;
      beats.push(`${cx},${y - minor}`);
      cx += 5;
      beats.push(`${cx},${y + Math.round(minor * 1.2)}`);
      cx += 5;
      beats.push(`${cx},${y - spike}`);
      cx += 5;
      beats.push(`${cx},${y + Math.round(minor * 0.8)}`);
      cx += 5;
      beats.push(`${cx},${y}`);
      cx += 16;
    }
    beats.push(`${endX},${y}`);

    const opacity = (0.22 + intensity * 0.28).toFixed(2);
    const dotOpacity = (0.45 + intensity * 0.55).toFixed(2);

    return `
      <polyline points="${beats.join(' ')}" class="nav-heartbeat" fill="none" opacity="${opacity}" />
      <circle cx="${startX + 10}" cy="${y}" r="${intensity > 0.4 ? 2.8 : 2.2}" class="nav-heartbeat-dot" opacity="${dotOpacity}">
        <animate attributeName="opacity" values="${dotOpacity};1;${dotOpacity}" dur="${(1.8 - intensity * 0.4).toFixed(1)}s" repeatCount="indefinite" />
      </circle>
    `;
  }
}

export { NAV };
export default NavRenderer;
