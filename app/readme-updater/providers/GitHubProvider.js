import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGithubContributions } from 'github-contributions-counter';
import GitHubAPI from '../GitHubAPI.js';
import ConfigLoader from '../ConfigLoader.js';
import { formatNumber, formatLanguageName } from '../../../helpers/functions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(task, label, attempts = 5) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      const delayMs = 2 ** attempt * 1000;
      console.warn(`${label} failed — retry ${attempt}/${attempts} in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

class GitHubProvider {
  constructor(username, accessToken) {
    this.username = username;
    this.githubAPI = new GitHubAPI(accessToken);
  }

  async collect() {
    const contributionsResponse = await withRetry(
      () =>
        getGithubContributions({
          username: this.username,
          token: this.githubAPI.accessToken,
        }),
      'Contributions API',
    );

    const userData = await this.githubAPI.fetchUserData(this.username);
    const events = await this.fetchRecentEvents();

    let repoStats = {
      totalStars: 0,
      totalCommits: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      repositories: [],
    };

    try {
      repoStats = await this.fetchRepositoryStats();
    } catch (error) {
      console.warn('Repo stats skipped:', error.message || error);
    }

    const calendar =
      contributionsResponse.data.data.user.contributionsCollection.contributionCalendar;
    const { public_repos, followers, owned_private_repos = 0 } = userData;

    const streaks = this.computeStreaks(calendar.weeks);
    const velocity = this.computeVelocity(calendar.weeks);

    let languageRepos = repoStats.repositories;
    try {
      languageRepos = await this.fetchRepositoriesForLanguages();
    } catch (error) {
      console.warn('Full language repo scan failed, using partial set:', error.message || error);
    }

    const languages = this.aggregateLanguages(this.filterLanguageRepos(languageRepos));

    let locStats = { totalAdditions: 0, totalDeletions: 0 };
    try {
      locStats = await this.fetchLocStats();
    } catch (error) {
      console.warn('LOC stats skipped:', error.message || error);
    }

    const commitHash = this.getLatestCommitHash();
    const totalLinesChanged = locStats.totalAdditions + locStats.totalDeletions;

    return {
      totalRepos: formatNumber(public_repos + owned_private_repos),
      totalContributions: formatNumber(calendar.totalContributions),
      followers: formatNumber(followers),
      totalStars: formatNumber(repoStats.totalStars),
      totalCommits: formatNumber(repoStats.totalCommits),
      totalAdditions: formatNumber(locStats.totalAdditions),
      totalDeletions: formatNumber(locStats.totalDeletions),
      totalLinesChanged: formatNumber(totalLinesChanged),
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      velocityPercent: velocity.percent,
      velocityTrend: velocity.trend,
      contributionsThisYear: calendar.totalContributions,
      heatmapWeeks: calendar.weeks,
      languages,
      events,
      kernelVersion: `6.${new Date().getFullYear()}.${calendar.totalContributions}`,
      commitHash,
      raw: {
        totalRepos: public_repos + owned_private_repos,
        totalContributions: calendar.totalContributions,
        followers,
        totalStars: repoStats.totalStars,
        totalCommits: repoStats.totalCommits,
        totalAdditions: locStats.totalAdditions,
        totalDeletions: locStats.totalDeletions,
        totalLinesChanged,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
      },
    };
  }

  async fetchRecentEvents() {
    const url = `https://api.github.com/users/${this.username}/events/public?per_page=4`;
    const options = {
      headers: {
        Authorization: `Bearer ${this.githubAPI.accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    };

    try {
      const data = await this.githubAPI.fetchGitHubAPI(url, options);
      return data.map((event) => this.formatEvent(event)).filter(Boolean);
    } catch {
      return ['[kernel] github: events channel unavailable'];
    }
  }

  formatEvent(event) {
    const ts = (event.created_at || '').slice(11, 19);
    const repo = (event.repo?.name || 'unknown').replace(`${this.username}/`, '');

    switch (event.type) {
      case 'PushEvent': {
        const count = event.payload?.commits?.length || 0;
        return `[${ts}] github: pushed ${count} commit(s) to ${repo}`;
      }
      case 'PullRequestEvent': {
        const action = event.payload?.action || 'updated';
        return `[${ts}] github: PR ${action} on ${repo}`;
      }
      case 'IssuesEvent': {
        const action = event.payload?.action || 'updated';
        return `[${ts}] github: issue ${action} on ${repo}`;
      }
      case 'CreateEvent': {
        const ref = event.payload?.ref_type || 'resource';
        return `[${ts}] github: created ${ref} in ${repo}`;
      }
      case 'WatchEvent':
        return `[${ts}] github: starred ${repo}`;
      default:
        return `[${ts}] github: ${event.type.replace('Event', '').toLowerCase()} on ${repo}`;
    }
  }

  async fetchRepositoryStats() {
    const nodes = await this.fetchAllRepositories();

    let totalStars = 0;
    let totalCommits = 0;

    for (const repo of nodes) {
      totalStars += repo.stargazers.totalCount;
      totalCommits += repo.defaultBranchRef?.target?.history.totalCount || 0;
    }

    return {
      totalStars,
      totalCommits,
      totalAdditions: 0,
      totalDeletions: 0,
      repositories: nodes,
    };
  }

  async fetchAllRepositories() {
    const nodes = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const query = `
        query($username: String!, $cursor: String) {
          user(login: $username) {
            repositories(
              first: 100,
              after: $cursor,
              isFork: false,
              ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
            ) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                name
                isPrivate
                owner {
                  login
                  __typename
                }
                stargazers { totalCount }
                languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
                  edges { size node { name } }
                }
                defaultBranchRef {
                  target {
                    ... on Commit {
                      history { totalCount }
                    }
                  }
                }
              }
            }
          }
        }`;

      const data = await this.githubAPI.fetchGraphQL(query, {
        username: this.username,
        cursor,
      });
      const connection = data.data.user.repositories;

      nodes.push(...connection.nodes);
      hasNextPage = connection.pageInfo.hasNextPage;
      cursor = connection.pageInfo.endCursor;
    }

    return nodes;
  }

  restHeaders() {
    return {
      Authorization: `Bearer ${this.githubAPI.accessToken}`,
      Accept: 'application/vnd.github+json',
    };
  }

  async fetchAllAccessibleReposREST() {
    const repos = [];
    let page = 1;

    while (true) {
      const url =
        `https://api.github.com/user/repos?per_page=100&page=${page}` +
        '&affiliation=owner,organization_member,collaborator&sort=updated';
      const batch = await this.githubAPI.fetchGitHubAPI(url, { headers: this.restHeaders() });

      if (!Array.isArray(batch) || batch.length === 0) {
        break;
      }

      repos.push(...batch);

      if (batch.length < 100) {
        break;
      }

      page += 1;
    }

    return repos;
  }

  async fetchRepoLanguagesREST(owner, name) {
    const url = `https://api.github.com/repos/${owner}/${name}/languages`;
    return this.githubAPI.fetchGitHubAPI(url, { headers: this.restHeaders() });
  }

  async enrichRepoWithLanguages(repo) {
    const owner = repo.owner?.login ?? '';
    const ownerType = repo.owner?.type === 'Organization' ? 'Organization' : 'User';
    let edges = [];

    try {
      const languages = await this.fetchRepoLanguagesREST(owner, repo.name);
      edges = Object.entries(languages).map(([langName, size]) => ({
        size,
        node: { name: langName },
      }));
    } catch {
      edges = [];
    }

    return {
      name: repo.name,
      isPrivate: repo.private,
      owner: { login: owner, __typename: ownerType },
      languages: { edges },
    };
  }

  async fetchRepositoriesForLanguages() {
    const accessible = await this.fetchAllAccessibleReposREST();
    const nonFork = accessible.filter((repo) => !repo.fork);
    const enriched = [];
    const chunkSize = 10;

    for (let i = 0; i < nonFork.length; i += chunkSize) {
      const chunk = nonFork.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map((repo) => this.enrichRepoWithLanguages(repo)));
      enriched.push(...results);
    }

    return enriched;
  }

  sumContributorWeeks(contributors) {
    const login = this.username.toLowerCase();
    const entry = contributors.find((row) => row.author?.login?.toLowerCase() === login);

    if (!entry) {
      return { additions: 0, deletions: 0 };
    }

    let additions = 0;
    let deletions = 0;

    for (const week of entry.weeks || []) {
      additions += week.a || 0;
      deletions += week.d || 0;
    }

    return { additions, deletions };
  }

  mapRestRepoForFilter(repo) {
    return {
      name: repo.name,
      fork: repo.fork,
      owner: {
        login: repo.owner?.login ?? '',
        __typename: repo.owner?.type === 'Organization' ? 'Organization' : 'User',
      },
    };
  }

  async fetchLocStats() {
    const accessible = await this.fetchAllAccessibleReposREST();
    const repos = this.filterLanguageRepos(
      accessible.filter((repo) => !repo.fork).map((repo) => this.mapRestRepoForFilter(repo)),
    );

    let totalAdditions = 0;
    let totalDeletions = 0;
    const chunkSize = 5;

    for (let i = 0; i < repos.length; i += chunkSize) {
      const chunk = repos.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (repo) => {
          try {
            const contributors = await this.githubAPI.fetchContributorStats(repo.owner.login, repo.name);
            return this.sumContributorWeeks(contributors);
          } catch (error) {
            console.warn(`LOC stats skipped for ${repo.owner.login}/${repo.name}:`, error.message || error);
            return { additions: 0, deletions: 0 };
          }
        }),
      );

      for (const stats of results) {
        totalAdditions += stats.additions;
        totalDeletions += stats.deletions;
      }
    }

    return { totalAdditions, totalDeletions };
  }

  filterLanguageRepos(repositories) {
    const config = ConfigLoader.load();
    const processConfig = config.process ?? {};
    const ownerOnly = processConfig.ownerOnly !== false;
    const exclude = new Set(
      (processConfig.excludeRepos ?? []).map((repo) => repo.trim().toLowerCase()).filter(Boolean),
    );
    const username = this.username.toLowerCase();

    return repositories.filter((repo) => {
      const repoName = (repo.name || '').toLowerCase();
      if (exclude.has(repoName)) {
        return false;
      }

      if (!ownerOnly) {
        return true;
      }

      const ownerLogin = repo.owner?.login?.toLowerCase() ?? '';
      const ownerType = repo.owner?.__typename ?? '';
      return ownerType === 'User' && ownerLogin === username;
    });
  }

  aggregateLanguages(repositories) {
    const totals = {};

    for (const repo of repositories) {
      for (const edge of repo.languages?.edges || []) {
        const key = edge.node.name.toLowerCase();
        totals[key] = (totals[key] || 0) + edge.size;
      }
    }

    const sorted = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, size], index) => ({
      pid: 1000 + index * 111,
      name: formatLanguageName(name),
      cpu: Math.max(1, Math.round((size / max) * 99)),
    }));
  }

  computeStreaks(weeks) {
    const days = weeks.flatMap((week) => week.contributionDays);
    let current = 0;
    let longest = 0;
    let running = 0;

    for (const day of days) {
      if (day.contributionCount > 0) {
        running += 1;
        longest = Math.max(longest, running);
      } else {
        running = 0;
      }
    }

    for (let i = days.length - 1; i >= 0; i -= 1) {
      if (days[i].contributionCount > 0) {
        current += 1;
      } else if (current > 0) {
        break;
      }
    }

    return { current, longest };
  }

  computeVelocity(weeks) {
    const days = weeks.flatMap((week) => week.contributionDays);
    const last7 = days.slice(-7).reduce((sum, d) => sum + d.contributionCount, 0);
    const prev7 = days.slice(-14, -7).reduce((sum, d) => sum + d.contributionCount, 0);

    if (prev7 === 0) {
      return { percent: last7 > 0 ? 100 : 0, trend: last7 > 0 ? 'up' : 'flat' };
    }

    const percent = Math.round(((last7 - prev7) / prev7) * 100);
    return {
      percent: Math.abs(percent),
      trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
    };
  }

  getLatestCommitHash() {
    try {
      const headPath = path.join(__dirname, '../../../.git/HEAD');
      if (!fs.existsSync(headPath)) {
        return 'local';
      }
      let ref = fs.readFileSync(headPath, 'utf8').trim();
      if (ref.startsWith('ref: ')) {
        ref = fs.readFileSync(path.join(__dirname, '../../../.git', ref.slice(5)), 'utf8').trim();
      }
      return ref.slice(0, 7);
    } catch {
      return 'unknown';
    }
  }
}

export default GitHubProvider;
