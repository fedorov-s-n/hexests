import {DIContainer} from "../../../main/ts/di/DIContainer";
import {describe, expect, test} from '@jest/globals';
import {Random} from "../../../main/ts/algorithms/Random";

describe('Random works', () => {
    test('nextFloat', () => {
        const container = new DIContainer();
        const random = container.get(Random);
        expect(random.nextFloat()).toBeLessThan(1);
        const random1 = new Random(1);
        const random2 = new Random(2);
        const rnd = random1.nextFloat();
        expect(rnd).not.toBe(random2.nextFloat());
        const random3 = new Random(1);
        expect(random3.nextFloat()).toBe(rnd);
    });

});