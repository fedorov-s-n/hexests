import {RectangularCellField} from "../cell/RectangularCellField";
import {Point2d} from "../util/Point2d";
import {Lazy} from "../util/Lazy";
import {FinitePlaneOrientation, getOrientation} from "./Orientation";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {SettingsStub} from "../util/SettingsStub";

const SQRT3 = Math.sqrt(3);
const COS_MODS = [0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
const SIN_MODS = [+1, +0.5, -0.5, -1, -0.5, +0.5];

const ROW_ID_SHIFTS = [3, 2, 1, 0, 1, 2];
const ODD_COLUMN_ID_SHIFTS = [0, 1, 1, 0, 0, 0];
const EVEN_COLUMN_ID_SHIFTS = [1, 1, 1, 1, 0, 0];

const NEIGHBOURS = new Array<number>(6);

export class FinitePlaneAbstraction {
    readonly size: number;
    readonly orientationOffset: Point2d;
    readonly depth: number;

    private _rowShift: number = 0;
    private _columnShift: number = 0;
    private _rowShiftMod2: number = 0;

    readonly textureWorkArea: Point2d;
    private readonly _textureShift = new MutablePoint();
    private readonly _meshShift = new MutablePoint();
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

    applyShift(dx: number, dy: number, settingsStub: SettingsStub) {
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
        this._meshShift.x = -remainedX * settingsStub.planeSideSize;
        this._meshShift.y = -remainedY * settingsStub.planeSideSize;
        this._textureShift.x = actualX;
        this._textureShift.y = actualY;
        this._rowShift = rowShift;
        this._rowShiftMod2 = rowShiftMod2;
        this._columnShift = columnShift;
    }

    private getShiftedCellIndex(index: number) {
        const column = index % this.cellField.columnCount;
        const row = (index - column) / this.cellField.columnCount;
        const colMod = (row % 2) * this._rowShiftMod2;
        return this.cellField.getIndex(
            row - this._rowShift,
            column - this._columnShift - colMod
        );
    }

    fillPointsXYZP(cellIndex: number, accessor?: CellDataAccessor<number>, xs?: number[], ys?: number[], zs?: number[], ps?: number[]) {
        if (xs && ys) {
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

        if (zs && accessor) {
            const lowCellIndex = this.cellField.mapIndexToLowerLevel(cellIndex);
            this.cellField.lower.fillNeighbours(lowCellIndex, NEIGHBOURS);
            for (let arrayIndex = 0; arrayIndex < 6; ++arrayIndex) {
                const index = NEIGHBOURS[arrayIndex];
                zs[arrayIndex] = accessor.array[index];
            }
        }

        if (ps) {
            const shiftedIndex = this.getShiftedCellIndex(cellIndex);
            const column = shiftedIndex % this.cellField.columnCount;
            const row = (shiftedIndex - column) / this.cellField.columnCount;
            const columnIdShifts = row % 2 === 0 ? EVEN_COLUMN_ID_SHIFTS : ODD_COLUMN_ID_SHIFTS;
            const rowSize = this.cellField.columnCount + 1;
            for (let order = 0; order < 6; ++order) {
                ps[order] = (2 * row + ROW_ID_SHIFTS[order]) * rowSize + column + columnIdShifts[order];
            }
        }
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

    get meshShift(): Point2d {
        return this._meshShift as Point2d;
    }

    get helperShift(): Point2d {
        return this._helperShift as Point2d;
    }
}

class MutablePoint {
    x: number = 0;
    y: number = 0;
}