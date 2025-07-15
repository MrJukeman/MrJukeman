import { getGithubContributions } from 'github-contributions-counter';
import GitHubAPI from './GitHubAPI.js';
import {formatNumber} from "../../helpers/functions.js";

class Statistics {


    /**
     *
     * @param username
     * @param accessToken
     */
    constructor(username, accessToken) {
        this.username   = username;
        this.githubAPI  = new GitHubAPI(accessToken);
    }


    /**
     *
     * @returns {Promise<{totalRepos: (string|*), totalContributions: (string|*), followers: (string|*), totalStars: (string|*), totalCommits: (string|*), totalAdditions: (string|*), totalDeletions: (string|*), totalLinesChanged: (string|*)}>}
     */
    async getUserStatistics() {
        try {
            const [userData, contributionsResponse] = await Promise.all([
                this.githubAPI.fetchUserData(this.username),
                getGithubContributions({ username: this.username, token: this.githubAPI.accessToken }),
            ]);

            const { public_repos, followers, owned_private_repos = 0 } = userData;
            const totalContributions = contributionsResponse.data.data.user.contributionsCollection.contributionCalendar.totalContributions;

            const query = `
            query($username: String!, $after: String) {
                user(login: $username) {
                    repositories(first: 50, after: $after, isFork: false) {
                        nodes {
                            stargazers {
                                totalCount
                            }
                            defaultBranchRef {
                                target {
                                    ... on Commit {
                                        history(first: 10) {
                                            totalCount
                                            edges {
                                                node {
                                                    additions
                                                    deletions
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }`;

            let hasNextPage     = true;
            let endCursor       = null;
            let totalStars      = 0;
            let totalCommits    = 0;
            let totalAdditions  = 0;
            let totalDeletions  = 0;

            while (hasNextPage) {
                const variables = { username: this.username, after: endCursor };
                const data      = await this.githubAPI.fetchGraphQL(query, variables);

                const repositories = data.data.user.repositories.nodes;
                for (const repo of repositories) {
                    totalStars      += repo.stargazers.totalCount;
                    totalCommits    += repo.defaultBranchRef?.target?.history.totalCount || 0;

                    const commits = repo.defaultBranchRef?.target?.history.edges || [];
                    for (const commit of commits) {
                        totalAdditions += commit.node.additions;
                        totalDeletions += commit.node.deletions;
                    }
                }

                hasNextPage = data.data.user.repositories.pageInfo.hasNextPage;
                endCursor   = data.data.user.repositories.pageInfo.endCursor;
            }

            return {
                totalRepos          : formatNumber(public_repos + owned_private_repos),
                totalContributions  : formatNumber(totalContributions),
                followers           : formatNumber(followers),
                totalStars          : formatNumber(totalStars),
                totalCommits        : formatNumber(totalCommits),
                totalAdditions      : formatNumber(totalAdditions),
                totalDeletions      : formatNumber(totalDeletions),
                totalLinesChanged   : formatNumber(totalAdditions + totalDeletions),
            };
        } catch (error) {
            console.error('Error:', error.message || error);
        }
    }
}

export default Statistics;
