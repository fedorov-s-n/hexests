import {Point2d} from "../util/Point2d";
import {Lazy} from "../util/Lazy";
import {LatticeCellField} from "../lattice/LatticeCellField";
import {ViewState} from "../three/ViewState";
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
 * A level of the world and the window the level is looked through.
 *
 * Everything is placed by where it is in the world, never by where it is in the lattice, so the
 * world stands still when the level changes and it is the lattice under it that turns and thickens.
 * How much of the world the window shows is the view's business, shared by all the levels.
 *
 * Panning does not move the window: it lets the data flow through it, a cell of the lattice at a
 * time, and the remainder below one cell moves the window itself, which keeps the motion smooth.
 *
 * A place in the window is named by its axial offset from the centre, which is never wrapped around
 * the torus: that is what puts the cells of a level smaller than the window around the centre
 * instead of spreading them over the whole rectangle.
 */
export class FinitePlaneAbstraction {
    /** Cells of the level; the window shows as many of them as it holds. */
    readonly size: number;
    readonly depth: number;
    readonly orientationOffset: Point2d;
    readonly textureWorkArea: Point2d;

    readonly cellField: LatticeCellField;
    readonly viewState: ViewState;
    /** The cell the window is centred on. */
    readonly centreQ: number;
    readonly centreR: number;
    readonly viewRadius: number;

    private readonly worldCentreX: number;
    private readonly worldCentreY: number;

    private _shiftQ: number = 0;
    private _shiftR: number = 0;

    private readonly _textureShift = new MutablePoint();
    private readonly _pointShift = new MutablePoint();
    private readonly _helperShift = new MutablePoint();
    private readonly _axial = new Array<number>(2);

    private readonly cornerWorldX = new Array<number>(6);
    private readonly cornerWorldY = new Array<number>(6);

    private readonly _points: Lazy<PointNumbering>;
    private readonly _cornerCells: Lazy<Int32Array>;

    private readonly _lower: Lazy<FinitePlaneAbstraction>;
    private readonly _higher: FinitePlaneAbstraction | undefined;

    constructor(cellField: LatticeCellField, viewState: ViewState, viewRadius: number,
                higher?: FinitePlaneAbstraction) {
        this.cellField = cellField;
        this.viewState = viewState;
        // never wider than the level itself: a level smaller than the window shows all it has, once
        this.viewRadius = Math.min(viewRadius, FinitePlaneAbstraction.radiusHolding(cellField.size));

        this.depth = 0;
        this.size = cellField.size;

        const world = cellField.world;
        this.worldCentreX = world.width / 2;
        this.worldCentreY = world.height / 2;
        this.textureWorkArea = new Point2d(world.width / world.columnsSize, world.height / world.rowsSize);
        this.orientationOffset = new Point2d(0, 0);

        for (let corner = 0; corner < 6; ++corner) {
            this.cornerWorldX[corner] = cellField.offsetX(CORNER_X[corner], CORNER_Y[corner]);
            this.cornerWorldY[corner] = cellField.offsetY(CORNER_X[corner], CORNER_Y[corner]);
        }

        const axial = new Array<number>(2);
        cellField.nearestVector(world.width / 2, world.height / 2, axial);
        const centre = cellField.indexOf(axial[0], axial[1]);
        this.centreQ = cellField.q(centre);
        this.centreR = cellField.r(centre);

        this._points = new Lazy(() => new PointNumbering(
            Math.ceil(this.viewRadius * Math.max(1, viewState.aspect)) + 1));
        this._cornerCells = new Lazy(() => new Int32Array(18 * this.size));
        this._lower = new Lazy(() => new FinitePlaneAbstraction(cellField.lower, viewState, viewRadius, this));
        this._higher = higher;
    }

    /** The smallest disc holding that many cells: three r squared plus three r plus one of them. */
    private static radiusHolding(size: number): number {
        return Math.ceil((-3 + Math.sqrt(9 + 12 * (size - 1))) / 6);
    }

    /** The cell of the window centre; the window is built around it. */
    get centreCell(): number {
        return this.cellField.indexOf(this.centreQ, this.centreR);
    }

    /**
     * Snaps a panning to a whole translation of the lattice: the data flows through the window a
     * cell at a time, the remainder is left to the window itself.
     */
    applyShift(dx: number, dy: number) {
        const view = this.viewState;
        const world = this.cellField.world;
        view.panX += dx * view.worldSpan;
        view.panY += dy * view.worldSpan;
        // the world closes on itself, so the pan is kept inside one turn around it
        view.panX -= world.width * Math.round(view.panX / world.width);
        view.panY -= world.height * Math.round(view.panY / world.height);
        this.refreshShift();
        // the window itself has moved nowhere, so nothing is left for the caller to accumulate
        this._helperShift.x = 0;
        this._helperShift.y = 0;
    }

