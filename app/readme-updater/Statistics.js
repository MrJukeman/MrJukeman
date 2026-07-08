import GitHubProvider from './providers/GitHubProvider.js';
import SteamProvider from './providers/SteamProvider.js';
import Cache from './Cache.js';

class Statistics {
  constructor(username, accessToken) {
    this.username = username;
    this.provider = new GitHubProvider(username, accessToken);
    this.steamProvider = new SteamProvider();
  }

  async getUserStatistics() {
    try {
      const [stats, steam] = await Promise.all([
        this.provider.collect(),
        this.steamProvider.collect(),
      ]);
      const previous = Cache.read();
      const deltas = Cache.computeDeltas(stats.raw, previous?.raw ?? previous);

      Cache.write({
        raw: stats.raw,
        heatmapWeeks: stats.heatmapWeeks,
        languages: stats.languages,
        events: stats.events,
        velocityPercent: stats.velocityPercent,
        velocityTrend: stats.velocityTrend,
        kernelVersion: stats.kernelVersion,
        steam: {
          topGames: steam.topGames,
          perfectGames: steam.perfectGames,
          perfectGamesAll: steam.perfectGamesAll ?? [],
          perfectTotal: steam.perfectTotal ?? 0,
          lastPerfectScan: steam.lastPerfectScan ?? null,
          status: steam.status,
          profileUrl: steam.profileUrl,
        },
      });

      return { ...stats, steam, deltas };
    } catch (error) {
      console.error('Error fetching GitHub stats:', error.message || error);
      if (error.stack) {
        console.error(error.stack);
      }
      return null;
    }
  }
}

export default Statistics;
