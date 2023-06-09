import 'reflect-metadata';

export class DIContainer {
    public readonly components = new Map<string, any>();

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

    getAll<T>(sp: Implementations<T>): T[] {
        return sp.classes.map(type => this.get(type));
    }
}

type Constructor<T = {}> = new (...args: any[]) => T

export class Implementations<I> {
    classes: Constructor<I>[];

    constructor(...classes: Constructor<I>[]) {
        this.classes = classes;
    }
}