    /** Splits the pan into whole cells of this lattice and the world remainder below one cell. */
    refreshShift() {
        const view = this.viewState;
        const axial = this._axial;
        // the vector closest to the pan, left as it is: cutting it down to the torus would leave a
        // whole turn of the world as the remainder, and the window would jump away
        this.cellField.nearestVector(view.panX, view.panY, axial);
        this._shiftQ = axial[0];
        this._shiftR = axial[1];

        const world = this.cellField.world;
        const steppedX = this.cellField.offsetX(cartX(axial[0], axial[1]), cartY(axial[0], axial[1]));
        const steppedY = this.cellField.offsetY(cartX(axial[0], axial[1]), cartY(axial[0], axial[1]));
        this._pointShift.x = -(view.panX - steppedX) / view.worldSpan;
        this._pointShift.y = -(view.panY - steppedY) / view.worldSpan;
        // the texture follows the cells the data has stepped over, not the pan itself: the part
        // below one cell has already moved the places, and counting it twice makes the world jump
        this._textureShift.x = -steppedX / world.columnsSize;
        this._textureShift.y = -steppedY / world.rowsSize;
    }

    /** The cell whose data a place of the window shows right now. */
    getShiftedCellIndex(index: number): number {
        return this.cellField.indexOf(
            this.cellField.q(index) + this._shiftQ,
            this.cellField.r(index) + this._shiftR
        );
    }

    /** The cell of the window at the given offset from its centre, panning left aside. */
    cellAtOffset(dq: number, dr: number): number {
        return this.cellField.indexOf(this.centreQ + dq, this.centreR + dr);
    }

    /** Where a place of the window stands in the world, counted from the middle of it. */
    offsetWorldX(dq: number, dr: number): number {
        return this.cellField.worldX(this.centreQ + dq, this.centreR + dr) - this.worldCentreX;
    }

    offsetWorldY(dq: number, dr: number): number {
        return this.cellField.worldY(this.centreQ + dq, this.centreR + dr) - this.worldCentreY;
    }

    /** Corners of a place of the window on the screen, as a share of the plane. */
    fillPointsXY(dq: number, dr: number, xs: number[], ys: number[]) {
        const span = this.viewState.worldSpan;
        const x = this.cellField.worldX(this.centreQ + dq, this.centreR + dr) - this.worldCentreX;
        const y = this.cellField.worldY(this.centreQ + dq, this.centreR + dr) - this.worldCentreY;
        for (let corner = 0; corner < 6; ++corner) {
            xs[corner] = 0.5 + (x + this.cornerWorldX[corner]) / span;
            ys[corner] = 0.5 + (y + this.cornerWorldY[corner]) / span;
        }
    }

    /** Centre of a place of the window on the screen. */
    fillCellXY(dq: number, dr: number, xs: number[], ys: number[], at: number) {
        const span = this.viewState.worldSpan;
        xs[at] = 0.5 + (this.cellField.worldX(this.centreQ + dq, this.centreR + dr) - this.worldCentreX) / span;
        ys[at] = 0.5 + (this.cellField.worldY(this.centreQ + dq, this.centreR + dr) - this.worldCentreY) / span;
    }

    /**
     * Corners of a place of the window in the world, as a share of it: where the texture is read
     * from. Taken from the offset, never wrapped, so the reading stays continuous across the window.
     */
    fillOffsetWorldPointsXY(dq: number, dr: number, xs: number[], ys: number[]) {
        const field = this.cellField;
        const world = field.world;
        const x = field.worldX(this.centreQ + dq, this.centreR + dr);
        const y = field.worldY(this.centreQ + dq, this.centreR + dr);
        for (let corner = 0; corner < 6; ++corner) {
            xs[corner] = (x + this.cornerWorldX[corner]) / world.columnsSize;
            ys[corner] = (y + this.cornerWorldY[corner]) / world.rowsSize;
        }
    }

    /**
     * Corners of a cell in the world, as a share of it: what the texture is painted by. The texture
     * is a picture of the whole level, not of the window.
     */
    fillWorldPointsXY(cellIndex: number, xs: number[], ys: number[]) {
        const field = this.cellField;
        const world = field.world;
        const x = field.worldX(field.q(cellIndex), field.r(cellIndex));
        const y = field.worldY(field.q(cellIndex), field.r(cellIndex));
        for (let corner = 0; corner < 6; ++corner) {
            xs[corner] = (x + this.cornerWorldX[corner]) / world.columnsSize;
            ys[corner] = (y + this.cornerWorldY[corner]) / world.rowsSize;
        }
    }

    /**
     * Height of every corner of a cell: a corner of a cell is a corner of the lattice below as well,
     * where three of its cells meet, so their mean is what the corner stands at.
     */
    fillPointsZ(cellIndex: number, zs: number[], lowerArray: number[]) {
        const cells = this.cornerCellsOf(cellIndex);
        const at = 18 * cellIndex;
        for (let corner = 0; corner < 6; ++corner) {
            zs[corner] = (lowerArray[cells[at + 3 * corner] - 1]
                + lowerArray[cells[at + 3 * corner + 1] - 1]
                + lowerArray[cells[at + 3 * corner + 2] - 1]) / 3;
        }
    }

