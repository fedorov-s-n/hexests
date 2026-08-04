import {Point2d} from "../util/Point2d";
import {Lazy} from "../util/Lazy";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {CellShiftSupplier} from "../cell/CellShiftSupplier";
import {LatticeCellField} from "../lattice/LatticeCellField";
import {
    cartX,
    cartY,
    CORNER_DIRECTIONS,
    CORNER_LOWER_CELLS,
    CORNER_X,
    CORNER_Y,
    DIRECTION_Q,
    DIRECTION_R,
    refineQ,
    refineR
} from "../lattice/HexLattice";

/**
 * Places the cells of one level into the world rectangle: positions of the cells and of their
 * corners, identity of the corners shared by neighbours, and the panning of the whole level.
 *
 * Every level lives in the same rectangle, so a cell of a level and the seven cells it covers on
 * the level below occupy the very same place; the lattice below is only turned and denser.
 */
export class FinitePlaneAbstraction implements CellShiftSupplier {
    static NEIGHBOURS = new Array<number>(6);

    readonly size: number;
    readonly orientationOffset: Point2d;
    readonly depth: number;
    readonly textureWorkArea: Point2d;

    private readonly cellField: LatticeCellField;

    private _shiftQ: number = 0;
    private _shiftR: number = 0;

    private readonly _textureShift = new MutablePoint();
    private readonly _pointShift = new MutablePoint();
    private readonly _helperShift = new MutablePoint();
    private readonly _axial = new Array<number>(2);

    private readonly cornerOffsetX = new Array<number>(6);
    private readonly cornerOffsetY = new Array<number>(6);

    private readonly _points: Lazy<PointNumbering>;
    private readonly _cornerLowerCells: Lazy<Int32Array>;

    private readonly _lower: Lazy<FinitePlaneAbstraction>;
    private readonly _higher: FinitePlaneAbstraction | undefined;

    constructor(cellField: LatticeCellField, higher?: FinitePlaneAbstraction) {
        this.cellField = cellField;

        this.depth = 0;
        this.size = cellField.size;

        const world = cellField.world;
        this.textureWorkArea = new Point2d(world.width / world.columnsSize, world.height / world.rowsSize);
        this.orientationOffset = new Point2d(0, 0);

        for (let corner = 0; corner < 6; ++corner) {
            this.cornerOffsetX[corner] = cellField.offsetX(CORNER_X[corner], CORNER_Y[corner]);
            this.cornerOffsetY[corner] = cellField.offsetY(CORNER_X[corner], CORNER_Y[corner]);
        }

        this._points = new Lazy(() => new PointNumbering(cellField));
        this._cornerLowerCells = new Lazy(() => this.generateCornerLowerCells());

        this._lower = new Lazy(() => new FinitePlaneAbstraction(cellField.lower, this));
        this._higher = higher;
    }

    /**
     * Snaps a panning of the level to a whole translation of its lattice: the cells are then
     * renumbered instead of being moved, and only the remainder below one cell is left to the
     * points themselves.
     */
    applyShift(dx: number, dy: number) {
        const world = this.cellField.world;
        const axial = this._axial;

        this.cellField.nearestVector(dx * world.columnsSize, dy * world.rowsSize, axial);
        const fullX = this.cellField.offsetX(cartX(axial[0], axial[1]), cartY(axial[0], axial[1])) / world.columnsSize;
        const fullY = this.cellField.offsetY(cartX(axial[0], axial[1]), cartY(axial[0], axial[1])) / world.rowsSize;

        const remainedX = dx - fullX;
        const remainedY = dy - fullY;

        this.cellField.reduceVector(axial[0], axial[1], axial);
        const actualX = this.cellField.offsetX(cartX(axial[0], axial[1]), cartY(axial[0], axial[1])) / world.columnsSize;
        const actualY = this.cellField.offsetY(cartX(axial[0], axial[1]), cartY(axial[0], axial[1])) / world.rowsSize;

        this._helperShift.x = actualX + remainedX;
        this._helperShift.y = actualY + remainedY;
        this._pointShift.x = -remainedX;
        this._pointShift.y = -remainedY;
        this._textureShift.x = actualX;
        this._textureShift.y = actualY;
        this._shiftQ = axial[0];
        this._shiftR = axial[1];
    }

    getShiftedCellIndex(index: number) {
        return this.getShiftedCellIndex0(index, -1);
    }

    private getShiftedCellIndex0(index: number, coeff: number) {
        return this.cellField.indexOf(
            this.cellField.q(index) + coeff * this._shiftQ,
            this.cellField.r(index) + coeff * this._shiftR
        );
    }

    fillPointsXY(cellIndex: number, xs: number[], ys: number[]) {
        const world = this.cellField.world;
        const x = this.cellField.worldX(this.cellField.q(cellIndex), this.cellField.r(cellIndex));
        const y = this.cellField.worldY(this.cellField.q(cellIndex), this.cellField.r(cellIndex));
        for (let corner = 0; corner < 6; ++corner) {
            xs[corner] = (x + this.cornerOffsetX[corner]) / world.columnsSize;
            ys[corner] = (y + this.cornerOffsetY[corner]) / world.rowsSize;
        }
    }

