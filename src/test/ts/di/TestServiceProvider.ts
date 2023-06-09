import {Implementations} from "../../../main/ts/di/DIContainer";
import {TestServiceProvider1} from "./TestServiceProvider1";
import {TestServiceProvider2} from "./TestServiceProvider2";

export interface TestServiceProvider {
    getName(): string;
}

export const TestServiceProvider = new Implementations<TestServiceProvider>(
    TestServiceProvider1,
    TestServiceProvider2
)