    /** Kept one more than the cell, so that a zero means it has not been worked out yet. */
    private cornerCellsOf(cellIndex: number): Int32Array {
        const cells = this._cornerCells.value;
        const at = 18 * cellIndex;
        if (cells[at] === 0) {
            const lower = this.cellField.lower;
            const lq = refineQ(this.cellField.q(cellIndex), this.cellField.r(cellIndex));
            const lr = refineR(this.cellField.q(cellIndex), this.cellField.r(cellIndex));
            for (let corner = 0; corner < 6; ++corner) {
                const triple = CORNER_LOWER_CELLS[corner];
                for (let i = 0; i < 3; ++i) {
                    cells[at + 3 * corner + i] = lower.indexOf(lq + triple[i][0], lr + triple[i][1]) + 1;
                }
            }
        }
        return cells;
    }

    /** The eighteen cells of the level below that hold the six corners of a cell. */
    fillCornerCells(cellIndex: number, out: number[]) {
        const cells = this.cornerCellsOf(cellIndex);
        for (let i = 0; i < 18; ++i) out[i] = cells[18 * cellIndex + i] - 1;
    }

    /** Names of the corners of a place of the window, shared with the places next to it. */
    fillPointsP(dq: number, dr: number, ps?: number[]) {
        if (!ps) return;
        this._points.value.fill(dq, dr, ps);
    }

    /** The offset of the place of the window all the given corners belong to. */
    pickOffsetByPointIds(pointIds: number[], out: number[]): boolean {
        return this._points.value.pick(pointIds, out);
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
 * Names the corners of the window. A corner is named by its own tripled axial offset, which all
 * three places sharing it arrive at, so neighbours in the window share their corners and the mesh
 * has one point per corner.
 */
class PointNumbering {
    readonly count: number;

    private readonly cornerQ = new Array<number>(6);
    private readonly cornerR = new Array<number>(6);
    private readonly boxQ: number;
    private readonly boxR: number;
    private readonly boxWidth: number;
    private readonly box: Int32Array;
    /** Offset of each place that owns a corner, three at most. */
    private readonly pointOffsets: Int32Array;
    private readonly ownerCount: Int32Array;

    constructor(viewRadius: number) {
        for (let corner = 0; corner < 6; ++corner) {
            const directions = CORNER_DIRECTIONS[corner];
            this.cornerQ[corner] = DIRECTION_Q[directions[0]] + DIRECTION_Q[directions[1]];
            this.cornerR[corner] = DIRECTION_R[directions[0]] + DIRECTION_R[directions[1]];
        }

        const reach = 3 * (viewRadius + 1) + 2;
        this.boxQ = -reach;
        this.boxR = -reach;
        this.boxWidth = 2 * reach + 1;
        this.box = new Int32Array(this.boxWidth * this.boxWidth).fill(-1);

        // every corner of every place of the window, named once, together with the places owning it
        const owners: number[][] = [];
        let counter = 0;
        for (let dq = -viewRadius - 1; dq <= viewRadius + 1; ++dq) {
            for (let dr = -viewRadius - 1; dr <= viewRadius + 1; ++dr) {
                for (let corner = 0; corner < 6; ++corner) {
                    const boxIndex = this.indexOf(dq, dr, corner);
                    let id = this.box[boxIndex];
                    if (id < 0) {
                        id = counter++;
                        this.box[boxIndex] = id;
                        owners.push([]);
                    }
                    if (owners[id].length < 6) owners[id].push(dq, dr);
                }
            }
        }

        this.count = counter;
        this.ownerCount = Int32Array.from(owners.map(list => list.length / 2));
        this.pointOffsets = new Int32Array(6 * counter);
        owners.forEach((list, id) => list.forEach((value, i) => this.pointOffsets[6 * id + i] = value));
    }

    private indexOf(dq: number, dr: number, corner: number): number {
        const q = 3 * dq + this.cornerQ[corner] - this.boxQ;
        const r = 3 * dr + this.cornerR[corner] - this.boxR;
        return q + r * this.boxWidth;
    }

    fill(dq: number, dr: number, ps: number[]) {
        for (let corner = 0; corner < 6; ++corner) {
            ps[corner] = this.box[this.indexOf(dq, dr, corner)];
        }
    }

    pick(pointIds: number[], out: number[]): boolean {
        for (let i = 0; i < this.ownerCount[pointIds[0]]; ++i) {
            const dq = this.pointOffsets[6 * pointIds[0] + 2 * i];
            const dr = this.pointOffsets[6 * pointIds[0] + 2 * i + 1];
            let common = true;
            for (let j = 1; j < pointIds.length && common; ++j) {
                common = false;
                for (let k = 0; k < this.ownerCount[pointIds[j]]; ++k) {
                    if (this.pointOffsets[6 * pointIds[j] + 2 * k] === dq
                        && this.pointOffsets[6 * pointIds[j] + 2 * k + 1] === dr) {
                        common = true;
                        break;
                    }
                }
            }
            if (common) {
                out[0] = dq;
                out[1] = dr;
                return true;
            }
        }
        return false;
    }
}

class MutablePoint {
    x: number = 0;
    y: number = 0;
}
