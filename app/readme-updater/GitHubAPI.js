import fetch from 'node-fetch';
import { sleep } from '../../helpers/async.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;

class GitHubAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async fetchUserData(username) {
    const url = `https://api.github.com/users/${username}`;
    const options = {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    };
    return this.fetchGitHubAPI(url, options);
  }

  async fetchGraphQL(query, variables) {
    const url = 'https://api.github.com/graphql';
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    };
    return this.fetchGitHubAPI(url, options);
  }

  async fetchGitHubAPI(url, options) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          return response.json();
        }

        const status = response.status;
        const body = await response.text();
        lastError = new Error(`GitHub API ${status} for ${url}: ${body.slice(0, 200)}`);

        if (!RETRYABLE_STATUS.has(status) || attempt === MAX_ATTEMPTS) {
          throw lastError;
        }

        const retryAfter = Number(response.headers.get('retry-after'));
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
        console.warn(`GitHub API ${status} — retry ${attempt}/${MAX_ATTEMPTS} in ${delayMs}ms`);
        await sleep(delayMs);
      } catch (error) {
        lastError = error;
        if (attempt === MAX_ATTEMPTS) {
          throw error;
        }
        const delayMs = 2 ** attempt * 1000;
        console.warn(`GitHub API network error — retry ${attempt}/${MAX_ATTEMPTS} in ${delayMs}ms`);
        await sleep(delayMs);
      }
    }

    throw lastError;
  }

  async fetchContributorStats(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors`;
    const options = {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    };

    for (let attempt = 1; attempt <= 12; attempt += 1) {
      const response = await fetch(url, options);

      if (response.status === 202) {
        const delayMs = Math.min(attempt * 2000, 12000);
        console.warn(`Contributor stats computing for ${owner}/${repo} — retry in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }

      if (response.status === 404 || response.status === 204) {
        return [];
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`GitHub contributor stats ${response.status} for ${owner}/${repo}: ${body.slice(0, 120)}`);
      }

      const body = await response.text();
      if (!body.trim()) {
        return [];
      }

      return JSON.parse(body);
    }

    console.warn(`Contributor stats timed out for ${owner}/${repo}`);
    return [];
  }
}

export default GitHubAPI;
