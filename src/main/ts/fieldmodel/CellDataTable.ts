import {CellDataDescriptor} from "./CellDataDescriptor";
import {Component} from "../di/Component";

@Component
export class CellDataTable {
    private readonly map = new Map<string, any>();

    get<T>(index: number, depth: number, zoom: number, descriptor: CellDataDescriptor<T>): T {
        return this.map.get(this.composeKey(index, depth, zoom, descriptor)) as T;
    }

    set<T>(index: number, depth: number, zoom: number, descriptor: CellDataDescriptor<T>, value: T) {
        this.map.set(this.composeKey(index, depth, zoom, descriptor), value);
    }

    composeKey(index: number, depth: number, zoom: number, descriptor: CellDataDescriptor<any>): string {
        return `${descriptor.key}:${zoom}:${depth}:${index}`;
    }
}