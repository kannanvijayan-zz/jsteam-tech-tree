
import * as assert from 'assert';

//
// Helpers
//

function assertType(val: any, typeStr: any) {
    let chkStr: string = "";
    if (typeof(typeStr) === 'string') {
        chkStr = typeStr;
        assert.equal(typeof(val), typeStr, `Type ${typeof val} != ${chkStr}`);
    } else {
        assert(Array.isArray(typeStr));
        chkStr = (typeStr as Array<string>).join('|');
        let match: boolean = false;
        (typeStr as Array<string>).forEach((ts: string) => {
            if (typeof(val) === ts) {
                match = true;
            }
        });
        assert(match, `Type ${typeof val} != ${chkStr}`);
    }
}

function checkType(val, ty): boolean {
    if (typeof(ty) == 'string') {
        return typeof(val) === ty;
    } else if (ty instanceof Function) {
        return (val instanceof ty) || !!(ty(val));
    } else {
        throw new Error(`Invalid type spec: ${ty}`);
    }
}

function liftArray<T>(val: any, ty: (string|Function)): Array<T> {
    if (Array.isArray(val)) {
        const result: Array<T> = [];
        (val as Array<any>).forEach.call(val, (v) => {
            assert(checkType(v, ty));
            result.push(v as T);
        });
    } else {
        assert(checkType(val, ty));
        return new Array(val as T);
    }
}

function propNames(obj: object): Array<string> {
    return Object.getOwnPropertyNames(obj) as Array<string>;
}

function looseStringEquals(s: string, s2: string): boolean {
    return s.toLowerCase() === s2.toLowerCase();
}

export class Category {
    readonly name: string;
    readonly shortName: string;
    readonly color: string;

    constructor(params: {name: string,
                         shortName: string,
                         color: string})
    {
        this.name = params.name;
        this.shortName = params.shortName;
        this.color = params.color;
        Object.freeze(this);
    }

    matches(name: string): boolean {
        return looseStringEquals(this.name, name) ||
               looseStringEquals(this.shortName, name);
    }

    catString(): string {
        return this.name;
    }
}

export class WorkSize {
    readonly name: string;
    readonly renderSize: number;

    constructor(params: {name: string, renderSize: number}) {
        assert(Number.isInteger(params.renderSize));
        this.name = params.name;
        this.renderSize = params.renderSize;
        Object.freeze(this);
    }

    matches(name: string): boolean {
        return looseStringEquals(this.name, name);
    }

    wsString(): string {
        return this.name;
    }
}

export class Task {
    readonly name: string;
    readonly description: string;
    readonly workSize: WorkSize;
    readonly category: Category;
    readonly needs: Array<Task>;
    readonly blocks: Array<Task>;

    constructor(params: {name: string,
                         description: string,
                         workSize: WorkSize,
                         category: Category})
    {
        this.name = params.name;
        this.description = params.description;
        this.workSize = params.workSize;
        this.category = params.category;
        this.needs = new Array<Task>();
        this.blocks = new Array<Task>();
        Object.freeze(this);
    }

    addNeeds(neededTask: Task) {
        if (this.needs.includes(neededTask)) {
            return false;
        }
        this.needs.push(neededTask);
        return true;
    }
    addBlocks(blockedTask: Task) {
        if (this.blocks.includes(blockedTask)) {
            return false;
        }
        this.blocks.push(blockedTask);
        return true;
    }

    taskString(): string {
        return `Task ${this.name} @${this.category.catString()}`;
    }
}

export class Graph {
    readonly categories: Map<string, Category>;
    readonly workSizes: Map<string, WorkSize>;
    readonly tasks: Map<string, Task>;
    readonly taskStages: Array<Set<Task>>;

    constructor() {
        this.categories = new Map<string, Category>();
        this.workSizes = new Map<string, WorkSize>();
        this.tasks = new Map<string, Task>();
        this.taskStages = new Array<Set<Task>>();
    }

