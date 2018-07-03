
import * as yaml from 'js-yaml';
import * as fs from 'fs';

import {liftGraph, Task, WorkSize, Category} from './schema';
import {renderGraphSvg} from './visualize';

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
    const dotStr: string = generateDotFile(graph);
    renderGraphSvg(dotStr).then((svgStr: string) => {
        // console.log("-- DOT\n------\n");
        console.log(`//${process.argv.join(' ')}\n`);
        console.log(dotStr);
        // console.log("\n\n-- SVG\n------\n");
        // console.log(svgStr);
        // console.log(JSON.stringify(json, null, 2));
    }).catch(err => {
        console.log("ERROR: " + err.toString());
    });
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
    penwidth: 4,
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
    Object.assign(result, categoryToAttrs(task));
    return result;
}

function workSizeToAttrs(workSize: WorkSize): object {
    switch (workSize.renderSize) {
      case 1: return {shape:'triangle', width:2.6, height:2.6,
                      fontsize:16, penwidth:2};
      case 2: return {shape:'circle', width:2.5, height:2.5,
                      fontsize:18, penwidth:4};
      case 3: return {shape:'hexagon', width:4, height:3,
                      fontsize:24, penwidth:8};
      case 4: return {shape:'rectangle', width:5, height:3,
                      fontsize:36, penwidth:16};
      default:
        throw new Error("Bad render size: " + workSize.renderSize);
    }
}

function categoryToAttrs(task: Task): object {
    const category = task.category;
    if (task.done) {
        return {fillcolor: category.doneColor as string,
                color: category.doneBorderColor as string,
                fontcolor: '#606060'}
    } else {
        return {fillcolor: category.color as string,
                color: category.borderColor as string,
                fontcolor: '#101010'}
    }
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
