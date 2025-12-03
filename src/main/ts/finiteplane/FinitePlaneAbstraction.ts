import {RectangularCellField} from "../cell/RectangularCellField";
import {Point2d} from "./Point2d";
import {Lazy} from "../util/Lazy";

const SQRT3 = Math.sqrt(3);
const COS_MODS = [0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
const SIN_MODS = [+1, +0.5, -0.5, -1, -0.5, +0.5];

export class FinitePlaneAbstraction {
    private readonly cellField: RectangularCellField;
    public readonly orientation: FinitePlaneOrientation;

    private readonly columnsSize: number;
    private readonly rowsSize: number;
    private readonly rowMult: number;
    private readonly columnMult: number;

    public readonly size: number;
    public readonly workArea: Point2d;
    public readonly offset: Point2d;
    public depth: number;
    private readonly shiftData: ShiftData;

    private readonly _lower: Lazy<FinitePlaneAbstraction>;
    private readonly _higher: FinitePlaneAbstraction | undefined;

    constructor(cellField: RectangularCellField, higher?: FinitePlaneAbstraction) {
        this.cellField = cellField;

        this.depth = 0;
        this.size = cellField.size;
        this.orientation = cellField.zoom % 2 === 0 ? EVEN_ORIENTATION : ODD_ORIENTATION;

        this.rowsSize = 1.5 * cellField.rowCount + 0.5;
        this.columnsSize = SQRT3 * (cellField.columnCount + 0.5);
        this.rowMult = 1.5 / (1.5 * cellField.rowCount + 0.5);
        this.columnMult = 1 / (cellField.columnCount + 0.5);

        const rowArea = cellField.rowCount * this.rowMult;
        const columnArea = cellField.columnCount * this.columnMult;
        this.workArea = new Point2d(
            this.orientation.getXPos(rowArea, columnArea),
            this.orientation.getYPos(rowArea, columnArea)
        );

        // todo: recalculate
        const columnShift = -0.5 / (cellField.columnCount + 0.5);
        this.offset = new Point2d(
            this.orientation.getXPos(0, columnShift) + (higher?.offset?.x || 0),
            this.orientation.getYPos(0, columnShift) + (higher?.offset?.y || 0)
        );

        this.shiftData = new ShiftData();

        this._lower = new Lazy(() => new FinitePlaneAbstraction(cellField.lower, this));
        this._higher = higher;
    }

    get totalShift(): Point2d {
        return this.shiftData.xyTotalShift as Point2d;
    }

    get shift(): Point2d {
        return this.shiftData.xyShift as Point2d;
    }

    set shift(value: Point2d) {
        const dx = value.x;
        const dy = value.y;
        const rowCount = this.cellField.rowCount;
        const columnCount = this.cellField.columnCount;

        let rowShift = Math.round(this.orientation.getRowPos(dx, dy) / this.rowMult);
        let columnShift = Math.round(this.orientation.getColumnPos(dx, dy) / this.columnMult);

        const rowShiftMod2 = Math.abs(rowShift) % 2;
        const columnCorrection = rowShiftMod2 * 0.5 * this.columnMult;
        let dRow = (rowShift) * this.rowMult;
        let dColumn = (columnShift) * this.columnMult - columnCorrection;

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
        dColumn -= columnCorrection;

        actualX = this.orientation.getXPos(dRow, dColumn);
        actualY = this.orientation.getYPos(dRow, dColumn);

        this.shiftData.xyShift.x = actualX;
        this.shiftData.xyShift.y = actualY;
        this.shiftData.xyTotalShift.x = actualX + remainedX;
        this.shiftData.xyTotalShift.y = actualY + remainedY;
        this.shiftData.rowShiftMod2 = rowShiftMod2;
        this.shiftData.rowShift = rowShift;
        this.shiftData.columnShift = columnShift;
    }

    private getShiftedCellIndex(index: number) {
        const column = index % this.cellField.columnCount;
        const row = (index - column) / this.cellField.columnCount;
        const colMod = -(row % 2) * this.shiftData.rowShiftMod2;
        return this.cellField.getIndex(
            row + this.shiftData.rowShift,
            column + this.shiftData.columnShift + colMod
        );
    }

    fillPointsXY(cellIndex: number, xs: number[], ys: number[]) {
        const column = cellIndex % this.cellField.columnCount;
        const row = (cellIndex - column) / this.cellField.columnCount;

        for (let order = 0; order < 6; ++order) {
            const colCellPosAdd = row % 2 === 0 ? 1 : 0.5;
            const rowPos = (SIN_MODS[order] + 1.5 * row + 1) / this.rowsSize;
            const columnPos = (COS_MODS[order] + SQRT3 * (column + colCellPosAdd)) / this.columnsSize;
            xs[order] = this.orientation.getXPos(rowPos, columnPos);
            ys[order] = this.orientation.getYPos(rowPos, columnPos);
        }
    }

    fillShiftedCellPointIndexes(cellIndex: number, neighbours: number[]) {
        const shiftedCellIndex = this.getShiftedCellIndex(cellIndex);
        const lowCellIndex = this.cellField.mapIndexToLowerLevel(shiftedCellIndex);
        this.cellField.lower.fillNeighbours(lowCellIndex, neighbours); // knows about traverse order
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

    get columnCount(): number {
        return this.cellField.columnCount;
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
    rowShiftMod2: number = 0;
    rowShift: number = 0;
    columnShift: number = 0;
    readonly xyShift = new MutablePoint();
    readonly xyTotalShift = new MutablePoint();
}

class MutablePoint {
    x: number = 0;
    y: number = 0;
}

const ODD_ORIENTATION = new OddPlaneOrientation();
const EVEN_ORIENTATION = new EvenPlaneOrientation();