import fetch from 'node-fetch';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
}

export default GitHubAPI;
