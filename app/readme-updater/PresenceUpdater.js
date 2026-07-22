import fs from 'fs';
import path from 'path';
import ConfigLoader from './ConfigLoader.js';
import SteamProvider from './providers/SteamProvider.js';
import SvgUpdater from './SvgUpdater.js';
import NavRenderer, { NAV } from './renderers/NavRenderer.js';
import { getNptTimestamp } from '../../helpers/functions.js';

const STEAM_CACHE_PATH = path.join('dist', 'steam-cache.json');
const THEMES = ['dark', 'light'];

class PresenceUpdater {
  static cachePath() {
    return STEAM_CACHE_PATH;
  }

  static writeSteamCache(steam = {}) {
    const payload = {
      status: steam.status || 'offline',
      profileUrl: steam.profileUrl,
      topGames: steam.topGames || [],
      dockGames: steam.dockGames || [],
      perfectGames: steam.perfectGames || [],
      perfectTotal: steam.perfectTotal ?? steam.perfectGames?.length ?? 0,
      totalPlaytimeHours: steam.totalPlaytimeHours || null,
      presence: steam.presence || { state: 'offline', gameName: null },
      updatedAt: new Date().toISOString(),
    };

    fs.mkdirSync(path.dirname(STEAM_CACHE_PATH), { recursive: true });
    fs.writeFileSync(STEAM_CACHE_PATH, JSON.stringify(payload, null, 2));
    return payload;
  }

  static loadSteamCache() {
    if (!fs.existsSync(STEAM_CACHE_PATH)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(STEAM_CACHE_PATH, 'utf8'));
    } catch {
      return null;
    }
  }

  static replaceMarkedSection(svg, name, nextInner) {
    const start = `<!-- ${name}:start -->`;
    const end = `<!-- ${name}:end -->`;
    const startIdx = svg.indexOf(start);
    const endIdx = svg.indexOf(end);
    if (startIdx < 0 || endIdx < 0 || endIdx < startIdx) {
      throw new Error(`missing ${name} markers in SVG — run a full sync first`);
    }
    return `${svg.slice(0, startIdx)}${start}${nextInner}${end}${svg.slice(endIdx + end.length)}`;
  }

  static async sync() {
    const cache = this.loadSteamCache();
    if (!cache) {
      throw new Error('dist/steam-cache.json missing — run full sync (npm start) once first');
    }

    const provider = new SteamProvider();
    const live = await provider.collectPresence();
    const steam = {
      ...cache,
      status: live.status === 'online' ? 'online' : cache.status,
      profileUrl: live.profileUrl || cache.profileUrl,
      presence: live.presence || { state: 'offline', gameName: null },
    };

    const previous = JSON.stringify(cache.presence || {});
    const next = JSON.stringify(steam.presence || {});
    const changed = previous !== next;

    const config = ConfigLoader.load();
    const word3X = NAV.rightCol.word3X;
    const steamStatus = NavRenderer.renderSteamStatus(steam, word3X);
    const gamingDock = SvgUpdater.renderGamingPanel(steam, config)
      .replace(/^<!-- gaming-dock:start -->\s*/, '')
      .replace(/\s*<!-- gaming-dock:end -->$/, '');

    for (const theme of config.themes?.length ? config.themes : THEMES) {
      const file = path.join('dist', `${theme}.svg`);
      if (!fs.existsSync(file)) {
        console.warn(`skip missing ${file}`);
        continue;
      }
      let svg = fs.readFileSync(file, 'utf8');
      svg = this.replaceMarkedSection(svg, 'steam-uplink', steamStatus);
      svg = this.replaceMarkedSection(svg, 'gaming-dock', gamingDock);
      fs.writeFileSync(file, svg);
    }

    this.writeSteamCache(steam);

    const payload = {
      date: new Date().toISOString(),
      npt: getNptTimestamp(),
      presence: steam.presence,
    };
    fs.writeFileSync(path.join('dist', 'date.json'), JSON.stringify(payload, null, 2));

    const label =
      steam.presence?.state === 'in-game' && steam.presence.gameName
        ? `Playing ${steam.presence.gameName}`
        : steam.presence?.state === 'online'
          ? 'Steam Online'
          : 'Steam Offline';

    return { changed, label, presence: steam.presence };
  }
}

export default PresenceUpdater;
