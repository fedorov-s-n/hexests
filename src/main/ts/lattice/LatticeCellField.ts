import {CellField} from "../cell/CellField";
import {GraphSearchBuilder} from "../util/GraphSearchBuilder";
import {ArrayDataStorageFactory} from "../util/DataStorageFactory";
import {Lazy} from "../util/Lazy";
import {
    cartX,
    cartY,
    coarseQ,
    coarseR,
    DIRECTION_Q,
    DIRECTION_R,
    LEVEL_ANGLE,
    refineQ,
    refineR,
    roundAxial,
    SQRT3,
    SQRT7,
    WorldFrame
} from "./HexLattice";

/**
 * A hexagonal field on a torus. The torus is a fixed rectangle of the world; a level cuts it with
 * its own lattice, spanned by the two axial vectors a and b, which are the periods of the cyclic
 * boundary conditions. The level below uses the lattice that is seven times denser: its vectors
 * are the images of a and b, so the periods stay the very same rectangle and every cell of this
 * level covers exactly seven cells of that one.
 */
export class LatticeCellField implements CellField {
    readonly world: WorldFrame;
    readonly zoom: number;
    readonly size: number;

    /** The two periods of the torus in the axial coordinates of this level. */
    readonly aq: number;
    readonly ar: number;
    readonly bq: number;
    readonly br: number;

    /** Lattice to world transformation: a turn by the zoom angle and a shrink by sqrt(7) per level. */
    readonly scale: number;
    readonly cosAngle: number;
    readonly sinAngle: number;

    private readonly cellQ: Int32Array;
    private readonly cellR: Int32Array;
    private readonly boxQ: number;
    private readonly boxR: number;
    private readonly boxWidth: number;
    private readonly box: Int32Array;

    private readonly _neighbours: Lazy<Int32Array>;
    private readonly _lower: Lazy<LatticeCellField>;
    private readonly _higher: LatticeCellField | undefined;

    /** The topmost level: an even row count is required to keep the rows of the rectangle whole. */
    static root(rowCount: number, columnCount: number): LatticeCellField {
        if (rowCount % 2 !== 0) throw new Error(`Row count must be even, got ${rowCount}`);
        return new LatticeCellField(new WorldFrame(rowCount, columnCount), 0,
            columnCount, 0, -rowCount / 2, rowCount);
    }

    private constructor(world: WorldFrame, zoom: number,
                        aq: number, ar: number, bq: number, br: number,
                        higher?: LatticeCellField) {
        this.world = world;
        this.zoom = zoom;
        this.aq = aq;
        this.ar = ar;
        this.bq = bq;
        this.br = br;
        this.size = aq * br - ar * bq;
        if (this.size <= 0) throw new Error(`Degenerate torus (${aq},${ar}) (${bq},${br})`);

        this.scale = Math.pow(SQRT7, -zoom);
        this.cosAngle = Math.cos(zoom * LEVEL_ANGLE);
        this.sinAngle = Math.sin(zoom * LEVEL_ANGLE);

        const qs = [0, aq, bq, aq + bq];
        const rs = [0, ar, br, ar + br];
        this.boxQ = Math.min(...qs);
        this.boxR = Math.min(...rs);
        this.boxWidth = Math.max(...qs) - this.boxQ + 1;
        const boxHeight = Math.max(...rs) - this.boxR + 1;

        this.box = new Int32Array(this.boxWidth * boxHeight).fill(-1);
        this.cellQ = new Int32Array(this.size);
        this.cellR = new Int32Array(this.size);

        let counter = 0;
        for (let r = this.boxR; r < this.boxR + boxHeight; ++r) {
            for (let q = this.boxQ; q < this.boxQ + this.boxWidth; ++q) {
                if (this.periodsOf(q, r) !== 0) continue;
                this.cellQ[counter] = q;
                this.cellR[counter] = r;
                this.box[(q - this.boxQ) + (r - this.boxR) * this.boxWidth] = counter;
                ++counter;
            }
        }
        if (counter !== this.size) throw new Error(`Enumerated ${counter} cells out of ${this.size}`);

        this._neighbours = new Lazy(() => this.generateNeighbours());
        this._lower = new Lazy(() => new LatticeCellField(world, zoom + 1,
            refineQ(aq, ar), refineR(aq, ar), refineQ(bq, br), refineR(bq, br), this));
        this._higher = higher;
    }

    /** Zero when the axial point is the representative of its cell inside the torus rectangle. */
    private periodsOf(q: number, r: number): number {
        const na = Math.floor((q * this.br - r * this.bq) / this.size);
        const nb = Math.floor((this.aq * r - this.ar * q) / this.size);
        return na === 0 && nb === 0 ? 0 : 1;
    }

    /** Index of the cell an arbitrary axial point belongs to, cyclic boundaries applied. */
    indexOf(q: number, r: number): number {
        const na = Math.floor((q * this.br - r * this.bq) / this.size);
        const nb = Math.floor((this.aq * r - this.ar * q) / this.size);
        const cq = q - na * this.aq - nb * this.bq;
        const cr = r - na * this.ar - nb * this.br;
        return this.box[(cq - this.boxQ) + (cr - this.boxR) * this.boxWidth];
    }

    q(index: number): number {
        return this.cellQ[index];
    }

    r(index: number): number {
        return this.cellR[index];
    }

