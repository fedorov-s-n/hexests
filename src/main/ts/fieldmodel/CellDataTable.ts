import {CellDataDescriptor} from "./CellDataDescriptor";
import {Component} from "../di/Component";
import {CellField} from "./CellField";

@Component
export class CellDataTable {
    private readonly map = new Map<string, any[]>();

    get<T>(index: number, cellField: CellField, descriptor: CellDataDescriptor<T>): T {
        const key = this.composeKey(cellField, descriptor);
        const array = this.map.get(key);
        return (array ? array[index] : undefined) as T;
    }

    set<T>(index: number, cellField: CellField, descriptor: CellDataDescriptor<T>, value: T) {
        const key = this.composeKey(cellField, descriptor);
        let array = this.map.get(key);
        if (!array) this.map.set(key, array = new Array<T>(cellField.getSize()));
        array[index] = value;
    }

    composeKey(cellField: CellField, descriptor: CellDataDescriptor<any>): string {
        return `${descriptor.key}:${cellField.getZoomLevel()}:${cellField.getDepthLevel()}`;
    }
}