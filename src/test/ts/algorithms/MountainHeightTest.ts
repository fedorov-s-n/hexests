import {DIContainer} from "../../../main/ts/di/DIContainer";
import {describe, expect, test} from '@jest/globals';
import {HeightGeneration} from "../../../main/ts/algorithms/HeightGeneration";

describe('(!)', () => {
    test('Lang height is between -1 and 1', () => {
        const container = new DIContainer();
        const heightGeneration = container.get(HeightGeneration);

        for (let i = 0; i < 10; ++i) {
            let min = +2, max = -2;

            heightGeneration.run({
                metropolisStepCountMultiplier: 1,
                zoomLevel: 3,
                domainTypeCount: 4,
                driftStepCount: 50,
                output: (index: number, height: number) => {
                    if (height > max) max = height;
                    if (height < min) min = height;
                }
            })
            // console.log(i + ',' + min + ',' + max);
            expect(min).toBeLessThan(1);
            expect(min).toBeGreaterThan(-1);
            expect(max).toBeLessThan(1);
            expect(max).toBeGreaterThan(-1);
            // typical results with standard step counts are -0.15..+0.15
        }
    });

});
