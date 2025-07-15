import dotenv from "dotenv";
import Statistics from "./app/readme-updater/Statistics.js";
import SvgUpdater from "./app/readme-updater/SvgUpdater.js";

dotenv.config();

(async () => {

  const GitHubUsername    =   process.env.GITHUB_USERNAME;
  const GithubAccessToken =   process.env.GITHUB_ACCESS_TOKEN;

  const stats             =   new Statistics(GitHubUsername, GithubAccessToken);
  const userStats         =   await stats.getUserStatistics();
  if(userStats){
      SvgUpdater.updateSVG(userStats, GitHubUsername);
  }
})();
