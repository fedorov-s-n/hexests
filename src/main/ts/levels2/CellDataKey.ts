import {DataKey} from "../data2/DataKey";

export class CellDataKey<T> implements DataKey<T> {
    readonly name: string;
    readonly zoom: number;
    readonly depth: number;
    readonly defaultValue: T | undefined;
    private readonly _key: string;

    constructor(name: string, zoom: number, depth: number, defaultValue?: T) {
        this.name = name;
        this.zoom = zoom;
        this.depth = depth;
        this.defaultValue = defaultValue;
        this._key = `${name}:${zoom}:${depth}`;
    }

    get key(): string {
        return this._key;
    }
}