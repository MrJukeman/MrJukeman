import GitHubProvider from './providers/GitHubProvider.js';
import Cache from './Cache.js';

class Statistics {
  constructor(username, accessToken) {
    this.username = username;
    this.provider = new GitHubProvider(username, accessToken);
  }

  async getUserStatistics() {
    try {
      const stats = await this.provider.collect();
      const previous = Cache.read();
      const deltas = Cache.computeDeltas(stats.raw, previous?.raw ?? previous);
      Cache.write({ raw: stats.raw });

      return { ...stats, deltas };
    } catch (error) {
      console.error('Error:', error.message || error);
      return null;
    }
  }
}

export default Statistics;
