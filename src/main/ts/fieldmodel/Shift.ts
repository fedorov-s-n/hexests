export interface Shift {
    getRequestedX(): number;

    getRequestedY(): number;

    getActualX(): number;

    getActualY(): number;

    getRemainedX(): number;

    getRemainedY(): number;

    getShiftedCell(index: number): number;
}

export class ShiftImpl implements Shift {
    private readonly requestedX: number;
    private readonly requestedY: number;
    private readonly actualX: number;
    private readonly actualY: number;
    private readonly remainedX: number;
    private readonly remainedY: number;
    private readonly shiftFunction: (index: number) => number;

    constructor(
        requestedX: number, requestedY: number,
        actualX: number, actualY: number,
        remainedX: number, remainedY: number,
        rowShift: number, columnShift: number,
        shiftFunction: (index: number) => number
    ) {
        this.requestedX = requestedX;
        this.requestedY = requestedY;
        this.actualX = actualX;
        this.actualY = actualY;
        this.remainedX = remainedX;
        this.remainedY = remainedY;
        this.shiftFunction = shiftFunction;
    }

    getRequestedX(): number {
        return this.requestedX;
    }

    getRequestedY(): number {
        return this.requestedY;
    }

    getActualX(): number {
        return this.actualX;
    }

    getActualY(): number {
        return this.actualY;
    }

    getRemainedX(): number {
        return this.remainedX;
    }

    getRemainedY(): number {
        return this.remainedY;
    }

    getShiftedCell(index: number): number {
        return this.shiftFunction(index);
    }
}