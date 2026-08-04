import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {SQRT3} from "./HexLattice";

/**
 * The disc of places of a window that are drawn, by distance from its anchor.
 *
 * A place is kept only if no place before it stands over the same cell, so a level holding fewer
 * cells than the disc draws each of them exactly once, gathered around the centre, instead of
 * repeating them around the torus.
 */
export class LatticeCellRadius implements CellRadius {
    private _radius: number;
    /** A window is stretched to the shape of the screen; a selection stays round. */
    private readonly stretched: boolean;

    private readonly abstraction: FinitePlaneAbstraction;

    private anchorQ: number = 0;
    private anchorR: number = 0;

    private cells: Int32Array = new Int32Array(0);
    private offsets: Int32Array = new Int32Array(0);
    private localOffsets: Int32Array = new Int32Array(0);
    /** Place of every cell of the level, one more than the place, so that zero means none. */
    private placeByCell: Int32Array = new Int32Array(0);

    constructor(abstraction: FinitePlaneAbstraction, radius: number, stretched: boolean = true) {
        this.abstraction = abstraction;
        this._radius = radius;
        this.stretched = stretched;
        this.rebuild();
    }

    get radius(): number {
        return this._radius;
    }

    set radius(radius: number) {
        if (radius === this._radius) return;
        this._radius = radius;
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

    cellAt(place: number): number {
        return this.cells[place];
    }

    fillOffset(place: number, out: number[]) {
        out[0] = this.offsets[2 * place];
        out[1] = this.offsets[2 * place + 1];
    }

    fillPointOffset(place: number, out: number[]) {
        out[0] = this.localOffsets[2 * place];
        out[1] = this.localOffsets[2 * place + 1];
    }

    placeOf(cell: number): number {
        return this.placeByCell[cell] - 1;
    }

    private rebuild() {
        // measured in cells, and in the world, whose axes the screen keeps, not in the axes of this
        // level's own lattice; a window is also stretched to the shape of the screen
        const aspect = this.stretched ? Math.max(1, this.abstraction.viewState.aspect) : 1;
        const cell = SQRT3 * this.abstraction.cellField.scale;
        const tall = cell;
        const wide = cell * aspect;
        const reach = Math.ceil(this._radius * aspect) + 1;
        // measured from the anchor by the step of the lattice itself, so that moving the disc about
        // never changes which place is which: the mesh keeps its points between the moves
        const places: number[][] = [];
        for (let dq = -reach; dq <= reach; ++dq) {
            for (let dr = -reach; dr <= reach; ++dr) {
                const x = this.abstraction.vectorWorldX(dq, dr) / wide;
                const y = this.abstraction.vectorWorldY(dq, dr) / tall;
                const distance = Math.sqrt(x * x + y * y);
                if (distance > this._radius + 1e-9) continue;
                places.push([distance, dq, dr]);
            }
        }
        places.sort((one, other) => one[0] - other[0] || one[1] - other[1] || one[2] - other[2]);

        const cells: number[] = [];
        const offsets: number[] = [];
        const localOffsets: number[] = [];
        this.placeByCell = new Int32Array(this.abstraction.size);
        places.forEach(([, dq, dr]) => {
            const at = this.abstraction.cellAtOffset(this.anchorQ + dq, this.anchorR + dr);
            if (this.placeByCell[at] > 0) return;
            this.placeByCell[at] = cells.length + 1;
            cells.push(at);
            offsets.push(this.anchorQ + dq, this.anchorR + dr);
            localOffsets.push(dq, dr);
        });

        this.cells = Int32Array.from(cells);
        this.offsets = Int32Array.from(offsets);
        this.localOffsets = Int32Array.from(localOffsets);
    }
}
