import {describe, expect, test} from '@jest/globals';
import {DIContainer} from "../../../main/ts/di/DIContainer";
import {Random} from "../../../main/ts/util/Random";
import {HeightGeneration} from "../../../main/ts/algorithms/HeightGeneration";
import {LevelManager} from "../../../main/ts/level/LevelManager";
import {SettingsStub} from "../../../main/ts/util/SettingsStub";

/**
 * The generated relief must not favour any of the three axes of the lattice: a bias would show up
 * as stripes on the screen.
 */
describe('generated heights', () => {

    test('vary at the same rate along all three axes', () => {
        const seeds = Array.from(new Array(12).keys()).map(index => (index + 1) / 13);
        const zoomLevel = 3;
        const totals = [0, 0, 0];

        seeds.forEach(seed => {
            const container = new DIContainer();
            container.put(Random, new Random(seed));
            const heightGeneration = container.get(HeightGeneration);
            const levelManager = container.get(LevelManager);
            const cellField = levelManager.cellFields.get(zoomLevel);

            const heights = new Array<number>(cellField.size).fill(0);
            heightGeneration.run({
                zoomLevel,
                domainTypeCount: 3,
                output: (index: number, value: number) => heights[index] = value
            });

            const neighbours = new Array<number>(6);
            const gradients = [0, 0, 0];
            for (let index = 0; index < cellField.size; ++index) {
                cellField.fillNeighbours(index, neighbours);
                for (let axis = 0; axis < 3; ++axis) {
                    gradients[axis] += Math.abs(heights[index] - heights[neighbours[axis]]);
                }
            }
            for (let axis = 0; axis < 3; ++axis) totals[axis] += gradients[axis] / cellField.size;
        });

        // a single relief may well be stretched one way; the axes must only be even on average
        console.log(`gradients per axis: ${totals.map(total => (total / seeds.length).toExponential(3))}`);
        expect(Math.max(...totals) / Math.min(...totals)).toBeLessThan(1.15);
    });

    test('are never left flat, whatever the seed', () => {
        [0.10909179581460537, 0.5, 0.25, 0.75, 0.101, 0.9] .forEach(seed => {
            const container = new DIContainer();
            container.put(Random, new Random(seed));
            const levelManager = container.get(LevelManager);
            const settingsStub = container.get(SettingsStub);
            container.get(HeightGeneration).generateDefault();

            const heights = levelManager.data.get(settingsStub.generationZoom).height.array;
            expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.01);
        });
    });
});
