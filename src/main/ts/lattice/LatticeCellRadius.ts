import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {SQRT3} from "./HexLattice";

/**
 * The disc of places of a window that are drawn, by hexagonal distance from its anchor.
 *
 * A place is kept only if no place before it shows the same cell, so a level holding fewer cells
 * than the disc draws each of them exactly once, gathered around the centre, instead of repeating
 * them around the torus.
 */
export class LatticeCellRadius implements CellRadius {
    readonly radius: number;

    private readonly abstraction: FinitePlaneAbstraction;

    private anchorQ: number = 0;
    private anchorR: number = 0;

    private cells: Int32Array = new Int32Array(0);
    private offsets: Int32Array = new Int32Array(0);
    private localOffsets: Int32Array = new Int32Array(0);
    /** Place of every cell of the level, one more than the place, so that zero means none. */
    private placeByCell: Int32Array = new Int32Array(0);

    constructor(abstraction: FinitePlaneAbstraction, radius: number) {
        this.abstraction = abstraction;
        this.radius = radius;
        this.rebuild();
    }

    get size(): number {
        return this.cells.length;
    }

    setAnchor(dq: number, dr: number) {
        if (dq === this.anchorQ && dr === this.anchorR) return;
        this.anchorQ = dq;
        this.anchorR = dr;
        this.rebuild();
    }

    forEach(consumer: (index: number) => void): void {
        for (let i = 0; i < this.cells.length; ++i) {
            consumer(this.cells[i]);
        }
    }

    fillOffset(index: number, out: number[]): boolean {
        const at = this.placeByCell[index] - 1;
        if (at < 0) return false;
        out[0] = this.offsets[2 * at];
        out[1] = this.offsets[2 * at + 1];
        return true;
    }

    fillPointOffset(index: number, out: number[]): boolean {
        const at = this.placeByCell[index] - 1;
        if (at < 0) return false;
        out[0] = this.localOffsets[2 * at];
        out[1] = this.localOffsets[2 * at + 1];
        return true;
    }

    private rebuild() {
        // the window reaches as far as the screen does: a disc stretched to its shape, and measured
        // in the world, whose axes the screen keeps, not in the axes of this level's own lattice
        const aspect = Math.max(1, this.abstraction.viewState.aspect);
        const cell = SQRT3 * this.abstraction.cellField.scale;
        const tall = cell * this.radius;
        const wide = tall * aspect;
        const reach = Math.ceil(2 * wide / cell) + 1;
        const baseX = this.abstraction.offsetWorldX(this.anchorQ, this.anchorR);
        const baseY = this.abstraction.offsetWorldY(this.anchorQ, this.anchorR);

        const places: number[][] = [];
        for (let dq = -reach; dq <= reach; ++dq) {
            for (let dr = -reach; dr <= reach; ++dr) {
                const x = (this.abstraction.offsetWorldX(this.anchorQ + dq, this.anchorR + dr) - baseX) / (wide || 1);
                const y = (this.abstraction.offsetWorldY(this.anchorQ + dq, this.anchorR + dr) - baseY) / (tall || 1);
                const distance = Math.sqrt(x * x + y * y);
                if (distance > 1 + 1e-9) continue;
                places.push([distance, dq, dr]);
            }
        }
        places.sort((one, other) => one[0] - other[0]);

        const cells: number[] = [];
        const offsets: number[] = [];
        const localOffsets: number[] = [];
        this.placeByCell = new Int32Array(this.abstraction.size);
        places.forEach(([, dq, dr]) => {
            const cell = this.abstraction.cellAtOffset(this.anchorQ + dq, this.anchorR + dr);
            if (this.placeByCell[cell] > 0) return;
            this.placeByCell[cell] = cells.length + 1;
            cells.push(cell);
            offsets.push(this.anchorQ + dq, this.anchorR + dr);
            localOffsets.push(dq, dr);
        });

        this.cells = Int32Array.from(cells);
        this.offsets = Int32Array.from(offsets);
        this.localOffsets = Int32Array.from(localOffsets);
    }
}
