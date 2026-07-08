import fs from 'fs';
import dotenv from 'dotenv';
import Statistics from './app/readme-updater/Statistics.js';
import SvgUpdater from './app/readme-updater/SvgUpdater.js';
import Cache from './app/readme-updater/Cache.js';
import { getNptTimestamp } from './helpers/functions.js';

dotenv.config();

function writeSyncMetadata() {
  const payload = { date: new Date().toISOString(), npt: getNptTimestamp() };
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/date.json', JSON.stringify(payload, null, 2));
}

function buildFallbackStats() {
  const cached = Cache.read();
  const raw = cached?.raw ?? {
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
  };

  return {
    totalRepos: String(raw.totalRepos),
    totalContributions: String(raw.totalContributions),
    followers: String(raw.followers),
    totalStars: String(raw.totalStars),
    totalCommits: String(raw.totalCommits),
    totalAdditions: String(raw.totalAdditions),
    totalDeletions: String(raw.totalDeletions),
    totalLinesChanged: String(raw.totalLinesChanged),
    currentStreak: raw.currentStreak,
    longestStreak: raw.longestStreak,
    velocityPercent: 0,
    velocityTrend: 'flat',
    contributionsThisYear: raw.totalContributions,
    heatmapWeeks: Array.from({ length: 52 }, () => ({
      contributionDays: Array.from({ length: 7 }, () => ({ contributionCount: 0, date: '' })),
    })),
    languages: [
      { pid: 1337, name: 'typescript', cpu: 42 },
      { pid: 1226, name: 'javascript', cpu: 28 },
      { pid: 1115, name: 'php', cpu: 15 },
    ],
    events: ['[kernel] github: awaiting live telemetry sync'],
    kernelVersion: `6.${new Date().getFullYear()}.offline`,
    commitHash: 'offline',
    deltas: {},
    raw,
  };
}

(async () => {
  const githubUsername = process.env.GITHUB_USERNAME;
  const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN;

  let stats = null;

  if (githubUsername && githubAccessToken) {
    const collector = new Statistics(githubUsername, githubAccessToken);
    stats = await collector.getUserStatistics();
  }

  if (!stats) {
    console.warn('Using fallback stats — set GITHUB_USERNAME and GITHUB_ACCESS_TOKEN in .env for live data.');
    stats = buildFallbackStats();
  }

  SvgUpdater.updateSVG(stats, githubUsername || 'MrJukeman');
  writeSyncMetadata();
  console.log('AryaOS SVG kernel rebuilt successfully.');
})();
