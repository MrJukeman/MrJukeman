import fs from 'fs';
import dotenv from 'dotenv';
import Statistics from './app/readme-updater/Statistics.js';
import SvgUpdater from './app/readme-updater/SvgUpdater.js';
import Cache from './app/readme-updater/Cache.js';
import { formatNumber, getNptTimestamp } from './helpers/functions.js';

dotenv.config();

function resolveCredentials() {
  const username =
    process.env.GITHUB_USERNAME ||
    process.env.USERNAME ||
    process.env.GH_USERNAME ||
    '';

  const accessToken =
    process.env.GITHUB_ACCESS_TOKEN ||
    process.env.ACCESS_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    '';

  return { username: username.trim(), accessToken: accessToken.trim() };
}

function writeSyncMetadata() {
  const payload = { date: new Date().toISOString(), npt: getNptTimestamp() };
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/date.json', JSON.stringify(payload, null, 2));
}

function emptyHeatmap() {
  return Array.from({ length: 52 }, () => ({
    contributionDays: Array.from({ length: 7 }, () => ({ contributionCount: 0, date: '' })),
  }));
}

function buildStatsFromCache(cache, username) {
  const raw = cache.raw;

  return {
    totalRepos: formatNumber(raw.totalRepos),
    totalContributions: formatNumber(raw.totalContributions),
    followers: formatNumber(raw.followers),
    totalStars: formatNumber(raw.totalStars),
    totalCommits: formatNumber(raw.totalCommits),
    totalAdditions: formatNumber(raw.totalAdditions),
    totalDeletions: formatNumber(raw.totalDeletions),
    totalLinesChanged: formatNumber(raw.totalLinesChanged),
    currentStreak: raw.currentStreak,
    longestStreak: raw.longestStreak,
    velocityPercent: cache.velocityPercent ?? 0,
    velocityTrend: cache.velocityTrend ?? 'flat',
    contributionsThisYear: raw.totalContributions,
    heatmapWeeks: cache.heatmapWeeks ?? emptyHeatmap(),
    languages: cache.languages ?? [],
    events: cache.events ?? ['[kernel] github: using cached telemetry'],
    steam: cache.steam ?? {
      status: 'cached',
      topGames: [],
      perfectGames: [],
      perfectTotal: 0,
      message: 'add STEAM_API_KEY secret',
      profileUrl: 'https://steamcommunity.com/id/MrJukeman/games/?tab=perfect',
    },
    kernelVersion: cache.kernelVersion ?? `6.${new Date().getFullYear()}.${raw.totalContributions}`,
    commitHash: 'cached',
    deltas: {},
    raw,
  };
}

function buildOfflineStats(username) {
  return {
    totalRepos: '0',
    totalContributions: '0',
    followers: '0',
    totalStars: '0',
    totalCommits: '0',
    totalAdditions: '0',
    totalDeletions: '0',
    totalLinesChanged: '0',
    currentStreak: 0,
    longestStreak: 0,
    velocityPercent: 0,
    velocityTrend: 'flat',
    contributionsThisYear: 0,
    heatmapWeeks: emptyHeatmap(),
    languages: [
      { pid: 1337, name: 'typescript', cpu: 42 },
      { pid: 1226, name: 'javascript', cpu: 28 },
      { pid: 1115, name: 'php', cpu: 15 },
    ],
    events: ['[kernel] github: awaiting live telemetry sync'],
    steam: {
      status: 'offline',
      topGames: [],
      perfectGames: [],
      perfectTotal: 0,
      message: 'set STEAM_API_KEY',
      profileUrl: 'https://steamcommunity.com/id/MrJukeman/games/?tab=perfect',
    },
    kernelVersion: `6.${new Date().getFullYear()}.offline`,
    commitHash: 'offline',
    deltas: {},
    raw: {
      totalRepos: 0,
      totalContributions: 0,
      followers: 0,
      totalStars: 0,
      totalCommits: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      totalLinesChanged: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  };
}

(async () => {
  const { username, accessToken } = resolveCredentials();

  if (!username || !accessToken) {
    console.error('Missing GitHub credentials.');
    console.error('Set GITHUB_USERNAME + GITHUB_ACCESS_TOKEN (locally in .env, in Actions via secrets).');
    process.exit(1);
  }

  let stats = null;
  let apiError = null;

  try {
    const collector = new Statistics(username, accessToken);
    stats = await collector.getUserStatistics();
    if (!stats) {
      apiError = 'GitHub API returned no data';
    }
  } catch (error) {
    apiError = error.message || String(error);
    console.error('GitHub API error:', apiError);
  }

  if (!stats) {
    const cache = Cache.read();

    if (Cache.hasUsableData(cache)) {
      console.warn('API unavailable — rebuilding from last successful stats cache.');
      stats = buildStatsFromCache(cache, username);
    } else {
      console.error('No live API data and no usable cache.');
      console.error(apiError || 'Unknown API failure');
      process.exit(1);
    }
  }

  SvgUpdater.updateSVG(stats, username);
  writeSyncMetadata();
  console.log(`AryaOS SVG kernel rebuilt successfully for @${username}.`);
})();
