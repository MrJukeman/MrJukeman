import dotenv from "dotenv";
import Statistics from "./app/readme-updater/Statistics.js";
import SVGUpdater from "./app/readme-updater/SVGUpdater.js";

dotenv.config();

(async () => {

  const GitHubUsername    =   process.env.GITHUB_USERNAME;
  const GithubAccessToken =   process.env.GITHUB_ACCESS_TOKEN;

  const stats             =   new Statistics(GitHubUsername, GithubAccessToken);
  const userStats         =   await stats.getUserStatistics();
  if(userStats){
      SVGUpdater.updateSVG(userStats, GitHubUsername);
  }
})();
