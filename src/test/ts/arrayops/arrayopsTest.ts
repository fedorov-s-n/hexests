import {describe, expect, test} from '@jest/globals';
import {Math2} from "../../../main/ts/util/Math2";

describe('Array operations', () => {
    test('sum', () => {
        const x = [1, 2, 3, 4];
        expect(Math2.sum(...x)).toBe(10);
        expect(Math2.sum(...[1, 2, 3, 4])).toBe(10);
        expect(Math2.sum(5, 6)).toBe(11);
        expect(Math2.sum(12)).toBe(12);
        expect(Math2.sum()).toBe(0);
        expect(Math2.sum(...[])).toBe(0);
    });
    test('min', () => {
        const x = [1, 2, 3, 4];
        expect(Math.min(...x)).toBe(1);
        expect(Math.min(...[5, 2, 4])).toBe(2);
        expect(Math.min(5, 3)).toBe(3);
        expect(Math.min(4)).toBe(4);
        expect(Math.min()).toBe(Number.POSITIVE_INFINITY);
        expect(Math.min(...[])).toBe(Number.POSITIVE_INFINITY);
    });
    test('max', () => {
        const x = [1, 2, 3, 4];
        expect(Math.max(...x)).toBe(4);
        expect(Math.max(...[1, 3, 2])).toBe(3);
        expect(Math.max(2, 0)).toBe(2);
        expect(Math.max(1)).toBe(1);
        expect(Math.max()).toBe(Number.NEGATIVE_INFINITY);
        expect(Math.max(...[])).toBe(Number.NEGATIVE_INFINITY);
    });
});