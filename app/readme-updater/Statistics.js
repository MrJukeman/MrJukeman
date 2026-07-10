import GitHubProvider from './providers/GitHubProvider.js';
import SteamProvider from './providers/SteamProvider.js';

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

      return { ...stats, steam, deltas: {} };
    } catch (error) {
      console.error('Error fetching live stats:', error.message || error);
      if (error.stack) {
        console.error(error.stack);
      }
      return null;
    }
  }
}

export default Statistics;
