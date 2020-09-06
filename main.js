const simpleGit = require('simple-git');
const git = simpleGit();

const contributions = [
    [1, 2020, 4, 6],
    [1, 2020, 4, 7],
    [1, 2020, 4, 8],
    [1, 2020, 4, 9],
    [1, 2020, 4, 10],
    [1, 2020, 4, 13],
    [1, 2020, 4, 20],
    [1, 2020, 4, 27],
    [1, 2020, 4, 28],
    [1, 2020, 4, 29],
    [1, 2020, 4, 30],
    [1, 2020, 4, 15],
    [1, 2020, 4, 22],
    [1, 2020, 5, 1],
    [1, 2020, 5, 18],
    [1, 2020, 5, 19],
    [1, 2020, 5, 20],
    [1, 2020, 5, 21],
    [1, 2020, 5, 22],
    [1, 2020, 5, 25],
    [1, 2020, 6, 1],
    [1, 2020, 6, 8],
    [1, 2020, 6, 9],
    [1, 2020, 6, 3],
    [1, 2020, 5, 27],
    [1, 2020, 6, 4],
    [1, 2020, 6, 12],
    [1, 2020, 6, 29],
    [1, 2020, 7, 7],
    [1, 2020, 7, 15],
    [1, 2020, 7, 16],
    [1, 2020, 7, 17],
    [1, 2020, 7, 21],
    [1, 2020, 7, 27],
    [1, 2020, 8, 17],
    [1, 2020, 8, 18],
    [1, 2020, 8, 19],
    [1, 2020, 8, 20],
    [1, 2020, 8, 21],
    [1, 2020, 8, 31],
    [1, 2020, 8, 24],
    [1, 2020, 9, 2],
    [1, 2020, 9, 8],
    [1, 2020, 9, 9],
    [1, 2020, 9, 10],
    [1, 2020, 9, 11],
    [1, 2020, 9, 7],
];

async function createContributions() {
    try {
        for (const [numCommits, year, month, day] of contributions) {
            const dateString = `${year}-${month}-${day}T00:00:00`;

            for (let i = 0; i < numCommits; i++) {
                await git.add('.');
                await git.commit(`Commit ${i + 1} on ${dateString}`);
                await git.raw(['commit', '--amend', '--no-edit', '--date', dateString]);
            }
        }

        await git.push('origin', 'main');  // Push changes to the remote repository
    } catch (err) {
        console.error('Error during contributions:', err.message);
    }
}

createContributions().then(() => {
    console.log('Contributions created and pushed successfully!');
}).catch(err => {
    console.error('Error creating contributions:', err);
});
