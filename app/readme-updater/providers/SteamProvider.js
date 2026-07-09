import fetch from 'node-fetch';
import Cache from '../Cache.js';
import ConfigLoader from '../ConfigLoader.js';

const API_BASE = 'https://api.steampowered.com';
const PERFECT_SCAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const PERFECT_SCAN_VERSION = 3;
const ACHIEVEMENT_CONCURRENCY = 4;
const ACHIEVEMENT_CHECK_DELAY_MS = 120;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAchievementUnlocked(entry) {
  const value = entry?.achieved;
  return value === 1 || value === true || value === '1';
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
    this.displayCount = config.steam?.displayCount ?? 3;
    this.perfectCount = config.steam?.perfectCount ?? 4;
    this.extraPerfectAppIds = config.steam?.extraPerfectAppIds ?? [];
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
      const perfectIds = new Set(perfectGames.map((game) => game.appId));
      const dockGames = await this.buildDockGames(steamId, ownedGames, perfectIds);
      const totalPlaytimeMinutes = ownedGames.reduce(
        (sum, game) => sum + (game.playtime_forever || 0),
        0,
      );

      return {
        status: 'online',
        profileUrl: this.profileUrl,
        topGames,
        dockGames,
        perfectGames: perfectGames.slice(0, this.perfectCount),
        perfectTotal: perfectGames.length,
        perfectGamesAll: perfectGames,
        totalPlaytimeHours: formatPlaytime(totalPlaytimeMinutes),
        lastPerfectScan: perfectScan.lastPerfectScan,
        perfectScanVersion: perfectScan.perfectScanVersion,
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
      dockGames: [],
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
      include_free_sub: 1,
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

  async buildDockGames(steamId, ownedGames, perfectIds) {
    const candidates = [...ownedGames]
      .filter((game) => game.playtime_forever > 0 && !perfectIds.has(game.appid))
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, this.displayCount);

    const dockGames = [];

    for (const game of candidates) {
      await sleep(ACHIEVEMENT_CHECK_DELAY_MS);
      const status = await this.getAchievementStatus(steamId, game.appid);
      const total = status.total || 0;
      const unlocked = status.unlocked || 0;

      dockGames.push({
        appId: game.appid,
        name: game.name,
        hours: formatPlaytime(game.playtime_forever),
        minutes: game.playtime_forever,
        achievementsUnlocked: unlocked,
        achievementsTotal: total,
        achievementPercent: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      });
    }

    return dockGames;
  }

  async resolvePerfectGames(steamId, games) {
    const cache = Cache.read();
    const lastScan = cache?.steam?.lastPerfectScan ? Date.parse(cache.steam.lastPerfectScan) : 0;
    const scanVersion = cache?.steam?.perfectScanVersion ?? 1;
    const freshEnough =
      scanVersion === PERFECT_SCAN_VERSION &&
      Date.now() - lastScan < PERFECT_SCAN_INTERVAL_MS;

    if (freshEnough && Array.isArray(cache?.steam?.perfectGamesAll) && cache.steam.perfectGamesAll.length) {
      return {
        games: cache.steam.perfectGamesAll,
        lastPerfectScan: cache.steam.lastPerfectScan,
        perfectScanVersion: scanVersion,
        fromCache: true,
      };
    }

    const candidates = this.buildPerfectCandidates(games);
    const perfect = [];

    await mapPool(candidates, ACHIEVEMENT_CONCURRENCY, async (game) => {
      await sleep(ACHIEVEMENT_CHECK_DELAY_MS);
      const status = await this.getAchievementStatus(steamId, game.appid);
      if (status.total > 0) {
        console.log(`Steam achievements: ${game.name} (${game.appid}) ${status.unlocked}/${status.total}`);
      }
      if (status.perfect) {
        perfect.push({
          appId: game.appid,
          name: game.name,
          hours: formatPlaytime(game.playtime_forever),
        });
      }
    });

    perfect.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Steam perfect scan: found ${perfect.length} of ${candidates.length} candidate games`);

    return {
      games: perfect,
      lastPerfectScan: new Date().toISOString(),
      perfectScanVersion: PERFECT_SCAN_VERSION,
      fromCache: false,
    };
  }

  buildPerfectCandidates(games) {
    const cachedPerfect = Cache.read()?.steam?.perfectGamesAll ?? [];
    const extraAppIds = [
      ...this.extraPerfectAppIds,
      ...cachedPerfect.map((game) => game.appId),
    ];
    const byAppId = new Map();

    for (const game of games) {
      byAppId.set(game.appid, game);
    }

    for (const appId of extraAppIds) {
      if (!byAppId.has(appId)) {
        byAppId.set(appId, {
          appid: appId,
          name: `App ${appId}`,
          playtime_forever: 0,
        });
      }
    }

    return [...byAppId.values()].sort((a, b) => b.playtime_forever - a.playtime_forever);
  }

  async getAchievementStatus(steamId, appId) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const playerData = await this.apiGet('/ISteamUserStats/GetPlayerAchievements/v1/', {
          steamid: steamId,
          appid: appId,
          l: 'english',
        });

        const playerAchievements = playerData?.playerstats?.achievements;
        if (!Array.isArray(playerAchievements) || playerAchievements.length === 0) {
          return { perfect: false, unlocked: 0, total: 0 };
        }

        const unlocked = playerAchievements.filter(isAchievementUnlocked).length;
        const total = playerAchievements.length;
        const allPlayerUnlocked = unlocked === total;

        if (!allPlayerUnlocked) {
          return { perfect: false, unlocked, total };
        }

        let schemaTotal = 0;
        try {
          const schemaData = await this.apiGet('/ISteamUserStats/GetSchemaForGame/v2/', {
            appid: appId,
            l: 'english',
          });
          const schemaAchievements = schemaData?.game?.availableGameStats?.achievements;
          if (Array.isArray(schemaAchievements) && schemaAchievements.length > 0) {
            schemaTotal = schemaAchievements.length;
            const unlockedByApiName = new Map(
              playerAchievements.map((entry) => [entry.apiname.toLowerCase(), isAchievementUnlocked(entry)]),
            );
            const schemaPerfect = schemaAchievements.every(
              (schemaEntry) => unlockedByApiName.get(schemaEntry.name.toLowerCase()) === true,
            );
            if (schemaPerfect) {
              return { perfect: true, unlocked, total: schemaTotal };
            }
            if (unlocked >= schemaTotal) {
              return { perfect: true, unlocked, total: schemaTotal };
            }
            return { perfect: false, unlocked, total: schemaTotal };
          }
        } catch {
          // Fall back to player-only completion when schema is unavailable.
        }

        return { perfect: allPlayerUnlocked, unlocked, total };
      } catch {
        if (attempt === 3) {
          return { perfect: false, unlocked: 0, total: 0 };
        }
        await sleep(2 ** attempt * 400);
      }
    }

    return { perfect: false, unlocked: 0, total: 0 };
  }
}

export default SteamProvider;
