import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGithubContributions } from 'github-contributions-counter';
import GitHubAPI from '../GitHubAPI.js';
import { formatNumber } from '../../../helpers/functions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class GitHubProvider {
  constructor(username, accessToken) {
    this.username = username;
    this.githubAPI = new GitHubAPI(accessToken);
  }

  async collect() {
    const [userData, contributionsResponse, events, repoStats] = await Promise.all([
      this.githubAPI.fetchUserData(this.username),
      getGithubContributions({ username: this.username, token: this.githubAPI.accessToken }),
      this.fetchRecentEvents(),
      this.fetchRepositoryStats(),
    ]);

    const calendar =
      contributionsResponse.data.data.user.contributionsCollection.contributionCalendar;
    const { public_repos, followers, owned_private_repos = 0 } = userData;

    const streaks = this.computeStreaks(calendar.weeks);
    const velocity = this.computeVelocity(calendar.weeks);
    const languages = this.aggregateLanguages(repoStats.repositories);
    const commitHash = this.getLatestCommitHash();

    return {
      totalRepos: formatNumber(public_repos + owned_private_repos),
      totalContributions: formatNumber(calendar.totalContributions),
      followers: formatNumber(followers),
      totalStars: formatNumber(repoStats.totalStars),
      totalCommits: formatNumber(repoStats.totalCommits),
      totalAdditions: formatNumber(repoStats.totalAdditions),
      totalDeletions: formatNumber(repoStats.totalDeletions),
      totalLinesChanged: formatNumber(repoStats.totalAdditions + repoStats.totalDeletions),
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
        totalAdditions: repoStats.totalAdditions,
        totalDeletions: repoStats.totalDeletions,
        totalLinesChanged: repoStats.totalAdditions + repoStats.totalDeletions,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
      },
    };
  }

  async fetchRecentEvents() {
    const url = `https://api.github.com/users/${this.username}/events/public?per_page=4`;
    const options = {
      headers: { Authorization: `token ${this.githubAPI.accessToken}` },
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
    const query = `
      query($username: String!, $after: String) {
        user(login: $username) {
          repositories(first: 50, after: $after, isFork: false) {
            nodes {
              stargazers { totalCount }
              languages(first: 8) {
                edges { size node { name } }
              }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 10) {
                      totalCount
                      edges { node { additions deletions } }
                    }
                  }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`;

    let hasNextPage = true;
    let endCursor = null;
    let totalStars = 0;
    let totalCommits = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    const repositories = [];

    while (hasNextPage) {
      const data = await this.githubAPI.fetchGraphQL(query, {
        username: this.username,
        after: endCursor,
      });

      const nodes = data.data.user.repositories.nodes;
      repositories.push(...nodes);

      for (const repo of nodes) {
        totalStars += repo.stargazers.totalCount;
        totalCommits += repo.defaultBranchRef?.target?.history.totalCount || 0;

        for (const commit of repo.defaultBranchRef?.target?.history.edges || []) {
          totalAdditions += commit.node.additions;
          totalDeletions += commit.node.deletions;
        }
      }

      hasNextPage = data.data.user.repositories.pageInfo.hasNextPage;
      endCursor = data.data.user.repositories.pageInfo.endCursor;
    }

    return { totalStars, totalCommits, totalAdditions, totalDeletions, repositories };
  }

  aggregateLanguages(repositories) {
    const totals = {};

    for (const repo of repositories) {
      for (const edge of repo.languages?.edges || []) {
        const name = edge.node.name;
        totals[name] = (totals[name] || 0) + edge.size;
      }
    }

    const sorted = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, size], index) => ({
      pid: 1000 + index * 111,
      name: name.toLowerCase(),
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
      const headPath = path.join(__dirname, '../../.git/HEAD');
      if (!fs.existsSync(headPath)) {
        return 'local';
      }
      let ref = fs.readFileSync(headPath, 'utf8').trim();
      if (ref.startsWith('ref: ')) {
        ref = fs.readFileSync(path.join(__dirname, '../../.git', ref.slice(5)), 'utf8').trim();
      }
      return ref.slice(0, 7);
    } catch {
      return 'unknown';
    }
  }
}

export default GitHubProvider;
