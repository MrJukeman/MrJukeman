import dotenv from 'dotenv';
import PresenceUpdater from './app/readme-updater/PresenceUpdater.js';

dotenv.config();

(async () => {
  try {
    const result = await PresenceUpdater.sync();
    console.log(`Steam presence synced: ${result.label}${result.changed ? ' (updated)' : ' (unchanged)'}`);
    process.exit(0);
  } catch (error) {
    console.error('Presence sync failed:', error.message || error);
    process.exit(1);
  }
})();
