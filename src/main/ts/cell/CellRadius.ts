import {CellSource} from "./CellSource";

/**
 * A disc of cells: the places of the window that are actually drawn. Every place knows its axial
 * offset from the centre of the window, which is what puts it on the screen.
 */
export interface CellRadius extends CellSource {
    get radius(): number;

    /** Moves the disc inside the window, as an axial offset from its centre. */
    setAnchor(dq: number, dr: number): void;

    /** The offset of a cell of the disc; false when the cell is not one of them. */
    fillOffset(index: number, out: number[]): boolean;

    /** The same offset, but counted from the anchor: the corners are named by it and stay put. */
    fillPointOffset(index: number, out: number[]): boolean;
}
