import moment    from "moment";
import random    from "random";
import jsonfile   from "jsonfile";
import simpleGit from "simple-git";
let commitCounter = 0;

export class ContributionBot {

    year; month; day; FILE_PATH;

    constructor(n, year = 2023, month = null, day = null, file_path = "dist/date.json") {
        this.year       = year;
        this.month      = month;
        this.day        = day;
        this.FILE_PATH  = file_path;
        this.init(n).then(() => console.log("Done"));
    }

    async init(n) {
        if (n === 0) {
            await simpleGit().push();
            console.log("Pushed");
            return;
        }

        const month = this.month ?? random.int(0, 11);
        const day   = this.day ?? random.int(1, 28);
        const DATE  = moment().year(this.year).month(month).date(day).format();

        try
        {
            await new Promise((resolve, reject) => {
                jsonfile.writeFile(this.FILE_PATH, { date: DATE }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            await simpleGit().add(this.FILE_PATH);
            await simpleGit().commit(DATE, { "--date": DATE });

            commitCounter++;
            console.log("Commit Remaining " + (n - 1));

            if (commitCounter >= 1000) {
                await simpleGit().push();
                console.log("Pushed");
                commitCounter = 0;
            }

            await this.init(n - 1);
        } catch (err) {
            console.error("Commit failed", err);
        }
    }
}
