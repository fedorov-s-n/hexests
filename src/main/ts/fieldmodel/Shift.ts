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

export class ShiftImpl implements Shift {
    private readonly requestedX: number;
    private readonly requestedY: number;
    private readonly actualX: number;
    private readonly actualY: number;
    private readonly remainedX: number;
    private readonly remainedY: number;
    private readonly workingAreaX: number;
    private readonly workingAreaY: number;
    private readonly shiftFunction: (index: number) => number;

    constructor(
        requestedX: number, requestedY: number,
        actualX: number, actualY: number,
        remainedX: number, remainedY: number,
        rowShift: number, columnShift: number,
        workingAreaX: number, workingAreaY: number,
        shiftFunction: (index: number) => number
    ) {
        this.requestedX = requestedX;
        this.requestedY = requestedY;
        this.actualX = actualX;
        this.actualY = actualY;
        this.remainedX = remainedX;
        this.remainedY = remainedY;
        this.workingAreaX = workingAreaX;
        this.workingAreaY = workingAreaY;
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

    getWorkingAreaX(): number {
        return this.workingAreaX;
    }

    getWorkingAreaY(): number {
        return this.workingAreaY;
    }

    getShiftedCell(index: number): number {
        return this.shiftFunction(index);
    }
}