    addCategory(cat: Category): Category {
        assert(!this.categories.has(cat.name),
               `Duplicate category ${cat.name}`);
        this.categories.set(cat.name, cat);
        return cat;
    }
    findCategory(catName: string): Category|null {
        for (let cat of this.categories.values()) {
            if (cat.matches(catName)) {
                return cat;
            }
        }
        return null;
    }
    getCategory(catName: string): Category {
        const catResult = this.findCategory(catName);
        assert (catResult !== null, `Unknown category ${catName}`);
        return catResult as Category;
    }

    addWorkSize(ws: WorkSize): WorkSize {
        assert(!this.workSizes.has(ws.name),
               `Duplicate work size ${ws.name}`);
        this.workSizes.set(ws.name, ws);
        return ws;
    }
    findWorkSize(wsName: string): WorkSize|null {
        for (let ws of this.workSizes.values()) {
            if (ws.matches(wsName)) {
                return ws;
            }
        }
        return null;
    }
    getWorkSize(wsName: string): WorkSize {
        const wsResult = this.findWorkSize(wsName);
        assert (wsResult !== null, `Unknown work size ${wsName}`);
        return wsResult as WorkSize;
    }

    addTask(task: Task): Task {
        assert(!this.tasks.has(task.name),
               `Duplicate task ${task.name}`);
        this.tasks.set(task.name, task);
        return task;
    }
    getTask(taskName: string): Task {
        assert(this.tasks.has(taskName));
        return this.tasks.get(taskName);
    }
    eachTask(func: (Task) => any) {
        for (let task of this.tasks.values()) {
            if (func(task) === false) {
                break;
            }
        }
    }

    getTaskOrMakeDummy(taskName: string): Task {
        if (this.tasks.has(taskName)) {
            return this.tasks.get(taskName) as Task;
        }

        const name: string = taskName;
        const description: string = "Auto-filled unknown task"
        const category: Category = this.getCategory("unknown");
        const workSize: WorkSize = this.getWorkSize("unknown");

        return this.addTask(new Task({name, description, workSize, category}));
    }

    makeLayers() {
        const stages: Array<Set<Task>> = this.taskStages;
        assert(stages.length === 0);

        const handledTasks: Set<Task> = new Set<Task>();
        const allTasks: Set<Task> = new Set<Task>();
        this.eachTask((task: Task) => {
            allTasks.add(task);
        });

        while (allTasks.size > 0) {
            const startSet: Set<Task> = new Set();
            for (let task of allTasks) {
                let hasNeeds: boolean = false;
                for (let neededTask of task.needs) {
                    if (! handledTasks.has(neededTask)) {
                        hasNeeds = true;
                        break;
                    }
                }
                if (! hasNeeds) {
                    startSet.add(task);
                }
            }
       
            // Since the tasks form a DAG, there must always
            // be a valid next-stage start set. 
            assert(startSet.size > 0);
            stages.push(startSet);
            for (let layerTask of startSet) {
                handledTasks.add(layerTask);
                allTasks.delete(layerTask);
            }
        }
    }

    eachStage(func: Function) {
        for (let task of this.taskStages) {
            func(task);
        }
    }

    intoDotFile(): string {
        const result: Array<string> = [];

        result.push(`graph TechTree {\n`);

        let stage: number = 0;
        this.eachStage((stage: Set<Task>) => {
            // Print out stages.
            result.push(`    // Stage ${stage}\n`);
            for (let task of stage) {
                result.push(`\n`);
                result.push(`    // Task ${task.name}\n`);
                result.push(`    task.name} {\n`);
            }
        });
        return result.join('');
    }
}

