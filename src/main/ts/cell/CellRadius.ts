/**
 * A disc of places, drawn as a patch of the map: a window into a level, or the marker under the
 * pointer. The places are numbered from the middle outwards, and that numbering holds while the
 * disc is moved about -- what changes is the cell each place stands over.
 */
export interface CellRadius {
    get radius(): number;

    set radius(radius: number);

    /** How many places the disc holds. */
    get size(): number;

    /** Moves the disc inside the window, as an axial offset from its centre. */
    setAnchor(dq: number, dr: number): void;

    /** The cell a place stands over, panning left aside. */
    cellAt(place: number): number;

    /** Where a place is, as an axial offset from the centre of the window. */
    fillOffset(place: number, out: number[]): void;

    /** The same offset counted from the anchor: the corners are named by it and stay put. */
    fillPointOffset(place: number, out: number[]): void;

    /** The place standing over a cell, or minus one when the disc does not reach it. */
    placeOf(cell: number): number;
}
