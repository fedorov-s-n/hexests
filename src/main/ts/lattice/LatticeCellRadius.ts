import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {stepDistance} from "./HexLattice";

/**
 * The disc of places of a window that are drawn, by distance from its anchor.
 *
 * A disc is measured in steps of the lattice, so it comes out as a hexagon of cells of its own
 * level: the same reach in every direction, however that level's lattice happens to be turned. A
 * circle drawn in the world would not, from the reach at which it starts taking in the cells beyond
 * the hexagon's corners, and a disc stretched to the shape of the screen would not even be that.
 * Whatever the disc is for -- the window into a level or a selection under the pointer -- it is this
 * same shape, and the radius is the same count of cells at every level; only the cells differ in
 * size, so a deeper level covers a smaller stretch of the world.
 *
 * A place is kept only if no place before it stands over the same cell, so a level holding fewer
 * cells than the disc draws each of them exactly once, gathered around the centre, instead of
 * repeating them around the torus.
 */
export class LatticeCellRadius implements CellRadius {
    private _radius: number;

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
        this._radius = radius;
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
        // measured from the anchor by the step of the lattice itself, so that moving the disc about
        // never changes which place is which: the mesh keeps its points between the moves. Nothing
        // within the reach is left out, and nothing beyond it is taken in: a place that many steps
        // away has both of its offsets within the same count, so the square below holds the hexagon
        // whole and no corner of it is ever cut off.
        const places: number[][] = [];
        for (let dq = -this._radius; dq <= this._radius; ++dq) {
            for (let dr = -this._radius; dr <= this._radius; ++dr) {
                const distance = stepDistance(dq, dr);
                if (distance > this._radius) continue;
                places.push([distance, dq, dr]);
            }
        }
        places.sort((one, other) => one[0] - other[0] || one[1] - other[1] || one[2] - other[2]);

        const cells: number[] = [];
        const offsets: number[] = [];
        const localOffsets: number[] = [];
        // a disc is moved about on every stir of the pointer, and the level it is moved over may hold
        // millions of cells: the map from cell to place is kept and only the entries it used are let go
        if (this.placeByCell.length !== this.abstraction.size) {
            this.placeByCell = new Int32Array(this.abstraction.size);
        } else {
            for (let place = 0; place < this.cells.length; ++place) this.placeByCell[this.cells[place]] = 0;
        }
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
