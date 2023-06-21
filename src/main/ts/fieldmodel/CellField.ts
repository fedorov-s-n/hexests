import {CellDataDescriptor} from "./CellDataDescriptor";
import {Shift} from "./Shift";

export interface CellField {
    traversePoints(callback: (
        cellIndex: number, // unique index of cell
        pointId: number, // unique identifier of point
        pointOrder: number, // relative order of point, central is 0
        xpos: number, // position in unshifted grid mapped to [0, 1]
        ypos: number  // position in unshifted grid mapped to [0, 1]
    ) => void): void;

    getPointIdUpperBorder(): number;

    getNeighbours(index: number): number[];

    getShift(dx: number, dy: number): Shift;

    getData<T>(index: number, descriptor: CellDataDescriptor<T>): T;

    setData<T>(index: number, descriptor: CellDataDescriptor<T>, value: T): void;

    getSize(): number;

    getDepthLevel(): number;

    getZoomLevel(): number;
}