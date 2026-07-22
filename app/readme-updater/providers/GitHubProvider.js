import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGithubContributions } from 'github-contributions-counter';
import GitHubAPI from '../GitHubAPI.js';
import ConfigLoader from '../ConfigLoader.js';
import { mapPool, withRetry } from '../../../helpers/async.js';
import { formatNumber, formatLanguageName } from '../../../helpers/functions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANGUAGE_CONCURRENCY = 10;
const LOC_CONCURRENCY = 5;

class GitHubProvider {
  constructor(username, accessToken) {
    this.username = username;
    this.githubAPI = new GitHubAPI(accessToken);
    this.restHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    };
  }

  async collect() {
    const [contributionsResponse, userData] = await Promise.all([
      withRetry(
        () =>
          getGithubContributions({
            username: this.username,
            token: this.githubAPI.accessToken,
          }),
        'Contributions API',
      ),
      this.githubAPI.fetchUserData(this.username),
    ]);

    const calendar =
      contributionsResponse.data.data.user.contributionsCollection.contributionCalendar;
    const { public_repos, followers, owned_private_repos = 0 } = userData;
    const { current: currentStreak, longest: longestStreak } = this.computeStreaks(calendar.weeks);
    const velocity = this.computeVelocity(calendar.weeks);

    let totalStars = 0;
    let totalCommits = 0;
    let languages = [];
    let locStats = { totalAdditions: 0, totalDeletions: 0 };

    try {
      const accessibleRepos = await this.fetchAllAccessibleReposREST();
      const nonForkRepos = accessibleRepos.filter((repo) => !repo.fork);
      const eligibleRepos = nonForkRepos.filter((repo) => this.matchesRepoFilter(repo));

      totalStars = nonForkRepos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);

      const [commitsResult, languagesResult, locResult] = await Promise.allSettled([
        this.fetchTotalCommits(),
        this.enrichReposWithLanguages(eligibleRepos).then((repos) => this.aggregateLanguages(repos)),
        this.fetchLocStats(eligibleRepos),
      ]);

      if (commitsResult.status === 'fulfilled') {
        totalCommits = commitsResult.value;
      } else {
        console.warn('Commit totals skipped:', commitsResult.reason?.message || commitsResult.reason);
      }

      if (languagesResult.status === 'fulfilled') {
        languages = languagesResult.value;
      } else {
        console.warn('Language scan failed:', languagesResult.reason?.message || languagesResult.reason);
      }

      if (locResult.status === 'fulfilled') {
        locStats = locResult.value;
      } else {
        console.warn('LOC stats skipped:', locResult.reason?.message || locResult.reason);
      }
    } catch (error) {
      console.warn('Repo scan skipped:', error.message || error);
    }

    const commitHash = this.getLatestCommitHash();
    const totalLinesChanged = locStats.totalAdditions + locStats.totalDeletions;
    const contributionDays = calendar.weeks.flatMap((week) => week.contributionDays);
    const todayContributions = contributionDays.at(-1)?.contributionCount ?? 0;
    const crewMesh = await this.fetchCrewMesh();

    return {
      totalRepos: formatNumber(public_repos + owned_private_repos),
      totalContributions: formatNumber(calendar.totalContributions),
      followers: formatNumber(followers),
      totalStars: formatNumber(totalStars),
      totalCommits: formatNumber(totalCommits),
      totalAdditions: formatNumber(locStats.totalAdditions),
      totalDeletions: formatNumber(locStats.totalDeletions),
      totalLinesChanged: formatNumber(totalLinesChanged),
      currentStreak,
      longestStreak,
      velocityPercent: velocity.percent,
      velocityTrend: velocity.trend,
      languages,
      kernelVersion: `6.${new Date().getFullYear()}.${calendar.totalContributions}`,
      commitHash,
      todayContributions,
      crewMesh,
      raw: {
        totalRepos: public_repos + owned_private_repos,
        totalContributions: calendar.totalContributions,
        followers,
        totalStars,
        totalCommits,
        totalAdditions: locStats.totalAdditions,
        totalDeletions: locStats.totalDeletions,
        totalLinesChanged,
        currentStreak,
        longestStreak,
      },
    };
  }

  getRepoFilter() {
    if (!this._repoFilter) {
      const config = ConfigLoader.load();
      const processConfig = config.process ?? {};
      this._repoFilter = {
        ownerOnly: processConfig.ownerOnly !== false,
        exclude: new Set(
          (processConfig.excludeRepos ?? []).map((repo) => repo.trim().toLowerCase()).filter(Boolean),
        ),
        username: this.username.toLowerCase(),
      };
    }
    return this._repoFilter;
  }

  matchesRepoFilter(repo) {
    const { ownerOnly, exclude, username } = this.getRepoFilter();
    const repoName = (repo.name || '').toLowerCase();

    if (exclude.has(repoName)) {
      return false;
    }

    if (!ownerOnly) {
      return true;
    }

    const ownerLogin = repo.owner?.login?.toLowerCase() ?? '';
    const ownerType = repo.owner?.type === 'Organization' ? 'Organization' : 'User';
    return ownerType === 'User' && ownerLogin === username;
  }

  async fetchTotalCommits() {
    let totalCommits = 0;
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

      for (const repo of connection.nodes) {
        totalCommits += repo.defaultBranchRef?.target?.history.totalCount || 0;
      }

      hasNextPage = connection.pageInfo.hasNextPage;
      cursor = connection.pageInfo.endCursor;
    }

    return totalCommits;
  }

  async fetchAllAccessibleReposREST() {
    const repos = [];
    let page = 1;

    while (true) {
      const url =
        `https://api.github.com/user/repos?per_page=100&page=${page}` +
        '&affiliation=owner,organization_member,collaborator&sort=updated';
      const batch = await this.githubAPI.fetchGitHubAPI(url, { headers: this.restHeaders });

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

  async enrichRepoWithLanguages(repo) {
    const owner = repo.owner?.login ?? '';
    const ownerType = repo.owner?.type === 'Organization' ? 'Organization' : 'User';
    let edges = [];

    try {
      const url = `https://api.github.com/repos/${owner}/${repo.name}/languages`;
      const languageData = await this.githubAPI.fetchGitHubAPI(url, { headers: this.restHeaders });
      edges = Object.entries(languageData).map(([langName, size]) => ({
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

  async enrichReposWithLanguages(repos) {
    return mapPool(repos, LANGUAGE_CONCURRENCY, (repo) => this.enrichRepoWithLanguages(repo));
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

  async fetchLocStats(eligibleRepos) {
    const totals = await mapPool(eligibleRepos, LOC_CONCURRENCY, async (repo) => {
      try {
        const contributors = await this.githubAPI.fetchContributorStats(repo.owner.login, repo.name);
        return this.sumContributorWeeks(contributors);
      } catch (error) {
        console.warn(`LOC stats skipped for ${repo.owner.login}/${repo.name}:`, error.message || error);
        return { additions: 0, deletions: 0 };
      }
    });

    return totals.reduce(
      (acc, stats) => ({
        totalAdditions: acc.totalAdditions + stats.additions,
        totalDeletions: acc.totalDeletions + stats.deletions,
      }),
      { totalAdditions: 0, totalDeletions: 0 },
    );
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

  async fetchCrewMesh() {
    const config = ConfigLoader.load();
    const nodes = config.crew?.nodes ?? [];

    if (!nodes.length) {
      return [];
    }

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return mapPool(nodes, 3, async (node) => {
      const active = await this.isCrewNodeActive(node, weekAgo);
      return {
        label: node.label,
        active,
      };
    });
  }

  async isCrewNodeActive(node, weekAgo) {
    if (node.org) {
      try {
        const url = `https://api.github.com/orgs/${node.org}/repos?per_page=5&sort=updated`;
        const repos = await this.githubAPI.fetchGitHubAPI(url, { headers: this.restHeaders });
        if (Array.isArray(repos)) {
          return repos.some((repo) => new Date(repo.pushed_at).getTime() >= weekAgo);
        }
      } catch {
      }
    }

    if (node.repo) {
      try {
        const [owner, name] = node.repo.split('/');
        const url = `https://api.github.com/repos/${owner}/${name}`;
        const repo = await this.githubAPI.fetchGitHubAPI(url, { headers: this.restHeaders });
        return new Date(repo.pushed_at).getTime() >= weekAgo;
      } catch {
        return false;
      }
    }

    return false;
  }
}

export default GitHubProvider;
