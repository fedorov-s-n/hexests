import {TestServiceProvider} from "./TestServiceProvider";
import {Component} from "../../../main/ts/di/Component";

@Component
export class TestServiceProvider2 implements TestServiceProvider {
    getName(): string {
        return "impl2";
    }
}