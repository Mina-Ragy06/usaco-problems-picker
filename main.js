const fs = require('node:fs');
const path = require('node:path');
const interact = require('inquirer');

const problems = require('./all.json');
const solved = require('./solved.json');
let active = require('./active.json');
let skipped = require('./skipped.json');

async function solve(idx) {
    let newactive = [];
    for (let i = 0; i < active.length; i++) {
        if (i == idx) {
            solved.push(active[i]);
        } else {
            newactive.push(active[i]);
        }
    }
    active = newactive;
    let problemsPath = path.join(__dirname, 'active.json');
    fs.writeFileSync(problemsPath, JSON.stringify(active, null, 4));
    problemsPath = path.join(__dirname, 'solved.json');
    fs.writeFileSync(problemsPath, JSON.stringify(solved, null, 4));
}

async function skip(idx) {
    let newactive = [];
    for (let i = 0; i < active.length; i++) {
        if (i == idx) {
            skipped.push(active[i]);
        } else {
            newactive.push(active[i]);
        }
    }
    active = newactive;
    let problemsPath = path.join(__dirname, 'active.json');
    fs.writeFileSync(problemsPath, JSON.stringify(active, null, 4));
    problemsPath = path.join(__dirname, 'skipped.json');
    fs.writeFileSync(problemsPath, JSON.stringify(skipped, null, 4));
}

async function query(idx) {
    let problem = active[idx];
    let props = Object.getOwnPropertyNames(problem);
    props.push(new interact.Separator('== END OF THE LIST =='));
    console.clear();
    await interact
        .prompt([
            {
                type: 'checkbox',
            message: `What properties do you wish to see`,
            name: 'property',
            choices: props,
        },
    ])
        .then(async (answers) => {
            let s = '';
            for (let i of answers.property) {
                s += `${i}: ` + JSON.stringify(problem[i], null, 4) + '\n';
            }
            await interact.prompt([
                {
                    type: 'list',
                    message: s,
                    name: 'back',
                    choices: ['<< Back'],
                }
            ]);
        });
}
async function confirm(text) {
    text = 'Are you sure that you want to ' + text + '?';
    let ret = false;
    await interact
        .prompt([{
            type: 'confirm',
            message: text,
            name: 'confirm'
        }])
        .then(async (answers) => {
            if (answers.confirm) {
                ret = true;
            }
        });
    return ret;
}
async function ask(idx) {
    let problem = active[idx];
    options = [];
    options.push({name: 'Mark as solved'});
    options.push({name: 'Skip'});
    options.push({name: 'Show details'});
    options.push({name: '<< Back'});
    console.clear();
    await interact
        .prompt([
        {
            type: 'list',
            message: `What actions do wish to do with `,
            name: 'action',
            choices: options,
        },
        ])
        .then(async (answers) => {
            if (answers.action == '<< Back') {
                return;
            }
            if (answers.action == 'Mark as solved') {
                await confirm(`mark problem ${problem.name} as solved`).then(async ret => {
                    if (ret) {
                        await solve(idx);
                    }
                })
            } else if (answers.action == 'Skip') {
                await confirm(`skip problem ${problem.name} for now`).then(async ret => {
                    if (ret) {
                        await skip(idx);
                    }
                })
            } else if (answers.action == 'Show details') {
                await query(idx);
            }
        });
}
async function display() {
    while (1) {
        let options = [];
        for (let problem of active) {
            options.push({name: `${problem.name} (${problem.url}) from ${problem.source}`});
        }
        options.push({name: '<< Back'});
        options.push(new interact.Separator('== END OF THE LIST =='));
        console.clear();
        let out = false;
        await interact
            .prompt([
            {
                type: 'list',
                message: 'The problems being solved now are:',
                name: 'problem',
                choices: options,
            },
            ])
            .then(async (answers) => {
                if (answers.problem == '<< Back') {
                    out = true;
                    return;
                }
                let idx = 0;
                for (let cur of options) {
                    if (cur.name == answers.problem) break;
                    idx++;
                }
                await ask(idx);
            });
        if (out) break;
    }
}
async function pick() {
    let cnt = 0;
    let used = [];
    for (let problem of problems) {
        if (active.includes(problem) || skipped.includes(problem) || solved.includes(problem)) {
            used.push(true);
            continue;
        } else {
            used.push(false);
        }
        cnt++;
    }
    let idx = Math.round(Math.random() * (cnt - 1), 0) + 1;
    let choice;
    for (let i = 0; i < problems.length; i++) {
        if (used[i]) continue;
        idx--;
        if (idx == 0) {
            choice = problems[i];
            break;
        }
    }
    active.push(choice);
    const problemsPath = path.join(__dirname, 'active.json');
    fs.writeFileSync(problemsPath, JSON.stringify(active, null, 4));
    await display();
}
async function recover() {
    let options = [];
    for (let problem of skipped) {
        options.push({name: `${problem.name} (${problem.url}) from ${problem.source}`});
    }
    options.push(new interact.Separator('== END OF THE LIST =='));
    let ok = [];
    console.clear();
    await interact
        .prompt([
        {
            type: 'checkbox',
            message: `What skipped problem(s) do you wish to recover?`,
            name: 'problems',
            choices: options,
        },
        ])
        .then((answers) => {
            let ptr = 0;
            for (let i of answers.problems) {
                while (options[ptr].name != i) {
                    ok.push(true);
                    ptr++;
                }
                ok.push(false);
                ptr++;
            }
            while (ok.length < options.length) {
                ok.push(true);
            }
        });
    let newskipped = [];
    for (let i = 0; i < skipped.length; i++) {
        if (ok[i]) {
            newskipped.push(skipped[i]);
        } else {
            active.push(skipped[i]);
        }
    }
    skipped = newskipped;
    let problemsPath = path.join(__dirname, 'active.json');
    fs.writeFileSync(problemsPath, JSON.stringify(active, null, 4));
    problemsPath = path.join(__dirname, 'todo.json');
    fs.writeFileSync(problemsPath, JSON.stringify(skipped, null, 4));
}

async function work() {
    while (1) {
        let options = [];
        options.push({name: 'Display all active problems'});
        options.push({name: 'Pick a new problem and display all active problems'});
        options.push({name: 'Recover a skipped problem'});
        options.push({name: '<< Back'});
        console.clear();
        let out = false;
        await interact
            .prompt([
            {
                type: 'list',
                message: `What do you wish to do?`,
                name: 'request',
                choices: options,
            },
            ])
            .then(async (answers) => {
                if (answers.request == 'Display all active problems') {
                    await display();
                } else if (answers.request == 'Pick a new problem and display all active problems') {
                    await pick();
                } else if (answers.request == 'Recover a skipped problem') {
                    await recover();
                } else {
                    out = true;
                }
            });
        if (out) break;
    }
}
work();