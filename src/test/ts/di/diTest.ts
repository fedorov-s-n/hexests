import {describe, expect, test} from '@jest/globals';
import {DIContainer} from "../../../main/ts/di/DIContainer";
import {Service2} from "./Service2";

describe('DI works', () => {
    test('transient wiring', () => {
        const dic = new DIContainer();
        const service2 = dic.get(Service2);
        expect(service2.service1.name).toBe('111');
        expect(Array.from(dic.components.keys()).sort())
            .toStrictEqual(['di.Service1', 'di.Service2']);
    });
});