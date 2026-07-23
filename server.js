import fs from 'fs';
import dotenv from 'dotenv';
import Statistics from './app/readme-updater/Statistics.js';
import SvgUpdater from './app/readme-updater/SvgUpdater.js';
import PresenceUpdater from './app/readme-updater/PresenceUpdater.js';
import { getNptTimestamp } from './helpers/functions.js';

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

function writeSyncMetadata(extra = {}) {
  const payload = { date: new Date().toISOString(), npt: getNptTimestamp(), ...extra };
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/date.json', JSON.stringify(payload, null, 2));
}

(async () => {
  const { username, accessToken } = resolveCredentials();

  if (!username || !accessToken) {
    console.error('Missing GitHub credentials.');
    console.error('Set GITHUB_USERNAME + GITHUB_ACCESS_TOKEN (locally in .env, in Actions via secrets).');
    process.exit(1);
  }

  const { default: ConfigLoader } = await import('./app/readme-updater/ConfigLoader.js');
  await ConfigLoader.init();

  const collector = new Statistics(username, accessToken);
  const stats = await collector.getUserStatistics();

  if (!stats) {
    console.error('Live telemetry sync failed — no SVG was generated.');
    process.exit(1);
  }

  SvgUpdater.updateSVG(stats, username, {
    newAchievement: stats.newAchievement,
  });
  PresenceUpdater.writeSteamCache(stats.steam || {});
  writeSyncMetadata({ presence: stats.steam?.presence || null });
  console.log(`AryaOS SVG kernel rebuilt successfully for @${username}.`);
})();
