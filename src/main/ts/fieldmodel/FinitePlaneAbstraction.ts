import {RectangularCellField} from "./RectangularCellField";
import {Point2d} from "./Point2d";
import {DataStorage} from "../data/DataStorage";

const SQRT3 = Math.sqrt(3);
const COS_MODS = [0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
const SIN_MODS = [+1, +0.5, -0.5, -1, -0.5, +0.5];
const ROW_ID_SHIFTS = [3, 2, 1, 0, 1, 2];
const ODD_COLUMN_ID_SHIFTS = [0, 1, 1, 0, 0, 0];
const EVEN_COLUMN_ID_SHIFTS = [1, 1, 1, 1, 0, 0];

export class FinitePlaneAbstraction {
    private readonly cellField: RectangularCellField;
    private readonly lowCellField: RectangularCellField;
    private readonly heightDS: DataStorage<number, number>;
    private readonly lowHeightDS: DataStorage<number, number>;
    private readonly orientation: FinitePlaneOrientation;

    private readonly columnsSize: number;
    private readonly rowsSize: number;
    private readonly rowMult: number;
    private readonly columnMult: number;

    public readonly size: number;
    public readonly workArea: Point2d;
    public readonly offset: Point2d;
    private _shift: Point2d;
    private _shiftRemainder: Point2d;
    private _shiftData: ShiftData;

    constructor(
        cellField: RectangularCellField,
        lowCellField: RectangularCellField,
        heightDS: DataStorage<number, number>,
        lowHeightDS: DataStorage<number, number>,
        parentAbstraction: FinitePlaneAbstraction | undefined,
    ) {
        this.cellField = cellField;
        this.lowCellField = lowCellField;
        this.heightDS = heightDS;
        this.lowHeightDS = lowHeightDS;
        this.orientation = cellField.zoom % 2 === 0 ? EVEN_ORIENTATION : ODD_ORIENTATION;

        this.rowsSize = 1.5 * cellField.rowCount + 0.5;
        this.columnsSize = SQRT3 * (cellField.columnCount + 0.5);
        this.rowMult = (1.5 * cellField.rowCount) / (1.5 * cellField.rowCount + 0.5);
        this.columnMult = cellField.columnCount / (cellField.columnCount + 0.5);

        this.workArea = new Point2d(
            this.orientation.getXPos(this.rowMult, this.columnMult),
            this.orientation.getYPos(this.rowMult, this.columnMult)
        );

        // todo: recalculate
        const columnShift = -0.5 / (cellField.columnCount + 0.5);
        this.offset = new Point2d(
            this.orientation.getXPos(0, columnShift) + (parentAbstraction?.offset?.x || 0),
            this.orientation.getYPos(0, columnShift) + (parentAbstraction?.offset?.y || 0)
        );
        this.size = cellField.size;

        this._shift = new Point2d(0, 0);
        this._shiftRemainder = new Point2d(0, 0);
        this._shiftData = new ShiftData(0, 0, 0);
    }

    get shift(): Point2d {
        return this._shift;
    }

    set shift(value: Point2d) {
        const dx = value.x;
        const dy = value.y;
        const rowCount = this.cellField.rowCount;
        const columnCount = this.cellField.columnCount;

        let rowShift = Math.round(rowCount * this.orientation.getRowPos(dx, dy) / this.rowMult);
        let columnShift = Math.round(columnCount * this.orientation.getColumnPos(dx, dy) / this.columnMult);

        const rowShiftMod2 = Math.abs(rowShift) % 2;
        const columnCorrection = rowShiftMod2 * 0.5 / (columnCount + 0.5);
        let dRow = (rowShift / rowCount) * this.rowMult;
        let dColumn = (columnShift / columnCount) * this.columnMult - columnCorrection;

        let actualX = this.orientation.getXPos(dRow, dColumn);
        let actualY = this.orientation.getYPos(dRow, dColumn);

        const remainedX = dx - actualX;
        const remainedY = dy - actualY;

        while (rowShift > rowCount) rowShift -= rowCount;
        while (rowShift < -rowCount) rowShift += rowCount;
        while (columnShift > columnCount) columnShift -= columnCount;
        while (columnShift < -columnCount) columnShift += columnCount;

        dRow = (rowShift / rowCount) * this.rowMult;
        dColumn = (columnShift / columnCount) * this.columnMult - columnCorrection;

        actualX = this.orientation.getXPos(dRow, dColumn);
        actualY = this.orientation.getYPos(dRow, dColumn);

        this._shift = new Point2d(actualX, actualY);
        this._shiftRemainder = new Point2d(remainedX, remainedY);
        this._shiftData = new ShiftData(rowShiftMod2, rowShift, columnShift);
    }

    get shiftRemainder(): Point2d {
        return this._shiftRemainder;
    }

    getShiftedCellIndex(index: number) {
        const column = index % this.cellField.columnCount;
        const row = (index - column) / this.cellField.columnCount;
        const colMod = -(row % 2) * this._shiftData.rowShiftMod2;
        return this.cellField.getIndex(
            row + this._shiftData.rowShift,
            column + this._shiftData.columnShift + colMod
        );
    }

    fillPointsXY(cellIndex: number, xs: number[], ys: number[]) {
        const column = cellIndex % this.cellField.columnCount;
        const row = (cellIndex - column) / this.cellField.columnCount;

        for (let order = 0; order < 6; ++order) {
            this.fillXYForOne(order, row, column, xs, ys, SIN_MODS[order], COS_MODS[order]);
        }
    }

    fillPointsZP(cellIndex: number, zs: number[], pointIds: number[]) {
        const shiftedCellIndex = this.getShiftedCellIndex(cellIndex);
        const lowCellIndex = this.cellField.mapIndexToLowerLevel(shiftedCellIndex);
        const lowNeighbours = pointIds; // to safe memory allocation
        this.lowCellField.fillNeighbours(lowCellIndex, lowNeighbours); // knows about traverse order
        for (let arrayIndex = 0; arrayIndex < 6; ++arrayIndex) {
            const index = lowNeighbours[arrayIndex];
            zs[arrayIndex] = this.lowHeightDS.getOrDefault(index, 0);
        }

        const column = cellIndex % this.cellField.columnCount;
        const row = (cellIndex - column) / this.cellField.columnCount;
        const columnIdShifts = row % 2 === 0 ? EVEN_COLUMN_ID_SHIFTS : ODD_COLUMN_ID_SHIFTS;
        for (let order = 0; order < 6; ++order) {
            pointIds[order] = this.cellField.size
                + (2 * row + ROW_ID_SHIFTS[order]) * (this.cellField.columnCount + 1)
                + column + columnIdShifts[order];
        }
    }

    fillCellXY(cellIndices: number[], xs: number[], ys: number[]) {
        for (let arrayIndex = 0; arrayIndex < cellIndices.length; ++arrayIndex) {
            const index = cellIndices[arrayIndex];
            const column = index % this.cellField.columnCount;
            const row = (index - column) / this.cellField.columnCount;
            this.fillXYForOne(arrayIndex, row, column, xs, ys, 0, 0);
        }
    }

    fillCellZP(cellIndices: number[], zs: number[], ps: number[]) {
        for (let arrayIndex = 0; arrayIndex < cellIndices.length; ++arrayIndex) {
            const index = cellIndices[arrayIndex];
            const shiftedIndex = this.getShiftedCellIndex(index);
            zs[arrayIndex] = this.heightDS.getOrDefault(shiftedIndex, 0);
            ps[arrayIndex] = index;
        }
    }

    private fillXYForOne(arrayIndex: number, row: number, column: number, xs: number[], ys: number[], rowShift: number, columnShift: number) {
        const colCellPosAdd = row % 2 === 0 ? 1 : 0.5;
        const rowPos = (rowShift + 1.5 * row + 1) / this.rowsSize;
        const columnPos = (columnShift + SQRT3 * (column + colCellPosAdd)) / this.columnsSize;
        xs[arrayIndex] = this.orientation.getXPos(rowPos, columnPos);
        ys[arrayIndex] = this.orientation.getYPos(rowPos, columnPos);
    }
}

interface FinitePlaneOrientation {
    getXPos(rowPos: number, columnPos: number): number;

    getYPos(rowPos: number, columnPos: number): number;

    getRowPos(xPos: number, yPos: number): number;

    getColumnPos(xPos: number, yPos: number): number;
}

class OddPlaneOrientation implements FinitePlaneOrientation {
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

class EvenPlaneOrientation implements FinitePlaneOrientation {
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

class ShiftData {
    readonly rowShiftMod2: number;
    readonly rowShift: number;
    readonly columnShift: number;

    constructor(rowShiftMod2: number, rowShift: number, columnShift: number) {
        this.rowShiftMod2 = rowShiftMod2;
        this.rowShift = rowShift;
        this.columnShift = columnShift;
    }
}

const ODD_ORIENTATION = new OddPlaneOrientation();
const EVEN_ORIENTATION = new EvenPlaneOrientation();