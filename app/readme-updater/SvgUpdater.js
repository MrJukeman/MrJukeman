import fs from 'fs';

class SvgUpdater {


    /**
     *
     * @param dob
     * @returns {string}
     */
    static getAge(dob) {
        const birthDate = new Date(dob);
        const today     = new Date();
    
        let years   = today.getFullYear() - birthDate.getFullYear();
        let months  = today.getMonth() - birthDate.getMonth();
        let days    = today.getDate() - birthDate.getDate();
    
        if (days < 0) {
            months--;
            const prevMonth  = new Date(today.getFullYear(), today.getMonth(), 0);
            days            += prevMonth.getDate();
        }
    
        if (months < 0) {
            months += 12;
            years--;
        }
    
        return `${years} years, ${months} months, ${days} days`;
    }


    /**
     *
     * @param stats
     * @param username
     */
    static updateSVG(stats, username) {
        const themes = ["dark", "light"];
        themes.forEach((theme) => {
            let outputPath      = `dist/${theme}.svg`;
            let svgContent      = fs.readFileSync(`resources/readme-template/main.svg`,     'utf8');
            let cssContent      = fs.readFileSync(`public/assets/css/readme/${theme}.css`,  'utf8');
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

export default SvgUpdater;
