import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '../../dist/stats-cache.json');

class Cache {
  static read() {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      }
    } catch {
      return null;
    }
    return null;
  }

  static write(stats) {
    const payload = {
      ...stats,
      syncedAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2));
    return payload;
  }

  static hasUsableData(cache) {
    return Boolean(cache?.raw && Number(cache.raw.totalContributions) > 0);
  }

  static computeDeltas(current, previous) {
    if (!previous) {
      return {};
    }

    const numericKeys = [
      'totalRepos',
      'totalContributions',
      'followers',
      'totalStars',
      'totalCommits',
      'totalAdditions',
      'totalDeletions',
      'totalLinesChanged',
      'currentStreak',
      'longestStreak',
    ];

    const deltas = {};
    for (const key of numericKeys) {
      const curr = Number(current[key]);
      const prev = Number(previous[key]);
      if (!Number.isNaN(curr) && !Number.isNaN(prev) && curr !== prev) {
        deltas[key] = curr - prev;
      }
    }
    return deltas;
  }
}

export default Cache;
