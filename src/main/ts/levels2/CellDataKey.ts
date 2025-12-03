import {DataKey} from "../data2/DataKey";

export class CellDataKey<T> implements DataKey<T> {
    readonly name: string;
    readonly zoom: number;
    readonly depth: number;
    private readonly _key: string;

    constructor(name: string, zoom: number, depth: number) {
        this.name = name;
        this.zoom = zoom;
        this.depth = depth;
        this._key = `${name}:${zoom}:${depth}`;
    }

    get key(): string {
        return this._key;
    }

    get lower(): CellDataKey<T> {
        return new CellDataKey<T>(this.name, this.zoom + 1, this.depth);
    }
}