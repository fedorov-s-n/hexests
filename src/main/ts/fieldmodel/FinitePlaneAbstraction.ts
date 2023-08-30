import {RectangularCellField} from "./RectangularCellField";
import {Shift, ShiftImpl} from "./Shift";
import {Point2d} from "./Point2d";

const SQRT3 = Math.sqrt(3);
const COS_MODS = [0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
const SIN_MODS = [+1, +0.5, -0.5, -1, -0.5, +0.5];
const ROW_ID_SHIFTS = [3, 2, 1, 0, 1, 2];
const ODD_COLUMN_ID_SHIFTS = [0, 1, 1, 0, 0, 0];
const EVEN_COLUMN_ID_SHIFTS = [1, 1, 1, 1, 0, 0];
const STUB_POINT_IDS = new Array<number>(6);

export abstract class FinitePlaneAbstraction {
    private readonly cellField: RectangularCellField;

    protected readonly columnsSize: number;
    protected readonly rowsSize: number;
    protected readonly rowMult: number;
    protected readonly columnMult: number;
    protected readonly workingAreaX: number;
    protected readonly workingAreaY: number;

    readonly size: number;
    readonly offset: Point2d;

    protected constructor(cellField: RectangularCellField, parentAbstraction?: FinitePlaneAbstraction) {
        this.cellField = cellField;

        this.rowsSize = 1.5 * cellField.rowCount + 0.5;
        this.columnsSize = SQRT3 * (cellField.columnCount + 0.5);
        this.rowMult = (1.5 * cellField.rowCount) / (1.5 * cellField.rowCount + 0.5);
        this.columnMult = cellField.columnCount / (cellField.columnCount + 0.5);
        this.workingAreaX = this.getXPos(this.rowMult, this.columnMult);
        this.workingAreaY = this.getYPos(this.rowMult, this.columnMult);

        // todo: recalculate
        const columnShift = -0.5 / (cellField.columnCount + 0.5);
        this.offset = new Point2d(
            this.getXPos(0, columnShift) + (parentAbstraction?.offset?.x || 0),
            this.getYPos(0, columnShift) + (parentAbstraction?.offset?.y || 0)
        );
        this.size = cellField.size;
    }

    getShift(dx: number, dy: number): Shift {
        const rowCount = this.cellField.rowCount;
        const columnCount = this.cellField.columnCount;

        let rowShift = Math.round(rowCount * this.getRowPos(dx, dy) / this.rowMult);
        let columnShift = Math.round(columnCount * this.getColumnPos(dx, dy) / this.columnMult);

        const rowShiftMod2 = Math.abs(rowShift) % 2;
        const columnCorrection = rowShiftMod2 * 0.5 / (columnCount + 0.5);
        let dRow = (rowShift / rowCount) * this.rowMult;
        let dColumn = (columnShift / columnCount) * this.columnMult - columnCorrection;

        let actualX = this.getXPos(dRow, dColumn);
        let actualY = this.getYPos(dRow, dColumn);

        const remainedX = dx - actualX;
        const remainedY = dy - actualY;

        while (rowShift > rowCount) rowShift -= rowCount;
        while (rowShift < -rowCount) rowShift += rowCount;
        while (columnShift > columnCount) columnShift -= columnCount;
        while (columnShift < -columnCount) columnShift += columnCount;

        dRow = (rowShift / rowCount) * this.rowMult;
        dColumn = (columnShift / columnCount) * this.columnMult - columnCorrection;

        actualX = this.getXPos(dRow, dColumn);
        actualY = this.getYPos(dRow, dColumn);

        const normalizedDx = actualX + remainedX;
        const normalizedDy = actualY + remainedY;

        return new ShiftImpl(
            normalizedDx, normalizedDy,
            actualX, actualY,
            remainedX, remainedY,
            this.workingAreaX, this.workingAreaY,
            index => {
                const column = index % columnCount;
                const row = (index - column) / columnCount;
                const colMod = -(row % 2) * rowShiftMod2;
                return this.cellField.getIndex(row + rowShift, column + columnShift + colMod);
            }
        );
    }

    fillPoints(index: number, xs: number[], ys: number[], pointIds: number[] = STUB_POINT_IDS) {
        const column = index % this.cellField.columnCount;
        const row = (index - column) / this.cellField.columnCount;
        const columnIdShifts = row % 2 === 0 ? EVEN_COLUMN_ID_SHIFTS : ODD_COLUMN_ID_SHIFTS;

        for (let order = 0; order < 6; ++order) {
            this.fillOne(order, row, column, xs, ys, SIN_MODS[order], COS_MODS[order]);
            pointIds[order] = (2 * row + ROW_ID_SHIFTS[order]) * (this.cellField.columnCount + 1) + column + columnIdShifts[order];
        }
    }

    fillPositions(indices: number[], xs: number[], ys: number[]) {
        for (let arrayIndex = 0; arrayIndex < indices.length; ++arrayIndex) {
            const index = indices[arrayIndex];
            const column = index % this.cellField.columnCount;
            const row = (index - column) / this.cellField.columnCount;
            this.fillOne(arrayIndex, row, column, xs, ys, 0, 0);
        }
    }

    private fillOne(arrayIndex: number, row: number, column: number, xs: number[], ys: number[], rowShift: number, columnShift: number) {
        const colCellPosAdd = row % 2 === 0 ? 1 : 0.5;
        const rowPos = (rowShift + 1.5 * row + 1) / this.rowsSize;
        const columnPos = (columnShift + SQRT3 * (column + colCellPosAdd)) / this.columnsSize;
        xs[arrayIndex] = this.getXPos(rowPos, columnPos);
        ys[arrayIndex] = this.getYPos(rowPos, columnPos);
    }

    abstract getXPos(rowPos: number, columnPos: number): number;

    abstract getYPos(rowPos: number, columnPos: number): number;

    abstract getRowPos(xPos: number, yPos: number): number;

    abstract getColumnPos(xPos: number, yPos: number): number;
}

export class OddPlaneAbstraction extends FinitePlaneAbstraction {
    constructor(cellField: RectangularCellField, parentAbstraction?: FinitePlaneAbstraction) {
        super(cellField, parentAbstraction);
    }

    getXPos(rowPos: number, columnPos: number): number {
        return rowPos;
    }

    getYPos(rowPos: number, columnPos: number): number {
        return columnPos;
    }

    getRowPos(xPos: number, yPos: number): number {
        return xPos;
    }

    getColumnPos(xPos: number, yPos: number): number {
        return yPos;
    }
}

export class EvenPlaneAbstraction extends FinitePlaneAbstraction {
    constructor(cellField: RectangularCellField, parentAbstraction?: FinitePlaneAbstraction) {
        super(cellField, parentAbstraction);
    }

    getXPos(rowPos: number, columnPos: number): number {
        return columnPos;
    }

    getYPos(rowPos: number, columnPos: number): number {
        return rowPos;
    }

    getRowPos(xPos: number, yPos: number): number {
        return yPos;
    }

    getColumnPos(xPos: number, yPos: number): number {
        return xPos;
    }
}