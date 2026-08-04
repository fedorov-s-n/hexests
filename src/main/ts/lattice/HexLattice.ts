export const SQRT3 = Math.sqrt(3);
export const SQRT7 = Math.sqrt(7);

/**
 * A cell of a level covers exactly seven cells of the level below it: its own image plus the six
 * neighbours of that image. Such a refinement turns the lattice by this angle and shrinks it by
 * sqrt(7).
 */
export const LEVEL_ANGLE = Math.atan2(SQRT3, 5);

/** Axial neighbour directions: east, north-east, north-west, west, south-west, south-east. */
export const DIRECTION_Q = [+1, 0, -1, -1, 0, +1];
export const DIRECTION_R = [0, +1, +1, 0, -1, -1];

/** Corner order: north, north-east, south-east, south, south-west, north-west. */
export const CORNER_X = [0, +SQRT3 / 2, +SQRT3 / 2, 0, -SQRT3 / 2, -SQRT3 / 2];
export const CORNER_Y = [+1, +0.5, -0.5, -1, -0.5, +0.5];

/**
 * The two neighbour directions sharing every corner with the cell itself: a corner belongs to
 * three cells at once.
 */
export const CORNER_DIRECTIONS = [[1, 2], [0, 1], [0, 5], [4, 5], [3, 4], [2, 3]];

/**
 * The three cells of the level below that meet at every corner, as axial offsets from the image
 * of the cell on that level. A corner of a cell is always a corner of the denser lattice too,
 * which is what makes the heights of the corners well defined.
 */
export const CORNER_LOWER_CELLS = [
    [[-1, +1], [-1, +2], [-2, +2]],
    [[0, +1], [+1, +1], [0, +2]],
    [[+1, 0], [+2, 0], [+2, -1]],
    [[+1, -1], [+1, -2], [+2, -2]],
    [[0, -1], [-1, -1], [0, -2]],
    [[-1, 0], [-2, 0], [-2, +1]]
];

/** Axial coordinates of the image of a cell on the level below: seven times denser lattice. */
export function refineQ(q: number, r: number): number {
    return 2 * q - r;
}

export function refineR(q: number, r: number): number {
    return q + 3 * r;
}

/** Fractional axial coordinates of a cell of the denser lattice on the coarser one. */
export function coarseQ(q: number, r: number): number {
    return (3 * q + r) / 7;
}

export function coarseR(q: number, r: number): number {
    return (2 * r - q) / 7;
}

export function cartX(q: number, r: number): number {
    return SQRT3 * (q + r / 2);
}

export function cartY(q: number, r: number): number {
    return 1.5 * r;
}

/** Rounds fractional axial coordinates to the nearest cell, through cube coordinates. */
export function roundAxial(fq: number, fr: number, out: number[]) {
    const y = -fq - fr;
    let rq = Math.round(fq);
    let ry = Math.round(y);
    let rr = Math.round(fr);
    const dq = Math.abs(rq - fq);
    const dy = Math.abs(ry - y);
    const dr = Math.abs(rr - fr);
    if (dq > dy && dq > dr) {
        rq = -ry - rr;
    } else if (dy > dr) {
        ry = -rq - rr;
    } else {
        rr = -rq - ry;
    }
    out[0] = rq;
    out[1] = rr;
}

/**
 * The rectangle of the world every level is mapped into. It never changes with the zoom: the
 * levels differ in the lattice they cut that rectangle with, not in the rectangle itself.
 */
export class WorldFrame {
    /** Torus periods, in the units of the topmost lattice. */
    readonly width: number;
    readonly height: number;
    /**
     * What one full turn around the torus is worth in the coordinates handed to the geometry and
     * to the texture: the periods themselves, so a level fills the plane exactly once.
     */
    readonly columnsSize: number;
    readonly rowsSize: number;
    /** Position of the cell (0, 0) of the topmost lattice. */
    readonly originX: number;
    readonly originY: number;

    constructor(rowCount: number, columnCount: number) {
        this.width = SQRT3 * columnCount;
        this.height = 1.5 * rowCount;
        this.columnsSize = this.width;
        this.rowsSize = this.height;
        this.originX = 0;
        this.originY = 0;
    }
}
