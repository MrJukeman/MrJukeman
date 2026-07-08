import fetch from 'node-fetch';
import Cache from '../Cache.js';
import ConfigLoader from '../ConfigLoader.js';

const API_BASE = 'https://api.steampowered.com';
const PERFECT_SCAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const ACHIEVEMENT_CONCURRENCY = 6;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatPlaytime(minutes) {
  const hours = minutes / 60;
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k`;
  }
  if (hours >= 100) {
    return String(Math.round(hours));
  }
  if (hours >= 10) {
    return String(Math.round(hours));
  }
  return hours.toFixed(1);
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

class SteamProvider {
  constructor() {
    const config = ConfigLoader.load();
    this.apiKey = (process.env.STEAM_API_KEY || '').trim();
    this.vanityUrl = (
      process.env.STEAM_VANITY_URL ||
      process.env.STEAM_ID ||
      config.steam?.vanityUrl ||
      ''
    ).trim();
    this.profileUrl =
      config.steam?.profileUrl || `https://steamcommunity.com/id/${this.vanityUrl}/games/?tab=perfect`;
    this.topCount = config.steam?.topCount ?? 4;
    this.perfectCount = config.steam?.perfectCount ?? 4;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.vanityUrl);
  }

  async collect() {
    if (!this.isConfigured()) {
      return this.offlinePayload('steam api not configured');
    }

    try {
      const steamId = await this.resolveSteamId();
      const ownedGames = await this.fetchOwnedGames(steamId);
      const topGames = this.pickTopGames(ownedGames);
      const perfectScan = await this.resolvePerfectGames(steamId, ownedGames);
      const perfectGames = perfectScan.games;

      return {
        status: 'online',
        profileUrl: this.profileUrl,
        topGames,
        perfectGames: perfectGames.slice(0, this.perfectCount),
        perfectTotal: perfectGames.length,
        perfectGamesAll: perfectGames,
        lastPerfectScan: perfectScan.lastPerfectScan,
      };
    } catch (error) {
      console.warn('Steam API error:', error.message || error);
      const cached = Cache.read()?.steam;
      if (cached?.topGames?.length) {
        return { ...cached, status: 'cached', profileUrl: this.profileUrl };
      }
      return this.offlinePayload(error.message || 'steam unavailable');
    }
  }

  offlinePayload(message) {
    return {
      status: 'offline',
      profileUrl: this.profileUrl,
      topGames: [],
      perfectGames: [],
      perfectTotal: 0,
      message,
    };
  }

  async apiGet(path, params = {}) {
    const query = new URLSearchParams({ key: this.apiKey, ...params });
    const url = `${API_BASE}${path}?${query}`;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
      if (attempt === 4) {
        throw new Error(`Steam API ${response.status} for ${path}`);
      }
      await sleep(2 ** attempt * 500);
    }
    return null;
  }

  async resolveSteamId() {
    if (/^\d{17}$/.test(this.vanityUrl)) {
      return this.vanityUrl;
    }

    const data = await this.apiGet('/ISteamUser/ResolveVanityURL/v0001/', {
      vanityurl: this.vanityUrl,
    });

    if (data?.response?.success !== 1) {
      throw new Error(`could not resolve steam vanity "${this.vanityUrl}"`);
    }

    return data.response.steamid;
  }

  async fetchOwnedGames(steamId) {
    const data = await this.apiGet('/IPlayerService/GetOwnedGames/v0001/', {
      steamid: steamId,
      include_appinfo: 1,
      include_played_free_games: 1,
      include_free_sub: 0,
    });

    const games = data?.response?.games;
    if (!Array.isArray(games) || games.length === 0) {
      throw new Error('no public game library found — set profile game details to public');
    }

    return games;
  }

  pickTopGames(games) {
    return [...games]
      .filter((game) => game.playtime_forever > 0)
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, this.topCount)
      .map((game) => ({
        appId: game.appid,
        name: game.name,
        hours: formatPlaytime(game.playtime_forever),
        minutes: game.playtime_forever,
      }));
  }

  async resolvePerfectGames(steamId, games) {
    const cache = Cache.read();
    const lastScan = cache?.steam?.lastPerfectScan ? Date.parse(cache.steam.lastPerfectScan) : 0;
    const freshEnough = Date.now() - lastScan < PERFECT_SCAN_INTERVAL_MS;

    if (freshEnough && Array.isArray(cache?.steam?.perfectGamesAll) && cache.steam.perfectGamesAll.length) {
      return {
        games: cache.steam.perfectGamesAll,
        lastPerfectScan: cache.steam.lastPerfectScan,
        fromCache: true,
      };
    }

    const candidates = [...games].sort((a, b) => b.playtime_forever - a.playtime_forever);
    const perfect = [];

    await mapPool(candidates, ACHIEVEMENT_CONCURRENCY, async (game) => {
      const complete = await this.isGamePerfect(steamId, game.appid);
      if (complete) {
        perfect.push({
          appId: game.appid,
          name: game.name,
          hours: formatPlaytime(game.playtime_forever),
        });
      }
    });

    perfect.sort((a, b) => a.name.localeCompare(b.name));

    return {
      games: perfect,
      lastPerfectScan: new Date().toISOString(),
      fromCache: false,
    };
  }

  async isGamePerfect(steamId, appId) {
    try {
      const data = await this.apiGet('/ISteamUserStats/GetPlayerAchievements/v1/', {
        steamid: steamId,
        appid: appId,
        l: 'english',
      });

      const achievements = data?.playerstats?.achievements;
      if (!Array.isArray(achievements) || achievements.length === 0) {
        return false;
      }

      return achievements.every((entry) => entry.achieved === 1);
    } catch {
      return false;
    }
  }
}

export default SteamProvider;
