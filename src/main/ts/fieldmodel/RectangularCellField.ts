import {CellField} from "./CellField";
import {CellDataDescriptor} from "./CellDataDescriptor";
import {CellDataTable} from "./CellDataTable";

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

    protected constructor(rowCount: number, columnCount: number, depthLevel: number, zoomLevel: number, data: CellDataTable) {
        this.rowCount = rowCount;
        this.columnCount = columnCount;
        this.depthLevel = depthLevel;
        this.zoomLevel = zoomLevel;
        this.dataTable = data;
    }

    abstract getXPos(rowPos: number, columnPos: number): number;

    abstract getYPos(rowPos: number, columnPos: number): number;

    getData<T>(index: number, descriptor: CellDataDescriptor<T>): T {
        return this.dataTable.get(index, this.depthLevel, this.zoomLevel, descriptor);
    }

    setData<T>(index: number, descriptor: CellDataDescriptor<T>, value: T): void {
        return this.dataTable.set(index, this.depthLevel, this.zoomLevel, descriptor, value);
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

    getIndex(row: number, column: number): number {
        if (column < 0) column = this.columnCount - 1;
        if (row < 0) row = this.rowCount - 1;
        if (column >= this.columnCount) column = 0;
        if (row >= this.rowCount) row = 0;
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
}