export function liftGraph(json: any): Graph {
    assertType(json, 'object');
    assertType(json.categories, 'object');
    assertType(json.workSizes, 'object');
    assertType(json.tasks, 'object');

    const g: Graph = new Graph();

    // Lift the categories.
    propNames(json.categories).forEach(catName => {
        assertType(json.categories[catName], 'object');
        g.addCategory(liftCategory(catName, json.categories[catName]));
    });

    // Lift the work sizes.
    propNames(json.workSizes).forEach(wsName => {
        assertType(json.workSizes[wsName], 'object');
        g.addWorkSize(liftWorkSize(wsName, json.workSizes[wsName]));
    });

    // Lift all tasks, without dependencies filled.
    propNames(json.tasks).forEach(taskName => {
        assertType(json.tasks[taskName], 'object');
        g.addTask(liftTask(taskName, json.tasks[taskName], g));
    });

    // Fill dependencies and create dummy tasks for
    // for dangling references.
    propNames(json.tasks).forEach(taskName => {
        fillTaskDeps(taskName, json.tasks[taskName], g);
    });

    // Do cycle check on all tasks.
    // This is quadratic on the size of the task set, but that set
    // should be generally small (even a few dozen is extreme).
    g.eachTask((task: Task) => {
        ensureNoCycles(task, []);
    });

    // Compute layers - at each layer the set of tasks held
    // shown is the set whose prerequisites (needs) are
    // all present in previous layers.
    g.makeLayers();

    return g;
}

function liftCategory(catName: string, catJson: any): Category {
    assertType(catJson, 'object');
    assertType(catJson.shortName, 'string');
    assertType(catJson.color, 'string');

    const name = catName;
    const shortName = catJson.shortName as string;
    const color = catJson.color as string;

    return new Category({name, shortName, color});
}

function liftWorkSize(wsName: string, wsJson: any): WorkSize {
    assertType(wsJson, 'object');
    assertType(wsJson.renderSize, 'number');

    const name = wsName as string;
    const renderSize = wsJson.renderSize as number;

    return new WorkSize({name, renderSize});
}

function liftTask(taskName: string, taskJson: any, g: Graph): Task {
    assertType(taskJson, 'object');
    assertType(taskJson.description, 'string');
    assertType(taskJson.workSize, 'string');
    assertType(taskJson.category, ['string', 'undefined']);

    const name = taskName as string;
    const description = taskJson.description as string;
    const workSize = g.getWorkSize(taskJson.workSize);
    const category: Category = g.getCategory(
        ('category' in taskJson) ?
            taskJson.category as string
          : 'unknown')

    return new Task({name, description, workSize, category});
}

function fillTaskDeps(taskName: string, taskJson: any, g: Graph): void {
    const task = g.getTask(taskName);

    // Process needs.
    for (let needStr of normalizeStringList(taskJson.needs)) {
        const neededTask = g.getTaskOrMakeDummy(needStr);
        task.addNeeds(neededTask);
        neededTask.addBlocks(task);
    }

    // Process blocks.
    for (let blockStr of normalizeStringList(taskJson.blocks)) {
        const blockedTask = g.getTaskOrMakeDummy(blockStr);
        task.addBlocks(blockedTask);
        blockedTask.addNeeds(task);
    }
}

function normalizeStringList(val: any): Array<string> {
    const result: Array<string> = [];
    if (val === undefined) {
        return result;
    } else if (typeof(val) === 'string') {
        result.push(val as string);
    } else {
        assert(Array.isArray(val));
        for (let str of val) {
            assert(typeof(str) === 'string');
            result.push(str as string);
        }
    }
    return result;
}

function ensureNoCycles(task: Task, pathArray: Array<Task>) {
    assert(task instanceof Task, "task instanceof Task");
    pathArray.push(task);
    for (let child of task.needs) {
        assert(child instanceof Task, "child instanceof Task");
        // If the child is in the pathArray, fail.
        if (pathArray.includes(child)) {
            console.error(`Cycle path:`);
            for (let task of pathArray) {
                console.error(`  Task ${task.name}`);
            }
            throw new Error(`Task ${task.name} occurs in cycle!`);
        } else {
            ensureNoCycles(child, pathArray);
        }
    }
    pathArray.pop();
}
