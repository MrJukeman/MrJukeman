import fetch from 'node-fetch';

class GitHubAPI {


    /**
     *
     * @param accessToken
     */
    constructor(accessToken) {
        this.accessToken = accessToken;
    }


    /**
     *
     * @param username
     * @returns {Promise<unknown>}
     */
    async fetchUserData(username) {
        const url       = `https://api.github.com/users/${username}`;
        const options   = {
            headers: {
                Authorization: `token ${this.accessToken}`,
            },
        };
        return this.fetchGitHubAPI(url, options);
    }


    /**
     *
     * @param query
     * @param variables
     * @returns {Promise<unknown>}
     */
    async fetchGraphQL(query, variables) {
        const url       = 'https://api.github.com/graphql';
        const options   = {
            method  : 'POST',
            headers : {
                Authorization   : `Bearer ${this.accessToken}`,
                'Content-Type'  : 'application/json',
            },
            body: JSON.stringify({ query, variables }),
        };
        return this.fetchGitHubAPI(url, options);
    }


    /**
     *
     * @param url
     * @param options
     * @returns {Promise<unknown>}
     */
    async fetchGitHubAPI(url, options) {
        const response  =   await fetch(url, options);
        if (!response.ok)   throw new Error(`GitHub API responded with a status of ${response.status}`);
        return response.json();
    }
}

export default GitHubAPI;