    /** Reduces a translation to the shortest equivalent one, so that shifts do not run away. */
    reduceVector(q: number, r: number, out: number[]) {
        const na = Math.round((q * this.br - r * this.bq) / this.size);
        const nb = Math.round((this.aq * r - this.ar * q) / this.size);
        out[0] = q - na * this.aq - nb * this.bq;
        out[1] = r - na * this.ar - nb * this.br;
    }

    /** World position of a point of the lattice, the same rectangle for every level. */
    worldX(q: number, r: number): number {
        const x = cartX(q, r);
        const y = cartY(q, r);
        return this.world.originX + this.scale * (x * this.cosAngle + y * this.sinAngle);
    }

    worldY(q: number, r: number): number {
        const x = cartX(q, r);
        const y = cartY(q, r);
        return this.world.originY + this.scale * (y * this.cosAngle - x * this.sinAngle);
    }

    /** World length of a lattice offset, without the origin: for corners and translations. */
    offsetX(x: number, y: number): number {
        return this.scale * (x * this.cosAngle + y * this.sinAngle);
    }

    offsetY(x: number, y: number): number {
        return this.scale * (y * this.cosAngle - x * this.sinAngle);
    }

    /** The lattice translation closest to a world offset. */
    nearestVector(dx: number, dy: number, out: number[]) {
        const x = (dx * this.cosAngle - dy * this.sinAngle) / this.scale;
        const y = (dx * this.sinAngle + dy * this.cosAngle) / this.scale;
        const r = y / 1.5;
        const q = x / SQRT3 - r / 2;
        roundAxial(q, r, out);
    }

    private generateNeighbours(): Int32Array {
        const neighbours = new Int32Array(6 * this.size);
        for (let index = 0; index < this.size; ++index) {
            const q = this.cellQ[index];
            const r = this.cellR[index];
            for (let direction = 0; direction < 6; ++direction) {
                neighbours[6 * index + direction] =
                    this.indexOf(q + DIRECTION_Q[direction], r + DIRECTION_R[direction]);
            }
        }
        return neighbours;
    }

    fillNeighbours(index: number, neighbours: number[]) {
        const array = this._neighbours.value;
        const offset = 6 * index;
        for (let direction = 0; direction < 6; ++direction) {
            neighbours[direction] = array[offset + direction];
        }
    }

    neighbour(index: number, direction: number): number {
        return this._neighbours.value[6 * index + direction];
    }

    search(...indices: number[]): GraphSearchBuilder<number> {
        if (indices.length === 0) indices = Array.from(new Array(this.size).keys());
        const builder = new GraphSearchBuilder<number>(indices, index => {
            const neighbours = new Array<number>(6);
            this.fillNeighbours(index, neighbours);
            return neighbours;
        });
        return builder.withStorageFactory(new ArrayDataStorageFactory(this.size));
    }

    forEach(consumer: (index: number) => void) {
        for (let i = 0; i < this.size; ++i) {
            consumer(i);
        }
    }

    get lower(): LatticeCellField {
        return this._lower.value;
    }

    get higher(): LatticeCellField | undefined {
        return this._higher;
    }

    /** The cell of the level below holding the centre of the seven cells this one covers. */
    mapIndexToLowerLevel(index: number): number {
        const q = this.cellQ[index];
        const r = this.cellR[index];
        return this.lower.indexOf(refineQ(q, r), refineR(q, r));
    }

    /** All seven cells of the level below covered by this one: the centre first. */
    fillLowerCells(index: number, cells: number[]) {
        const lower = this.lower;
        const q = refineQ(this.cellQ[index], this.cellR[index]);
        const r = refineR(this.cellQ[index], this.cellR[index]);
        cells[0] = lower.indexOf(q, r);
        for (let direction = 0; direction < 6; ++direction) {
            cells[direction + 1] = lower.indexOf(q + DIRECTION_Q[direction], r + DIRECTION_R[direction]);
        }
    }

    /**
     * Spreads the data of this level over the level below, linearly over the triangles of this
     * lattice: a cell holding a centre takes its value as is, the rest are mixed from the three
     * closest cells of this level.
     */
    interpolate(highData: number[], lowData: number[]) {
        const lower = this.lower;
        for (let index = 0; index < lower.size; ++index) {
            const fq = coarseQ(lower.cellQ[index], lower.cellR[index]);
            const fr = coarseR(lower.cellQ[index], lower.cellR[index]);
            const iq = Math.floor(fq);
            const ir = Math.floor(fr);
            const a = fq - iq;
            const b = fr - ir;

            let value: number;
            if (a + b <= 1) {
                value = (1 - a - b) * highData[this.indexOf(iq, ir)]
                    + a * highData[this.indexOf(iq + 1, ir)]
                    + b * highData[this.indexOf(iq, ir + 1)];
            } else {
                value = (1 - b) * highData[this.indexOf(iq + 1, ir)]
                    + (1 - a) * highData[this.indexOf(iq, ir + 1)]
                    + (a + b - 1) * highData[this.indexOf(iq + 1, ir + 1)];
            }
            lowData[index] = value;
        }
    }

    /**
     * Collects the data of the level below into this one: a cell takes the mean of the seven cells
     * it covers. The counterpart of the interpolation, for the levels above the one the data was
     * made on.
     */
    gather(highData: number[], lowData: number[]) {
        const cells = new Array<number>(7);
        for (let index = 0; index < this.size; ++index) {
            this.fillLowerCells(index, cells);
            let sum = 0;
            for (let i = 0; i < 7; ++i) sum += lowData[cells[i]];
            highData[index] = sum / 7;
        }
    }
}
