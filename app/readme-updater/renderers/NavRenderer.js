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

  static render(config, stats, username) {
    const version = stats.kernelVersion;
    const steamOnline = stats.steam?.status === 'online';
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
    const steamStatus = this.renderSteamStatus(steamOnline, word3X);

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
          <tspan x="${markX}" class="nav-romance">♥</tspan>
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

        ${this.renderHeartbeat(padX, rightX, pulseY)}
      </g>
    `;
  }

  static renderSteamStatus(online, word3X) {
    const stateClass = online ? 'addColor' : 'dim';
    const stateLabel = online ? 'Online' : 'Offline';

    return `<tspan x="${word3X}" class="valueColor">Steam </tspan><tspan class="${stateClass}">${stateLabel}</tspan>`;
  }

  static renderRomanceCorner(romance = {}) {
    return {
      label: this.escapeXml(romance.label || 'Heart.Corner'),
      name: this.escapeXml(this.truncate(romance.name || 'you', 4)),
      note: this.escapeXml(this.truncate(romance.note || 'always', 18)),
    };
  }

  static renderHeartbeat(startX, endX, y) {
    const beats = [];
    let cx = startX;

    while (cx < endX - 24) {
      beats.push(`${cx},${y}`);
      cx += 20;
      beats.push(`${cx},${y}`);
      cx += 5;
      beats.push(`${cx},${y - 4}`);
      cx += 5;
      beats.push(`${cx},${y + 5}`);
      cx += 5;
      beats.push(`${cx},${y - 7}`);
      cx += 5;
      beats.push(`${cx},${y + 3}`);
      cx += 5;
      beats.push(`${cx},${y}`);
      cx += 16;
    }
    beats.push(`${endX},${y}`);

    return `
      <polyline points="${beats.join(' ')}" class="nav-heartbeat" fill="none" />
      <circle cx="${startX + 10}" cy="${y}" r="2.5" class="nav-heartbeat-dot">
        <animate attributeName="opacity" values="0.35;1;0.35" dur="1.6s" repeatCount="indefinite" />
      </circle>
    `;
  }
}

export { NAV };
export default NavRenderer;
