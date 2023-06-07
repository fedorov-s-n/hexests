import {Service1} from "./Service1";
import {Component} from "../../../main/ts/di/Component";

@Component
export class Service2 {
    service1: Service1

    constructor(service1: Service1) {
        this.service1 = service1
    }
}