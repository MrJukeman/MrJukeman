import fetch from 'node-fetch';
import ConfigLoader from '../ConfigLoader.js';
import { mapPool, sleep } from '../../../helpers/async.js';

const API_BASE = 'https://api.steampowered.com';
const ACHIEVEMENT_CONCURRENCY = 4;

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
      const [ownedGames, presence] = await Promise.all([
        this.fetchOwnedGames(steamId),
        this.fetchPresence(steamId),
      ]);
      const topGames = this.pickTopGames(ownedGames);
      const perfectGames = await this.scanPerfectGames(steamId, ownedGames);
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
        perfectGames,
        perfectTotal: perfectGames.length,
        totalPlaytimeHours: formatPlaytime(totalPlaytimeMinutes),
        presence,
      };
    } catch (error) {
      console.warn('Steam API error:', error.message || error);
      return this.offlinePayload(error.message || 'steam unavailable');
    }
  }

  /** Lightweight presence-only fetch for frequent README uplinks. */
  async collectPresence() {
    if (!this.isConfigured()) {
      return {
        status: 'offline',
        profileUrl: this.profileUrl,
        presence: { state: 'offline', gameName: null },
        message: 'steam api not configured',
      };
    }

    try {
      const steamId = await this.resolveSteamId();
      const presence = await this.fetchPresence(steamId);
      return {
        status: 'online',
        profileUrl: this.profileUrl,
        presence,
      };
    } catch (error) {
      console.warn('Steam presence error:', error.message || error);
      return {
        status: 'offline',
        profileUrl: this.profileUrl,
        presence: { state: 'offline', gameName: null },
        message: error.message || 'steam unavailable',
      };
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
      presence: { state: 'offline', gameName: null },
      message,
    };
  }

  async fetchPresence(steamId) {
    const data = await this.apiGet('/ISteamUser/GetPlayerSummaries/v0002/', {
      steamids: steamId,
    });

    const player = data?.response?.players?.[0];
    if (!player) {
      return { state: 'offline', gameName: null };
    }

    if (player.gameextrainfo) {
      return {
        state: 'in-game',
        gameName: player.gameextrainfo,
        gameId: player.gameid || null,
      };
    }

    const onlineStates = new Set([1, 2, 3, 4, 5, 6]);
    if (onlineStates.has(player.personastate)) {
      return { state: 'online', gameName: null };
    }

    return { state: 'offline', gameName: null };
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
      }));
  }

  async buildDockGames(steamId, ownedGames, perfectIds) {
    const candidates = [...ownedGames]
      .filter((game) => game.playtime_forever > 0 && !perfectIds.has(game.appid))
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, this.displayCount);

    return mapPool(candidates, ACHIEVEMENT_CONCURRENCY, async (game) => {
      const status = await this.getAchievementStatus(steamId, game.appid);
      const total = status.total || 0;
      const unlocked = status.unlocked || 0;

      return {
        appId: game.appid,
        name: game.name,
        hours: formatPlaytime(game.playtime_forever),
        achievementsUnlocked: unlocked,
        achievementsTotal: total,
      };
    });
  }

  async scanPerfectGames(steamId, games) {
    const candidates = this.buildPerfectCandidates(games);
    const perfect = [];

    await mapPool(candidates, ACHIEVEMENT_CONCURRENCY, async (game) => {
      const status = await this.getAchievementStatus(steamId, game.appid);
      if (status.perfect) {
        perfect.push({
          appId: game.appid,
          name: game.name,
          hours: formatPlaytime(game.playtime_forever),
          achievementsUnlocked: status.unlocked,
          achievementsTotal: status.total,
          perfectedAt: status.perfectedAt || 0,
        });
      }
    });

    // Latest perfected first (by last achievement unlock time)
    perfect.sort((a, b) => (b.perfectedAt || 0) - (a.perfectedAt || 0));

    return perfect;
  }

  buildPerfectCandidates(games) {
    const byAppId = new Map();

    for (const game of games) {
      byAppId.set(game.appid, game);
    }

    for (const appId of this.extraPerfectAppIds) {
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
          return { perfect: false, unlocked: 0, total: 0, perfectedAt: 0 };
        }

        const unlockedEntries = playerAchievements.filter(isAchievementUnlocked);
        const unlocked = unlockedEntries.length;
        const total = playerAchievements.length;
        const allPlayerUnlocked = unlocked === total;
        const perfectedAt = unlockedEntries.reduce(
          (latest, entry) => Math.max(latest, Number(entry.unlocktime) || 0),
          0,
        );

        if (!allPlayerUnlocked) {
          return { perfect: false, unlocked, total, perfectedAt: 0 };
        }

        try {
          const schemaData = await this.apiGet('/ISteamUserStats/GetSchemaForGame/v2/', {
            appid: appId,
            l: 'english',
          });
          const schemaAchievements = schemaData?.game?.availableGameStats?.achievements;
          if (Array.isArray(schemaAchievements) && schemaAchievements.length > 0) {
            const schemaTotal = schemaAchievements.length;
            const unlockedByApiName = new Map(
              playerAchievements.map((entry) => [entry.apiname.toLowerCase(), isAchievementUnlocked(entry)]),
            );
            const schemaPerfect = schemaAchievements.every(
              (schemaEntry) => unlockedByApiName.get(schemaEntry.name.toLowerCase()) === true,
            );
            if (schemaPerfect) {
              return { perfect: true, unlocked, total: schemaTotal, perfectedAt };
            }
            if (unlocked >= schemaTotal) {
              return { perfect: true, unlocked, total: schemaTotal, perfectedAt };
            }
            return { perfect: false, unlocked, total: schemaTotal, perfectedAt: 0 };
          }
        } catch {
          return { perfect: allPlayerUnlocked, unlocked, total, perfectedAt };
        }

        return { perfect: allPlayerUnlocked, unlocked, total, perfectedAt };
      } catch {
        if (attempt === 3) {
          return { perfect: false, unlocked: 0, total: 0, perfectedAt: 0 };
        }
        await sleep(2 ** attempt * 400);
      }
    }

    return { perfect: false, unlocked: 0, total: 0, perfectedAt: 0 };
  }
}

export default SteamProvider;
