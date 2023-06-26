import {CellField} from "./CellField";
import {CellDataDescriptor} from "./CellDataDescriptor";
import {CellDataTable} from "./CellDataTable";
import {Shift, ShiftImpl} from "./Shift";

const SQRT3 = Math.sqrt(3);
const COS_MODS = [0, 0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
const SIN_MODS = [0, +1, +0.5, -0.5, -1, -0.5, +0.5];
const ROW_ID_SHIFTS = [2, 4, 3, 1, 0, 1, 3];
const ODD_COLUMN_ID_SHIFTS = [0, 0, 1, 1, 0, 0, 0];
const EVEN_COLUMN_ID_SHIFTS = [0, 1, 1, 1, 1, 0, 0];

export abstract class RectangularCellField implements CellField {
    protected readonly rowCount: number;
    protected readonly columnCount: number;
    protected readonly depthLevel: number;
    protected readonly zoomLevel: number;
    protected readonly dataTable: CellDataTable;

    protected readonly rowMult: number;
    protected readonly columnMult: number;
    protected readonly workingAreaX: number;
    protected readonly workingAreaY: number;

    protected constructor(rowCount: number, columnCount: number, depthLevel: number, zoomLevel: number, data: CellDataTable) {
        this.rowCount = rowCount;
        this.columnCount = columnCount;
        this.depthLevel = depthLevel;
        this.zoomLevel = zoomLevel;
        this.dataTable = data;

        this.rowMult = (1.5 * this.rowCount) / (1.5 * this.rowCount + 0.5);
        this.columnMult = this.columnCount / (this.columnCount + 0.5);
        this.workingAreaX = this.getXPos(this.rowMult, this.columnMult);
        this.workingAreaY = this.getYPos(this.rowMult, this.columnMult);
    }

    abstract getXPos(rowPos: number, columnPos: number): number;

    abstract getYPos(rowPos: number, columnPos: number): number;

    abstract getRowPos(xPos: number, yPos: number): number;

    abstract getColumnPos(xPos: number, yPos: number): number;

    getData<T>(index: number, descriptor: CellDataDescriptor<T>): T {
        return this.dataTable.get(index, this, descriptor);
    }

    setData<T>(index: number, descriptor: CellDataDescriptor<T>, value: T): void {
        return this.dataTable.set(index, this, descriptor, value);
    }

    getNeighbours(index: number): number[] {
        const column = index % this.columnCount;
        const row = (index - column) / this.columnCount;
        const adjustedColumn = column + (row % 2 == 0 ? 0 : -1);
        return [
            this.getIndex(row, column - 1),
            this.getIndex(row - 1, adjustedColumn),
            this.getIndex(row - 1, adjustedColumn + 1),
            this.getIndex(row, column + 1),
            this.getIndex(row + 1, adjustedColumn + 1),
            this.getIndex(row + 1, adjustedColumn)
        ];
    }

    getShift(dx: number, dy: number): Shift {
        const rowShift = Math.round(this.rowCount * this.getRowPos(dx, dy) / this.rowMult);
        const columnShift = Math.round(this.columnCount * this.getColumnPos(dx, dy) / this.columnMult);

        const columnCorrection = (Math.abs(rowShift) % 2) * 0.5 / (this.columnCount + 0.5);
        const dRow = (rowShift / this.rowCount) * this.rowMult;
        const dColumn = (columnShift / this.columnCount) * this.columnMult - columnCorrection;

        const actualX = this.getXPos(dRow, dColumn);
        const actualY = this.getYPos(dRow, dColumn);

        const remainedX = dx - actualX;
        const remainedY = dy - actualY;

        return new ShiftImpl(dx, dy, actualX, actualY, remainedX, remainedY, rowShift, columnShift, index => {
            const column = index % this.columnCount;
            const row = (index - column) / this.columnCount;
            return this.getIndex(row + rowShift, column + columnShift);
        });
    }

    getIndex(row: number, column: number): number {
        while (column < 0) column += this.columnCount;
        while (row < 0) row += this.rowCount;
        while (column >= this.columnCount) column -= this.columnCount;
        while (row >= this.rowCount) row -= this.rowCount;
        return this.getIndexUnchecked(row, column);
    }

    getIndexUnchecked(row: number, column: number): number {
        return row * this.columnCount + column;
    }

    traversePoints(callback: (cellIndex: number, pointId: number, pointOrder: number, xpos: number, ypos: number) => void): void {
        const columnsSize = SQRT3 * (this.columnCount + 0.5);
        const rowsSize = 1.5 * this.rowCount + 0.5;
        for (let row = 0; row < this.rowCount; ++row) {
            const columnIdShifts = row % 2 === 0 ? EVEN_COLUMN_ID_SHIFTS : ODD_COLUMN_ID_SHIFTS;
            const colCellPosAdd = row % 2 === 0 ? 1 : 0.5;
            for (let column = 0; column < this.columnCount; ++column) {
                const index = this.getIndexUnchecked(row, column);
                for (let order = 0; order < 7; ++order) {
                    const rowPos = (SIN_MODS[order] + 1.5 * row + 1) / rowsSize;
                    const columnPos = (COS_MODS[order] + SQRT3 * (column + colCellPosAdd)) / columnsSize;
                    const pointId = (3 * row + ROW_ID_SHIFTS[order]) * (this.columnCount + 1) + column + columnIdShifts[order];
                    callback(index, pointId, order, this.getXPos(rowPos, columnPos), this.getYPos(rowPos, columnPos));
                }
            }
        }
    }

    getPointIdUpperBorder(): number {
        return (this.columnCount + 1) * (3 * this.rowCount + 2);
    }

    getSize(): number {
        return this.columnCount * this.rowCount;
    }

    getDepthLevel(): number {
        return this.depthLevel;
    }

    getZoomLevel(): number {
        return this.zoomLevel;
    }

    getWorkingAreaX(): number {
        return this.workingAreaX;
    }

    getWorkingAreaY(): number {
        return this.workingAreaY;
    }
}

export class EvenRectangularCellField extends RectangularCellField {
    constructor(xSize: number, ySize: number, depthLevel: number, zoomLevel: number, data: CellDataTable) {
        super(ySize, xSize, depthLevel, zoomLevel, data);
        if (zoomLevel % 2 !== 0) throw new Error('Illegal argument: zoom is expected to be even');
        if (ySize % 2 !== 0) throw  new Error('Illegal argument: ySize must be even');
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

export class OddRectangularCellField extends RectangularCellField {
    constructor(xSize: number, ySize: number, depthLevel: number, zoomLevel: number, data: CellDataTable) {
        super(xSize, ySize, depthLevel, zoomLevel, data);
        if (zoomLevel % 2 !== 1) throw  new Error('Illegal argument: zoom is supposed to be odd');
        if (xSize % 2 !== 0) throw new Error('Illegal argument: xSize must me even');
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
