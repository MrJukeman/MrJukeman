import fs from 'fs';

class SVGUpdater {
    static getAge(dob) {
        const dateOfBirth = new Date(dob);
        const currentDate = new Date();

        const diffInMilliseconds    =   currentDate - dateOfBirth.getTime();
        const ageInYears            =   Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24 * 365.25));
        const ageInMonths           =   Math.floor((diffInMilliseconds % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
        const ageInDays             =   Math.floor((diffInMilliseconds % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24));

        return `${ageInYears} years, ${ageInMonths} months, ${ageInDays} days`;
    }

    static updateSVG(stats, username) {
        const themes = ["dark", "light"];
        themes.forEach((theme) => {
            let outputPath      = `dist/${theme}.svg`;
            let svgContent      = fs.readFileSync(`resources/readme-template/main.arya`, 'utf8');
            let cssContent      = fs.readFileSync(`public/assets/css/readme/${theme}.css`, 'utf8');
            let age             = this.getAge("1998-06-13");
            let content         = `
                <tspan x="370" y="350" class="keyColor">Repos</tspan>: <tspan class="valueColor">${stats.totalRepos}</tspan>    {<tspan class="keyColor"> Contributed</tspan>: <tspan class="valueColor">${stats.totalContributions}</tspan> }  | <tspan class="keyColor">Commits</tspan>: <tspan class="valueColor">${stats.totalCommits}  </tspan>
                <tspan x="370" y="375" class="keyColor">Stars</tspan>: <tspan class="valueColor">${stats.totalStars}</tspan>  | <tspan class="keyColor">Followers</tspan>: <tspan class="valueColor">${stats.followers}  </tspan>
                <tspan x="370" y="398" class="keyColor">Lines of Code</tspan>: <tspan class="valueColor">${stats.totalLinesChanged}</tspan> (<tspan class="addColor">${stats.totalAdditions}++</tspan>, <tspan class="delColor">${stats.totalDeletions}--</tspan>)
            `;
            svgContent = svgContent.replace(/{github_stats}/, content);
            svgContent = svgContent.replace(/{username}/g, username);
            svgContent = svgContent.replace(/{age}/g, age);
            svgContent = svgContent.replace(/{css}/, cssContent);
            fs.writeFileSync(outputPath, svgContent);
        });
    }
}

export default SVGUpdater;
