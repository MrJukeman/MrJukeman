import dotenv from 'dotenv';
import ConfigLoader from './app/readme-updater/ConfigLoader.js';
import PresenceUpdater from './app/readme-updater/PresenceUpdater.js';

dotenv.config();

(async () => {
  try {
    await ConfigLoader.init();
    const result = await PresenceUpdater.sync();
    console.log(`Steam presence synced: ${result.label}${result.changed ? ' (updated)' : ' (unchanged)'}`);
    process.exit(0);
  } catch (error) {
    console.error('Presence sync failed:', error.message || error);
    process.exit(1);
  }
})();
