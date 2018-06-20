
import * as yaml from 'js-yaml';
import * as fs from 'fs';

import {liftGraph, Task} from './schema';

function main() {
    const data = fs.readFileSync('tech-tree.yaml', 'utf8');
    const json = yaml.safeLoad(data);
    const graph = liftGraph(json);
    graph.eachStage((taskSet: Set<Task>) => {
        console.log("--- LAYER");
        for (let task of taskSet) {
            console.log(`    ${task.taskString()}`);
        }
    });
    // console.log(JSON.stringify(json, null, 2));
}

main();
