const fs = require('node:fs');
const path = require('node:path');
const interact = require('inquirer');

const contentsPath = path.join(__dirname, 'content');
const contents = fs.readdirSync(contentsPath);
let problems = [];

async function fetch() {
    for (let folder of contents) {
        let name = '';
        let start = false;
        for (let c of folder) {
            if (start) {
                name += c;
            }
            if (c == '_') start = true;
        }
        if (!start) continue;
        let difficulty = ['Very Easy', 'Easy', 'Normal', 'Hard', 'Very Hard', 'Insane'];
        difficulty.push(new interact.Separator('== END OF THE LIST =='));
        console.clear();
        await interact
            .prompt([
            {
                type: 'checkbox',
                message: `Select the difficulties of the problems to fetch in ${ name } section`,
                name: 'difficulty',
                choices: difficulty,
            },
            ])
            .then(answers => {
                difficulty = answers.difficulty;
            });
        let options = [];
        let ok = [];
        const problemsPath = path.join(contentsPath, folder);
        const topics = fs.readdirSync(problemsPath).filter(file => file.endsWith('.problems.json'));
        for (let topic of topics) {
            let mdxfilename = topic.replace('.problems.json', '.mdx');
            const topicmdxPath = path.join(problemsPath, mdxfilename);
            let everything = new String(fs.readFileSync(topicmdxPath));
            let lines = everything.split('\n');
            let topicname = '';
            for (let line of lines) {
                if (line.startsWith('title: ')) {
                    topicname = line.replace('title: ', '').replace('\'', '').replace('\'','').replace('\"', '').replace('\"',  '');
                    break;
                }
            }
            options.push({name: topicname});
        }
        options.push(new interact.Separator('== END OF THE LIST =='));
        await interact
            .prompt([
            {
                type: 'checkbox',
                message: `Select the modules you want to fetch problems from in ${ name } section`,
                name: 'topics',
                choices: options,
            },
            ])
            .then((answers) => {
                let ptr = 0;
                for (let i of answers.topics) {
                    while (options[ptr].name != i) {
                        ok.push(false);
                        ptr++;
                    }
                    ok.push(true);
                    ptr++;
                }
                while (ok.length < options.length) {
                    ok.push(false);
                }
            });
        let cur = -1;
        for (let topic of topics) {
            cur++;
            if (ok[cur] == false) continue;
            const topicPath = path.join(problemsPath, topic);
            const topicdata = require(topicPath);
            const sections = Object.getOwnPropertyNames(topicdata);
            for (let section of sections) {
                if (section == 'MODULE_ID') continue;
                for (let problem of topicdata[section]) {
                    if (!difficulty.includes(problem.difficulty)) continue;
                    problems.push(problem);
                    problems[problems.length - 1].section = name;
                    problems[problems.length - 1].module = options[cur].name;
                }
            }
        }
    }
    const problemsPath = path.join(__dirname, 'all.json');
    fs.writeFileSync(problemsPath, JSON.stringify(problems, null, 4));
}

fetch();