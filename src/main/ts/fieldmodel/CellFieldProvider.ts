import {RectangularCellField} from "./RectangularCellField";
import {Component} from "../di/Component";
import {CellField} from "./CellField";
import {EvenPlaneAbstraction, FinitePlaneAbstraction, OddPlaneAbstraction} from "./FinitePlaneAbstraction";
import {DataDescriptor} from "../data/DataDescriptor";
import {ArraySearchStorage, DataStorage} from "../data/DataStorage";

@Component
export class CellFieldProvider {
    private readonly fields: RectangularCellField[] = [];
    private readonly planeAbstractions: FinitePlaneAbstraction[] = [];
    private readonly cellData = new Map<string, any[]>();

    constructor() {
        const hardcodedSize: number = 60;
        this.fields.push(new RectangularCellField(hardcodedSize, hardcodedSize, 0));
        this.planeAbstractions.push(new EvenPlaneAbstraction(this.fields[0]));
    }

    getField(zoom: number): CellField {
        for (let zoomLevel = this.fields.length; zoomLevel <= zoom; ++zoomLevel) {
            this.fields.push(this.fields[zoomLevel - 1].generateLowerField());
        }
        return this.fields[zoom];
    }

    getFinitePlane(zoom: number): FinitePlaneAbstraction {
        for (let zoomLevel = this.planeAbstractions.length; zoomLevel <= zoom; ++zoomLevel) {
            const cellField = this.getField(zoomLevel) as RectangularCellField;
            const parentAbstraction = this.planeAbstractions[zoomLevel - 1];
            this.planeAbstractions.push(zoomLevel % 2 === 0
                ? new EvenPlaneAbstraction(cellField, parentAbstraction)
                : new OddPlaneAbstraction(cellField, parentAbstraction));
        }
        return this.planeAbstractions[zoom];
    }

    mapIndexExactly(index: number, fromZoom: number, toZoom: number): number | undefined {
        this.getField(Math.max(fromZoom, toZoom));
        let zoom = fromZoom;
        for (; zoom < toZoom; ++zoom) {
            index = this.fields[zoom].mapIndexToLowerLevel(index);
        }
        return zoom === toZoom ? index : undefined;
    }

    interpolateDS(dataDescriptor: DataDescriptor<number>, fromZoom: number, toZoom: number, depth: number) {
        if (toZoom < fromZoom) throw new Error();
        this.getField(toZoom);
        const neighbours = new Array<number>(6);
        for (let zoom = fromZoom; zoom < toZoom; ++zoom) {
            const upField = this.fields[zoom];
            const lowField = this.fields[zoom + 1];
            const upDS = this.getDataStorage(dataDescriptor, zoom, depth);
            const lowDS = this.getDataStorage(dataDescriptor, zoom + 1, depth);
            for (let upIndex = 0; upIndex < upField.size; ++upIndex) {
                const lowIndex = upField.mapIndexToLowerLevel(upIndex);
                lowField.fillNeighbours(lowIndex, neighbours);
                const input = upDS.getOrDefault(upIndex, 0);
                lowDS.putValue(lowIndex, 3 * input);
                for (let ni = 0; ni < 6; ++ni) {
                    const index = neighbours[ni];
                    const value = lowDS.getOrDefault(index, 0) + input;
                    lowDS.putValue(index, value);
                }
            }
            for (let lowIndex = 0; lowIndex < lowField.size; ++lowIndex) {
                const value = lowDS.getOrDefault(lowIndex, 0);
                lowDS.putValue(lowIndex, value / 3);
            }
        }
    }

    getDataStorage<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number): DataStorage<number, T> {
        const key = this.composeKeyForDataAccess(dataDescriptor, zoom, depth);
        let array = this.cellData.get(key) as T[];
        if (array === undefined) {
            array = new Array<T>(this.getField(zoom).size);
            this.cellData.set(key, array);
        }
        return new ArraySearchStorage(array);
    }

    removeDataStorage<T>(dataDescriptor: DataDescriptor<T>, zoom: number, depth: number) {
        const key = this.composeKeyForDataAccess(dataDescriptor, zoom, depth);
        this.cellData.delete(key);
    }

    private composeKeyForDataAccess(descriptor: DataDescriptor<any>, zoom: number, depth: number): string {
        return `${descriptor.key}:${zoom}:${depth}`;
    }
}