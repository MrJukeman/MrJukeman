import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const ARYAOS_PATH = path.join(ROOT, 'resources/config/aryaos.json');
const DEFAULT_PORTFOLIO_URL = 'https://rajuchoudhary.com.np/api/portfolio';

let cachedConfig = null;
let initPromise = null;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function joinByCategory(skills = [], categories) {
  return skills
    .filter((skill) => categories.includes(skill.category))
    .map((skill) => skill.name)
    .join(' · ');
}

function steamFromPortfolio(portfolio) {
  const steam = (portfolio.socials || []).find((social) => social.id === 'steam');
  if (!steam?.url) return {};

  const match = steam.url.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  return {
    ...(match?.[1] ? { vanityUrl: match[1] } : {}),
    profileUrl: steam.url,
  };
}

function fromPortfolio(portfolio) {
  const identity = portfolio.identity || {};
  const romance = portfolio.personal?.romance || {};
  const skills = portfolio.skills || [];
  const experience = portfolio.experience || [];

  const activeExperience = experience.filter((job) =>
    typeof job.current === 'boolean' ? job.current : !job.end
  );
  const hosts = activeExperience.map((job) => job.company).join(' · ');
  const crewNodes = activeExperience.map((job) => ({
    label: job.company,
  }));

  return {
    profile: {
      birthYear: identity.birthYear,
      os: identity.os,
      kernel: identity.role,
      tagline: identity.tagline,
      ...(hosts ? { hosts } : {}),
    },
    romance: {
      label: romance.label,
      name: romance.name,
      note: romance.note,
    },
    stack: {
      core: joinByCategory(skills, ['language']),
      human: (identity.languages || []).join(' · '),
      framework: joinByCategory(skills, ['framework', 'runtime']),
      database: joinByCategory(skills, ['database']),
      utility: joinByCategory(skills, ['tooling']),
    },
    crew: {
      nodes: crewNodes,
    },
    steam: steamFromPortfolio(portfolio),
  };
}

function mergeDeep(base = {}, overlay = {}) {
  const out = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    if (value === undefined) continue;

    const isObject =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key]);

    out[key] = isObject ? mergeDeep(base[key], value) : value;
  }

  return out;
}

async function fetchPortfolio() {
  const url = process.env.PORTFOLIO_JSON_URL || DEFAULT_PORTFOLIO_URL;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio JSON (${response.status}): ${url}`);
  }

  return response.json();
}

class ConfigLoader {
  static async init() {
    if (cachedConfig) return cachedConfig;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const portfolio = await fetchPortfolio();
      const aryaos = readJson(ARYAOS_PATH);
      cachedConfig = mergeDeep(fromPortfolio(portfolio), aryaos);
      return cachedConfig;
    })();

    try {
      return await initPromise;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  }

  static load() {
    if (!cachedConfig) {
      throw new Error('ConfigLoader.init() must be awaited before ConfigLoader.load()');
    }
    return cachedConfig;
  }

  static reset() {
    cachedConfig = null;
    initPromise = null;
  }
}

export default ConfigLoader;
