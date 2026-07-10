import fs from 'fs';
import path from 'path';
import ConfigLoader from './ConfigLoader.js';

const META_PATH = path.join('dist', 'meta.json');

class AchievementTracker {
  static loadMeta() {
    try {
      if (fs.existsSync(META_PATH)) {
        return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
      }
    } catch {
      return { stats: {}, achievements: {} };
    }
    return { stats: {}, achievements: {} };
  }

  static saveMeta(meta) {
    fs.mkdirSync(path.dirname(META_PATH), { recursive: true });
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
  }

  static getDefinitions() {
    return ConfigLoader.load().achievements ?? [];
  }

  static buildSnapshot(stats = {}, steam = {}) {
    return {
      totalRepos: stats.raw?.totalRepos ?? 0,
      totalContributions: stats.raw?.totalContributions ?? 0,
      followers: stats.raw?.followers ?? 0,
      totalStars: stats.raw?.totalStars ?? 0,
      totalCommits: stats.raw?.totalCommits ?? 0,
      currentStreak: stats.raw?.currentStreak ?? stats.currentStreak ?? 0,
      longestStreak: stats.raw?.longestStreak ?? stats.longestStreak ?? 0,
      perfectTotal: steam.perfectTotal ?? 0,
    };
  }

  static computeDeltas(current, previous = {}) {
    const deltas = {};
    for (const [key, value] of Object.entries(current)) {
      if (typeof value !== 'number' || previous[key] === undefined) {
        continue;
      }
      const delta = value - previous[key];
      if (delta !== 0) {
        deltas[key] = delta;
      }
    }
    return deltas;
  }

  static evaluate(current, previousAchievements = {}, hadPreviousStats = false) {
    const definitions = this.getDefinitions();
    const unlocked = { ...previousAchievements };
    const newlyUnlocked = [];

    for (const achievement of definitions) {
      const hadBefore = Boolean(previousAchievements[achievement.id]);
      const value = current[achievement.field] ?? 0;

      if (value >= achievement.threshold) {
        if (!hadBefore) {
          unlocked[achievement.id] = new Date().toISOString();
          if (hadPreviousStats) {
            newlyUnlocked.push(achievement);
          }
        }
      }
    }

    return { unlocked, newlyUnlocked };
  }

  static process(stats, steam = {}) {
    const previous = this.loadMeta();
    const hadPreviousStats = Boolean(previous.stats && Object.keys(previous.stats).length);
    const current = this.buildSnapshot(stats, steam);
    const deltas = this.computeDeltas(current, previous.stats || {});
    const { unlocked, newlyUnlocked } = this.evaluate(
      current,
      previous.achievements || {},
      hadPreviousStats,
    );

    const meta = {
      stats: current,
      achievements: unlocked,
      lastSync: new Date().toISOString(),
    };

    this.saveMeta(meta);

    return {
      deltas,
      newAchievement: newlyUnlocked[0]?.label || null,
    };
  }
}

export default AchievementTracker;
