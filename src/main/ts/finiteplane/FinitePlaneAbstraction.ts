import {RectangularCellField} from "../cell/RectangularCellField";
import {Point2d} from "../util/Point2d";
import {Lazy} from "../util/Lazy";
import {FinitePlaneOrientation, getOrientation} from "./Orientation";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {CellShiftSupplier} from "../cell/CellShiftSupplier";

const SQRT3 = Math.sqrt(3);
const COS_MODS = [0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
const SIN_MODS = [+1, +0.5, -0.5, -1, -0.5, +0.5];

const ROW_ID_SHIFTS = [3, 2, 1, 0, 1, 2];
const ODD_COLUMN_ID_SHIFTS = [0, 1, 1, 0, 0, 0];
const EVEN_COLUMN_ID_SHIFTS = [1, 1, 1, 1, 0, 0];


export class FinitePlaneAbstraction implements CellShiftSupplier {
    static NEIGHBOURS = new Array<number>(6);

    readonly size: number;
    readonly orientationOffset: Point2d;
    readonly depth: number;

    private _rowShift: number = 0;
    private _columnShift: number = 0;
    private _rowShiftMod2: number = 0;

    readonly textureWorkArea: Point2d;
    private readonly _textureShift = new MutablePoint();
    private readonly _pointShift = new MutablePoint();
    private readonly _helperShift = new MutablePoint();

    private readonly cellField: RectangularCellField;
    private readonly orientation: FinitePlaneOrientation;

    private readonly columnsSize: number;
    private readonly rowsSize: number;
    private readonly rowMult: number;
    private readonly columnMult: number;

    private readonly _lower: Lazy<FinitePlaneAbstraction>;
    private readonly _higher: FinitePlaneAbstraction | undefined;

    constructor(cellField: RectangularCellField, higher?: FinitePlaneAbstraction) {
        this.cellField = cellField;

        this.depth = 0;
        this.size = cellField.size;
        this.orientation = getOrientation(cellField.zoom);

        this.rowsSize = 1.5 * cellField.rowCount + 0.5;
        this.columnsSize = SQRT3 * (cellField.columnCount + 0.5);
        this.rowMult = 1.5 / (1.5 * cellField.rowCount + 0.5);
        this.columnMult = 1 / (cellField.columnCount + 0.5);

        const rowArea = cellField.rowCount * this.rowMult;
        const columnArea = cellField.columnCount * this.columnMult;
        this.textureWorkArea = new Point2d(
            this.orientation.getXPos(rowArea, columnArea),
            this.orientation.getYPos(rowArea, columnArea)
        );

        // todo: recalculate
        const columnShift = -0.5 / (cellField.columnCount + 0.5);
        this.orientationOffset = new Point2d(
            this.orientation.getXPos(0, columnShift) + (higher?.orientationOffset?.x || 0),
            this.orientation.getYPos(0, columnShift) + (higher?.orientationOffset?.y || 0)
        );

        this._lower = new Lazy(() => new FinitePlaneAbstraction(cellField.lower, this));
        this._higher = higher;
    }

    applyShift(dx: number, dy: number) {
        const rowCount = this.cellField.rowCount;
        const columnCount = this.cellField.columnCount;

        let rowShift = Math.round(this.orientation.getRowPos(dx, dy) / this.rowMult);
        let columnShift = Math.round(this.orientation.getColumnPos(dx, dy) / this.columnMult);

        const rowShiftMod2 = Math.abs(rowShift) % 2;
        const columnCorrection = rowShiftMod2 * 0.5 * this.columnMult;
        let dRow = rowShift * this.rowMult;
        let dColumn = (columnShift) * this.columnMult + columnCorrection;

        let actualX = this.orientation.getXPos(dRow, dColumn);
        let actualY = this.orientation.getYPos(dRow, dColumn);

        const remainedX = dx - actualX;
        const remainedY = dy - actualY;

        while (rowShift > rowCount) rowShift -= rowCount;
        while (rowShift < -rowCount) rowShift += rowCount;
        while (columnShift > columnCount) columnShift -= columnCount;
        while (columnShift < -columnCount) columnShift += columnCount;

        dRow = (rowShift) * this.rowMult;
        dColumn = (columnShift) * this.columnMult;
        dColumn += columnCorrection;

        actualX = this.orientation.getXPos(dRow, dColumn);
        actualY = this.orientation.getYPos(dRow, dColumn);

        this._helperShift.x = actualX + remainedX;
        this._helperShift.y = actualY + remainedY;
        this._pointShift.x = -remainedX;
        this._pointShift.y = -remainedY;
        this._textureShift.x = actualX;
        this._textureShift.y = actualY;
        this._rowShift = rowShift;
        this._rowShiftMod2 = rowShiftMod2;
        this._columnShift = columnShift;
    }

    getShiftedCellIndex(index: number) {
        return this.getShiftedCellIndex0(index, -1);
    }

    private getShiftedCellIndex0(index: number, coeff: number) {
        const column = index % this.cellField.columnCount;
        const row = (index - column) / this.cellField.columnCount;
        const colMod = (row % 2) * this._rowShiftMod2;
        return this.cellField.getIndex(
            row + coeff * this._rowShift,
            column + coeff * this._columnShift - colMod
        );
    }

    fillPointsXY(cellIndex: number, xs: number[], ys: number[]) {
        const column = cellIndex % this.cellField.columnCount;
        const row = (cellIndex - column) / this.cellField.columnCount;

        const colCellPosAdd = row % 2 === 0 ? 1 : 0.5;
        for (let order = 0; order < 6; ++order) {
            const rowPos = (SIN_MODS[order] + 1.5 * row + 1) / this.rowsSize;
            const columnPos = (COS_MODS[order] + SQRT3 * (column + colCellPosAdd)) / this.columnsSize;
            xs[order] = this.orientation.getXPos(rowPos, columnPos);
            ys[order] = this.orientation.getYPos(rowPos, columnPos);
        }
    }

    fillPointsZ(cellIndex: number, zs: number[], accessor: CellDataAccessor<number>) {
        const lowCellIndex = this.cellField.mapIndexToLowerLevel(cellIndex);
        this.cellField.lower.fillNeighbours(lowCellIndex, FinitePlaneAbstraction.NEIGHBOURS);
        const lowerAccessor = accessor.lower;
        for (let arrayIndex = 0; arrayIndex < 6; ++arrayIndex) {
            const index = FinitePlaneAbstraction.NEIGHBOURS[arrayIndex];
            zs[arrayIndex] = lowerAccessor.array[index];
        }
    }

    fillPointsP(cellIndex: number, ps?: number[]) {
        const column = cellIndex % this.cellField.columnCount;
        const row = (cellIndex - column) / this.cellField.columnCount;

        if (ps) {
            const columnIdShifts = row % 2 === 0 ? EVEN_COLUMN_ID_SHIFTS : ODD_COLUMN_ID_SHIFTS;
            const rowSize = this.cellField.columnCount + 1;
            for (let order = 0; order < 6; ++order) {
                ps[order] = (2 * row + ROW_ID_SHIFTS[order]) * rowSize + column + columnIdShifts[order];
            }
        }
    }

    pickCellByPointIds(pointIds: number[]): number | undefined {
        const rowSize = this.cellField.columnCount + 1;
        const hits: number[] = [];

        for (let i = 0; i < pointIds.length; ++i) {
            const pointId = pointIds[i];
            const cp = pointId % rowSize;
            const cs = Math.max(0, cp - 1);
            const cf = Math.min(cp, this.cellField.columnCount - 1);

            const r2f = (pointId - cp) / rowSize;
            const r2s = Math.max(0, r2f - 3);
            const rs = (r2s - (r2s % 2)) / 2;
            const rf = Math.min((r2f - (r2f % 2)) / 2, this.cellField.rowCount - 1);

            for (let column = cs; column <= cf; ++column) {
                for (let row = rs; row <= rf; ++row) {
                    const shiftedIndex = row * this.cellField.columnCount + column;
                    hits[shiftedIndex] = (hits[shiftedIndex] || 0) + 1;
                }
            }
        }

        const shiftedIndex = hits.findIndex(v => v === pointIds.length);
        return shiftedIndex >= 0 ? this.getShiftedCellIndex0(shiftedIndex, 1) : undefined;
    }

    get pointIdCount(): number {
        return (2 * this.cellField.rowCount + 4) * (this.cellField.columnCount + 1);
    }

    get zoom(): number {
        return this.cellField.zoom;
    }

    get lower(): FinitePlaneAbstraction {
        return this._lower.value;
    }

    get higher(): FinitePlaneAbstraction | undefined {
        return this._higher;
    }

    get textureShift(): Point2d {
        return this._textureShift as Point2d;
    }

    get helperShift(): Point2d {
        return this._helperShift as Point2d;
    }

    get pointShift(): Point2d {
        return this._pointShift as Point2d;
    }
}

class MutablePoint {
    x: number = 0;
    y: number = 0;
}