    /**
     * Height of every corner: a corner of a cell is a corner of the lattice below as well, where
     * three of its cells meet, so their mean is what the corner stands at.
     */
    fillPointsZ(cellIndex: number, zs: number[], accessor: CellDataAccessor<number>) {
        const cells = this._cornerLowerCells.value;
        const lowerArray = accessor.lower.array;
        const offset = 18 * cellIndex;
        for (let corner = 0; corner < 6; ++corner) {
            zs[corner] = (lowerArray[cells[offset + 3 * corner]]
                + lowerArray[cells[offset + 3 * corner + 1]]
                + lowerArray[cells[offset + 3 * corner + 2]]) / 3;
        }
    }

    fillPointsP(cellIndex: number, ps?: number[]) {
        if (!ps) return;
        const ids = this._points.value.cellPointIds;
        for (let corner = 0; corner < 6; ++corner) {
            ps[corner] = ids[6 * cellIndex + corner];
        }
    }

    fillCellsXY(cellIndexes: number[], xs: number[], ys: number[]) {
        const world = this.cellField.world;
        for (let i = 0; i < cellIndexes.length; ++i) {
            const cellIndex = this.getShiftedCellIndex(cellIndexes[i]);
            xs[i] = this.cellField.worldX(this.cellField.q(cellIndex), this.cellField.r(cellIndex)) / world.columnsSize;
            ys[i] = this.cellField.worldY(this.cellField.q(cellIndex), this.cellField.r(cellIndex)) / world.rowsSize;
        }
    }

    /** The cell all the given corners belong to, if there is exactly one such cell. */
    pickCellByPointIds(pointIds: number[]): number | undefined {
        const points = this._points.value;
        for (let i = 0; i < 3; ++i) {
            const candidate = points.pointCells[3 * pointIds[0] + i];
            if (candidate < 0) continue;
            let common = true;
            for (let j = 1; j < pointIds.length && common; ++j) {
                common = points.pointCells[3 * pointIds[j]] === candidate
                    || points.pointCells[3 * pointIds[j] + 1] === candidate
                    || points.pointCells[3 * pointIds[j] + 2] === candidate;
            }
            if (common) return this.getShiftedCellIndex0(candidate, +1);
        }
        return undefined;
    }

    private generateCornerLowerCells(): Int32Array {
        const lower = this.cellField.lower;
        const cells = new Int32Array(18 * this.size);
        for (let index = 0; index < this.size; ++index) {
            const q = this.cellField.q(index);
            const r = this.cellField.r(index);
            const lq = refineQ(q, r);
            const lr = refineR(q, r);
            for (let corner = 0; corner < 6; ++corner) {
                const triple = CORNER_LOWER_CELLS[corner];
                for (let i = 0; i < 3; ++i) {
                    cells[18 * index + 3 * corner + i] =
                        lower.indexOf(lq + triple[i][0], lr + triple[i][1]);
                }
            }
        }
        return cells;
    }

    get pointIdCount(): number {
        return this._points.value.count;
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

/**
 * Numbers the corners of the lattice. A corner is shared by three cells, so it is named by the
 * tripled axial point of the corner itself, which all three of them arrive at.
 *
 * The naming is deliberately not taken modulo the periods of the torus: the plane is drawn as an
 * open patch, so the cells at the opposite edges must not share their corners -- they stand a
 * whole period apart and could not agree on where the corner is.
 */
class PointNumbering {
    readonly count: number;
    /** Six corner ids per cell, in the corner order of the geometry. */
    readonly cellPointIds: Int32Array;
    /** Up to three cells per corner; the ones at the edges of the patch have fewer. */
    readonly pointCells: Int32Array;

    constructor(cellField: LatticeCellField) {
        const size = cellField.size;
        let minQ = 0, maxQ = 0, minR = 0, maxR = 0;
        for (let index = 0; index < size; ++index) {
            minQ = Math.min(minQ, cellField.q(index));
            maxQ = Math.max(maxQ, cellField.q(index));
            minR = Math.min(minR, cellField.r(index));
            maxR = Math.max(maxR, cellField.r(index));
        }
        const boxQ = 3 * minQ - 2;
        const boxR = 3 * minR - 2;
        const boxWidth = 3 * maxQ + 2 - boxQ + 1;
        const boxHeight = 3 * maxR + 2 - boxR + 1;
        const box = new Int32Array(boxWidth * boxHeight).fill(-1);

        this.cellPointIds = new Int32Array(6 * size);
        const pointCells: number[] = [];
        let counter = 0;

        for (let index = 0; index < size; ++index) {
            const q = 3 * cellField.q(index);
            const r = 3 * cellField.r(index);
            for (let corner = 0; corner < 6; ++corner) {
                const directions = CORNER_DIRECTIONS[corner];
                const pq = q + DIRECTION_Q[directions[0]] + DIRECTION_Q[directions[1]];
                const pr = r + DIRECTION_R[directions[0]] + DIRECTION_R[directions[1]];

                const boxIndex = (pq - boxQ) + (pr - boxR) * boxWidth;
                let id = box[boxIndex];
                if (id < 0) {
                    id = counter++;
                    box[boxIndex] = id;
                    pointCells.push(-1, -1, -1);
                }
                this.cellPointIds[6 * index + corner] = id;
                for (let i = 0; i < 3; ++i) {
                    if (pointCells[3 * id + i] < 0) {
                        pointCells[3 * id + i] = index;
                        break;
                    }
                }
            }
        }

        this.count = counter;
        this.pointCells = Int32Array.from(pointCells);
    }
}

class MutablePoint {
    x: number = 0;
    y: number = 0;
}
