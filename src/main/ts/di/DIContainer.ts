import 'reflect-metadata';
import {Component} from "./Component";

let IMPL_COUNTER = 0;

@Component
export class DIContainer {
    private readonly components = new Map<string, any>();
    private readonly implementations = new Array<Array<any>>();

    constructor() {
    }

    get<T>(type: Constructor<T>): T {
        const name: string = Reflect.getMetadata('class:name', type);
        const existing = this.components.get(name);
        if (existing) return existing as T;
        const paramTypes: Array<Constructor<any>> = Reflect.getMetadata('design:paramtypes', type);
        const args = paramTypes ? paramTypes.map(type => this.get(type)) : [];
        const value = new type(...args);
        this.components.set(name, value);
        return value;
    }

    getIfExists(classSimpleName: string): any {
        for (let [_, value] of this.components) {
            if (value.constructor.name === classSimpleName) {
                return value;
            }
        }
        return null;
    }

    put<T>(type: Constructor<T>, instance: T) {
        const name: string = Reflect.getMetadata('class:name', type);
        this.components.set(name, instance);
    }

    getAll<T>(sp: Implementations<T>): T[] {
        let ii = this.implementations[sp.index];
        if (ii === undefined) {
            ii = this.implementations[sp.index] = sp.classes.map(type => this.get(type));
        }
        return ii as T[];
    }
}

type Constructor<T = {}> = new (...args: any[]) => T

export class Implementations<I> {
    readonly classes: Constructor<I>[];
    readonly index: number;

    constructor(...classes: Constructor<I>[]) {
        this.classes = classes;
        this.index = IMPL_COUNTER++;
    }
}