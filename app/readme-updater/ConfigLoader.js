import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../../resources/config/aryaos.json');

let cachedConfig = null;

class ConfigLoader {
  static load() {
    if (!cachedConfig) {
      cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return cachedConfig;
  }
}

export default ConfigLoader;
