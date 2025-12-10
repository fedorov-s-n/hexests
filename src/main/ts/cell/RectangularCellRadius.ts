import {CellRadius} from "./CellRadius";
import {RectangularCellField} from "./RectangularCellField";

export class RectangularCellRadius implements CellRadius {
    cellIndex: number;
    radius: number;
    private readonly cellField: RectangularCellField;
    private readonly initialCenterRow: number;
    private readonly initialCenterColumn: number;

    constructor(cellField: RectangularCellField, cellIndex?: number, radius?: number) {
        this.cellField = cellField;
        this.cellIndex = cellIndex || 0;
        this.radius = radius || 0;
        this.initialCenterColumn = Math.round(this.cellField.columnCount / 2);
        this.initialCenterRow = this.cellField.rowCount / 2;
    }

    forEach(consumer: (index: number) => void): void {
        const centerColumn = this.cellIndex % this.cellField.columnCount;
        const centerRow = (this.cellIndex - centerColumn) / this.cellField.columnCount;
        const startRow = centerRow - this.radius;
        const finishRow = centerRow + this.radius;

        for (let row = startRow; row <= finishRow; ++row) {
            const rowSizeMinus1 = 2 * this.radius - Math.abs(row - centerRow);
            const rem = rowSizeMinus1 % 2;
            const selectionRowShift = (rowSizeMinus1 - rem) / 2;
            const startColumn = centerColumn + rem * (centerRow % 2 == 0 ? 0 : -1) - selectionRowShift;
            const finishColumn = startColumn + rowSizeMinus1;

            for (let column = startColumn; column <= finishColumn; ++column) {
                const index = this.cellField.getIndex(row, column);
                consumer(index);
            }
        }
    }

    get size() {
        const r = this.radius;
        return 3 * r * r + 3 * r + 1;
    }

    getShiftedCellIndex(index: number): number {
        const centerColumn = this.cellIndex % this.cellField.columnCount;
        const centerRow = (this.cellIndex - centerColumn) / this.cellField.columnCount;

        const column = index % this.cellField.columnCount;
        const row = (index - centerColumn) / this.cellField.columnCount;

        return this.cellField.getIndex(row - centerRow + this.initialCenterRow, column - centerColumn + this.initialCenterColumn);
    }
}