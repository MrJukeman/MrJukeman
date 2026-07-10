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
      romancePink: sync.romancePink,
    });

    return `
      <g class="nav-group">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="panel nav-panel" />
        <text x="${padX}" y="${headerY}" class="section-label">◈ SYSTEM.HEADER</text>
        <text x="${rightX}" y="${headerY}" text-anchor="end" class="gaming-stats">${tagline}</text>
        <line x1="${padX}" y1="${dividerY}" x2="${rightX}" y2="${dividerY}" class="gaming-divider" />

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
          ${steamStatus}
          <tspan x="${dot3X}" class="dim">·</tspan>
          <tspan x="${word4X}" class="dim">${hash}</tspan>
        </text>

        ${this.renderHeartbeat(padX, rightX, pulseY, heartbeatIntensity)}
      </g>
    `;
  }

  static renderHeartSync(markX, _rowY, sync = {}) {
    const { aryaDuration: duration, romancePink = '#ff7eb6' } = sync;

    if (!duration) {
      return {
        heart: `<tspan x="${markX}" class="nav-romance heart-beacon">♥</tspan>`,
      };
    }

    const fillValues = `${romancePink};${romancePink};#ffd700;#fff4a3;#ffd700;${romancePink}`;

    return {
      heart: `<tspan x="${markX}" class="nav-romance heart-beacon">♥<animate attributeName="fill" values="${fillValues}" keyTimes="0;0.84;0.88;0.92;0.95;1" dur="${duration}s" repeatCount="indefinite" /></tspan>`,
    };
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

    if (streak === 0 && today === 0) {
      return 0.18;
    }

    const streakBoost = Math.min(streak / 21, 0.45);
    const todayBoost = Math.min(today / 8, 0.35);
    return Math.min(1, 0.28 + streakBoost + todayBoost);
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
