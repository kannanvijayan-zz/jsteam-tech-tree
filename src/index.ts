
import * as yaml from 'js-yaml';
import * as fs from 'fs';

import {liftGraph, Task, WorkSize, Category} from './schema';

function main() {
    const data = fs.readFileSync('tech-tree.yaml', 'utf8');
    const json = yaml.safeLoad(data);
    const graph = liftGraph(json);
    /*
    graph.eachStage((taskSet: Set<Task>) => {
        console.log("--- LAYER");
        for (let task of taskSet) {
            console.log(`    ${task.taskString()}`);
        }
    });
    */
    console.log(generateDotFile(graph));
    // console.log(JSON.stringify(json, null, 2));
}

const GRAPH_ATTRS: object = {
    rankdir: "LR",
    nodesep: 1,
    ranksep: 2,
    bgcolor: "#808080",
};
const NODE_ATTRS: object = {
    fixedsize: "true",
    style: "solid,rounded,filled",
    fontsize: 18,
    pad: 1,
};
const EDGE_ATTRS: object = {
    weight: 3,
};

function generateDotFile(graph): string {
    const result: Array<string> = new Array<string>();
    result.push("digraph {\n");
    result.push(`  graph ${attrsToString(GRAPH_ATTRS)};\n`);
    result.push(`  node ${attrsToString(NODE_ATTRS)};\n`);
    result.push(`  edge ${attrsToString(EDGE_ATTRS)};\n`);
    let i: number = 0;
    graph.eachStage((taskSet: Set<Task>) => {
        i++;
        result.push(`subgraph cluster_${i} {\n`);
        result.push("  style=invis;\n");
        for (let task of taskSet) {
            result.push(`  task_${task.slugName()}`);
            const attrs = {label: task.labelName()};
            Object.assign(attrs, taskNodeAttrs(task));
            result.push(' ' + attrsToString(attrs));
        }
        result.push("}\n");
    });
    graph.eachStage((taskSet: Set<Task>) => {
        for (let task of taskSet) {
            for (let blockedTask of task.blocks) {
                result.push(`  task_${task.slugName()} ->` +
                            ` task_${blockedTask.slugName()};\n`);
            }
        }
    });
    result.push("}\n");
    return result.join('');
}

function taskNodeAttrs(task: Task): object {
    const result: object = {};
    Object.assign(result, workSizeToAttrs(task.workSize));
    Object.assign(result, categoryToAttrs(task.category));
    return result;
}

function workSizeToAttrs(workSize: WorkSize): object {
    switch (workSize.renderSize) {
      case 1: return {shape:'triangle', width:1, height:1, fontsize:16};
      case 2: return {shape:'circle', width:1.5, height:1.3, fontsize:18};
      case 3: return {shape:'hexagon', width:2.5, height:1.8, fontsize:24};
      case 4: return {shape:'rectangle', width:5, height:3, fontsize:36};
      default:
        throw new Error("Bad render size: " + workSize.renderSize);
    }
}

function categoryToAttrs(category: Category): object {
    return {color: category.color as string}
}

function attrsToString(attrs: object) {
    const pieces: Array<string> = [];
    for (let name in attrs) {
        const val: string = JSON.stringify(attrs[name]);
        pieces.push(`${name}=${val}`);
    }
    return `[${pieces.join(',')}]`;
}

main();
