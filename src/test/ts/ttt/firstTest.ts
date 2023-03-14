import {describe, expect, test} from '@jest/globals';
import {hailObject} from "../../../main/ts/lib0";
import _ from "lodash";

describe('first module', () => {
    test('hail object', () => {
        expect(hailObject()).toBe('world!');
    });
    test('lodash functionality', () => {
        expect(_.join(['Hello', '_'], ' ')).toBe('Hello _')
    });
});