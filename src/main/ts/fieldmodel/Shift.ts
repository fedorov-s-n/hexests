import {Point2d} from "./Point2d";

export interface Shift {
    readonly requested: Point2d;
    readonly actual: Point2d;
    readonly remained: Point2d;
    readonly workArea: Point2d;

    getShiftedCell(index: number): number;
}

export class ShiftImpl implements Shift {
    private readonly shiftFunction: (index: number) => number;
    readonly actual: Point2d;
    readonly remained: Point2d;
    readonly requested: Point2d;
    readonly workArea: Point2d;

    constructor(
        requestedX: number, requestedY: number,
        actualX: number, actualY: number,
        remainedX: number, remainedY: number,
        workingAreaX: number, workingAreaY: number,
        shiftFunction: (index: number) => number
    ) {
        this.requested = new Point2d(requestedX, requestedY);
        this.actual = new Point2d(actualX, actualY);
        this.remained = new Point2d(remainedX, remainedY);
        this.workArea = new Point2d(workingAreaX, workingAreaY);
        this.shiftFunction = shiftFunction;
    }

    getShiftedCell(index: number): number {
        return this.shiftFunction(index);
    }
}