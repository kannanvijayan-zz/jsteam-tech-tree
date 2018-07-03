
import * as Viz from 'viz.js';
import { Module, render } from 'viz.js/full.render.js';

export function renderGraphSvg(dot: string): Promise<string> {
    const viz = new Viz({Module, render});
    return viz.renderString(dot);
}
