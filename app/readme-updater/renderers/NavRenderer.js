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
    const directive = this.escapeXml(this.truncate(config.profile.kernel, 28));
    const hash = stats.commitHash || 'unknown';
    const profileUrl = `https://github.com/${this.escapeXml(username)}`;
    const { x, y, w, h, padX, rightX, leftValX, rightKeyX, rightValX } = NAV;
    const headerY = y + 22;
    const dividerY = headerY + 10;
    const row1Y = dividerY + 16;
    const row2Y = row1Y + 18;
    const pulseY = y + h - 8;
    const steamClass = steamOnline ? 'addColor' : 'dim';
    const steamLabel = steamOnline ? 'steam online' : 'steam offline';
    const birthday = this.birthdayNote();

    return `
      <g class="nav-group">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" class="panel nav-panel" />
        <text x="${padX}" y="${headerY}" class="section-label">◈ SYSTEM.HEADER</text>
        <text x="${rightX}" y="${headerY}" text-anchor="end" class="gaming-stats">${tagline}${birthday}</text>
        <line x1="${padX}" y1="${dividerY}" x2="${rightX}" y2="${dividerY}" class="gaming-divider" />

        <text y="${row1Y}" class="row">
          <tspan x="${padX}" class="keyColor">Kernel</tspan>
          <tspan x="${leftValX}" class="valueColor">ARYAOS v${version}</tspan>
          <tspan x="${rightKeyX}" class="keyColor">Prime.Directive</tspan>
          <tspan x="${rightValX}" class="valueColor">${directive}</tspan>
        </text>

        <text y="${row2Y}" class="row">
          <tspan x="${padX}" class="keyColor">Operator</tspan>
          <a href="${profileUrl}">
            <tspan x="${leftValX}" class="nav-link">@${this.escapeXml(username)}</tspan>
          </a>
          <tspan x="${rightKeyX}" class="keyColor">Uplink</tspan>
          <tspan x="${rightValX}" class="addColor">●</tspan>
          <tspan class="valueColor" dx="5">live</tspan>
          <tspan class="dim" dx="6">·</tspan>
          <tspan class="valueColor" dx="6">github</tspan>
          <tspan class="dim" dx="6">·</tspan>
          <tspan class="${steamClass}" dx="6">${steamLabel}</tspan>
          <tspan class="dim" dx="6">·</tspan>
          <tspan class="dim" dx="6">${hash}</tspan>
        </text>

        ${this.renderHeartbeat(padX, rightX, pulseY)}
      </g>
    `;
  }

  static birthdayNote() {
    const today = new Date();
    if (today.getMonth() === 4 && today.getDate() === 12) {
      return ' · birthday kernel';
    }
    return '';
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
