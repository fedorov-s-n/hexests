import {DIContainer} from "../../../main/ts/di/DIContainer";
import {describe, expect, test} from '@jest/globals';
import {HeightGeneration} from "../../../main/ts/algorithms/HeightGeneration";
import {HardnessGeneration} from "../../../main/ts/algorithms/HardnessGeneration";
import {LevelManager} from "../../../main/ts/level/LevelManager";
import {SettingsStub} from "../../../main/ts/util/SettingsStub";

describe('hardness', () => {
    test('fills 0..1 with variation and spreads over the levels', () => {
        const container = new DIContainer();
        const heightGeneration = container.get(HeightGeneration);
        const hardnessGeneration = container.get(HardnessGeneration);
        const levelManager = container.get(LevelManager);
        const settingsStub = container.get(SettingsStub);
        const zoom = settingsStub.generationZoom;

        heightGeneration.generateDefault();
        hardnessGeneration.generateDefault();

        const hardness = levelManager.data.get(zoom).hardness.array;
        let min = Number.POSITIVE_INFINITY, max = Number.NEGATIVE_INFINITY;
        const seen = new Set<number>();
        hardness.forEach(value => {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
            if (value < min) min = value;
            if (value > max) max = value;
            seen.add(Math.round(value * 20));
        });

        // the field is stretched to the whole range and is not one flat value
        expect(min).toBeLessThan(0.02);
        expect(max).toBeGreaterThan(0.98);
        // many distinct intermediate values, not a binary hard/soft split
        expect(seen.size).toBeGreaterThan(5);

        // the same field is meaningful when gathered to a coarser level and refined to a finer one
        levelManager.data.get(zoom - 1).hardness.gather();
        levelManager.data.get(zoom).hardness.interpolate();
        [zoom - 1, zoom + 1].forEach(other => {
            const field = levelManager.data.get(other).hardness.array;
            expect(field.length).toBeGreaterThan(0);
            field.forEach(value => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(1);
            });
        });
    });
});
