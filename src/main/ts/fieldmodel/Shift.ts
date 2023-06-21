export interface Shift {
    getRequestedX(): number;

    getRequestedY(): number;

    getActualX(): number;

    getActualY(): number;

    getRemainedX(): number;

    getRemainedY(): number;

    getWorkingAreaX(): number;

    getWorkingAreaY(): number;

    getShiftedCell(index: number): number;
}