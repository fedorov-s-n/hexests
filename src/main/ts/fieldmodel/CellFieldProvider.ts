import {RectangularCellField} from "./RectangularCellField";
import {Component} from "../di/Component";
import {CellField} from "./CellField";
import {DataDescriptor} from "../data/DataDescriptor";
import {ArraySearchStorage, DataStorage} from "../data/DataStorage";
import {FinitePlaneAbstraction} from "./FinitePlaneAbstraction";

@Component
export class CellFieldProvider {
    private readonly fields: RectangularCellField[] = [];
    private readonly planeAbstractions: FinitePlaneAbstraction[] = [];
    private readonly cellData = new Map<string, any[]>();

    constructor() {
        const hardcodedSize: number = 60;
        this.fields.push(new RectangularCellField(hardcodedSize, hardcodedSize, 0));
    }

    getField(zoom: number): CellField {
        for (let zoomLevel = this.fields.length; zoomLevel <= zoom; ++zoomLevel) {
            this.fields.push(this.fields[zoomLevel - 1].generateLowerField());
        }
        return this.fields[zoom];
    }

    getFinitePlane(zoom: number): FinitePlaneAbstraction {
        this.getField(zoom + 1);
        for (let zoomLevel = this.planeAbstractions.length; zoomLevel <= zoom; ++zoomLevel) {
            this.planeAbstractions.push(new FinitePlaneAbstraction(
                this.fields[zoomLevel],
                this.fields[zoomLevel + 1],
                this,
                zoomLevel == 0 ? undefined : this.planeAbstractions[zoomLevel - 1]
            ));
        }
        return this.planeAbstractions[zoom];
    }

    mapIndexToUpperLevel(index: number, fromZoom: number, toZoom: number): number | undefined {
        this.getField(Math.max(fromZoom, toZoom));
        let zoom = fromZoom;
        for (; zoom < toZoom; ++zoom) {
            index = this.fields[zoom].mapIndexToUpperLevel(index);
        }
        return zoom === toZoom ? index : undefined;
    }

    interpolateData(dataDescriptor: DataDescriptor<number>, fromZoom: number, toZoom: number, depth: number) {
        if (toZoom < fromZoom) throw new Error();
        this.getField(toZoom);
        const neighbours = new Array<number>(6);
        for (let zoom = fromZoom; zoom < toZoom; ++zoom) {
            const downField = this.fields[zoom];
            const upField = this.fields[zoom + 1];
            const downData = this.getData(dataDescriptor, zoom, depth);
            const upData = this.getData(dataDescriptor, zoom + 1, depth);
            for (let upIndex = 0; upIndex < upField.size; ++upIndex) {
                upData[upIndex] = 0;
            }
            for (let downIndex = 0; downIndex < downField.size; ++downIndex) {
                const upIndex = downField.mapIndexToUpperLevel(downIndex);
                upField.fillNeighbours(upIndex, neighbours);
                const input = downData[downIndex] || 0;
                upData[upIndex] = 3 * input;
                for (let ni = 0; ni < 6; ++ni) {
                    const index = neighbours[ni];
                    upData[index] = (upData[index] || 0) + input;
                }
            }
            for (let upIndex = 0; upIndex < upField.size; ++upIndex) {
                const value = upData[upIndex] = 0;
                upData[upIndex] = value / 3;
            }
        }
        for (let zoom = fromZoom; zoom > toZoom; --zoom) {
            const downField = this.fields[zoom - 1];
            const downData = this.getData(dataDescriptor, zoom - 1, depth);
            const upData = this.getData(dataDescriptor, zoom, depth);

            for (let downIndex = 0; downIndex < downField.size; ++downIndex) {
                const upIndex = downField.mapIndexToUpperLevel(downIndex);
                downData[downIndex] = upData[upIndex];
            }
        }
    }

    fillData<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number, func: (index: number) => T) {
        const dataStorage = this.getData(dataDescriptor, zoom, depth);
        const cellField = this.getField(zoom);
        const size = cellField.size;
        for (let i = 0; i < size; ++i) {
            dataStorage[i] = func(i);
        }
    }

    getData<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number, defaultValue?: T): T[] {
        const key = this.composeKeyForDataAccess(dataDescriptor, zoom, depth);
        let array = this.cellData.get(key) as T[];
        if (array === undefined) {
            array = new Array<T>(this.getField(zoom).size);
            if (defaultValue !== undefined) {
                array.fill(defaultValue);
            }
            this.cellData.set(key, array);
        }
        return array;
    }

    getDataStorage<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number): DataStorage<number, T> {
        return new ArraySearchStorage(this.getData(dataDescriptor, zoom, depth));
    }

    setData<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number, data: T[]) {
        const key = this.composeKeyForDataAccess(dataDescriptor, zoom, depth);
        let array = this.cellData.get(key) as T[];
        if (array === undefined) {
            this.cellData.set(key, data);
        } else if (array !== data) {
            for (let i = 0; i < data.length; ++i) {
                array[i] = data[i];
            }
            array.length = data.length;
        }
    }

    removeData<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number) {
        const key = this.composeKeyForDataAccess(dataDescriptor, zoom, depth);
        this.cellData.delete(key);
    }

    private composeKeyForDataAccess(descriptor: DataDescriptor<any>, zoom: number, depth: number): string {
        return `${descriptor.key}:${zoom}:${depth}`;
    }
}