import 'reflect-metadata';
import * as fs from 'fs';
import {SettingsStub} from "../util/SettingsStub";
import {DataManager} from "../data/DataManager";
import {ViewState} from "../three/ViewState";
import {LevelManager} from "../level/LevelManager";
import {Random} from "../util/Random";
import {GenericMetropolis} from "../algorithms/GenericMetropolis";
import {BrownianDrift} from "../algorithms/BrownianDrift";
import {HeightGeneration} from "../algorithms/HeightGeneration";

/**
 * Generates the relief over and over and writes down what came out each time.
 *
 * Only the lattice the generation itself works on is built: the heights are not carried to any other
 * level and nothing is drawn, so a run costs a fraction of a second. Run it with
 *
 *     npx ts-node src/main/ts/tools/measureHeights.ts [runs] [file]
 *
 * and it leaves a comma-separated file of one line to a run: the number of the run, the lowest and
 * the highest point of the world, the mean height and the variance of it.
 */
function measure(runs: number): string[] {
    const lines = ['run,minimum,maximum,mean,variance'];
    for (let run = 1; run <= runs; ++run) {
        const settings = new SettingsStub();
        const levels = new LevelManager(new DataManager(), settings, new ViewState(settings));
        // a seed of its own for every run, so the ten of them are ten different worlds
        const random = new Random();
        new HeightGeneration(levels, new GenericMetropolis(random, levels),
            new BrownianDrift(random, levels), settings).generateDefault();

        const heights = levels.data.get(settings.generationZoom).height.array;
        let smallest = Number.POSITIVE_INFINITY, largest = Number.NEGATIVE_INFINITY, total = 0;
        for (const height of heights) {
            smallest = Math.min(smallest, height);
            largest = Math.max(largest, height);
            total += height;
        }
        const mean = total / heights.length;
        let squares = 0;
        for (const height of heights) squares += (height - mean) * (height - mean);
        const variance = squares / heights.length;

        lines.push([run, smallest, largest, mean, variance].join(','));
        console.log(`run ${run} of ${runs}: ${heights.length} cells, ` +
            `${smallest.toFixed(6)} to ${largest.toFixed(6)}, mean ${mean.toFixed(6)}`);
    }
    return lines;
}

const runs = Number.parseInt(process.argv[2] || '10', 10);
const file = process.argv[3] || 'heights.csv';
fs.writeFileSync(file, measure(runs).join('\n') + '\n');
console.log(`written to ${file}`);
