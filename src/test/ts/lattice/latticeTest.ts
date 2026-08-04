import {describe, expect, test} from '@jest/globals';
import {LatticeCellField} from "../../../main/ts/lattice/LatticeCellField";
import {
    CORNER_LOWER_CELLS,
    CORNER_X,
    CORNER_Y,
    DIRECTION_Q,
    DIRECTION_R,
    refineQ,
    refineR,
    SQRT3
} from "../../../main/ts/lattice/HexLattice";
import {FinitePlaneAbstraction} from "../../../main/ts/finiteplane/FinitePlaneAbstraction";

const SIZES: number[][] = [[30, 30], [12, 20], [6, 6], [4, 10]];

function field(rowCount: number, columnCount: number, zoom: number): LatticeCellField {
    let result = LatticeCellField.root(rowCount, columnCount);
    for (let i = 0; i < zoom; ++i) result = result.lower;
    return result;
}

/** Shortest world distance between two points of the torus. */
function torusDistance(cellField: LatticeCellField, x1: number, y1: number, x2: number, y2: number): number {
    const world = cellField.world;
    const wrap = (d: number, period: number) => {
        let value = d % period;
        if (value > period / 2) value -= period;
        if (value < -period / 2) value += period;
        return value;
    };
    const dx = wrap(x1 - x2, world.width);
    const dy = wrap(y1 - y2, world.height);
    return Math.sqrt(dx * dx + dy * dy);
}

describe('hexagonal lattice on a torus', () => {

    test('the topmost level is numbered row by row, every row a full width of the rectangle', () => {
        const cellField = field(30, 30, 0);
        expect(cellField.size).toBe(900);
        for (let index = 0; index < cellField.size; ++index) {
            const column = index % 30;
            const row = (index - column) / 30;
            expect(cellField.r(index)).toBe(row);
            // the rows are shifted by half a cell in turn, so that the rectangle stays a rectangle
            expect(cellField.q(index)).toBe(column - Math.floor(row / 2));
        }
    });

    test.each(SIZES)('a level below holds seven times more cells (%i by %i)', (rowCount, columnCount) => {
        let cellField = field(rowCount, columnCount, 0);
        expect(cellField.size).toBe(rowCount * columnCount);
        for (let zoom = 1; zoom <= 3; ++zoom) {
            cellField = cellField.lower;
            expect(cellField.zoom).toBe(zoom);
            expect(cellField.size).toBe(rowCount * columnCount * Math.pow(7, zoom));
        }
    });

    test.each(SIZES)('every cell covers exactly seven cells below, and they cover everything (%i by %i)', (rowCount, columnCount) => {
        for (let zoom = 0; zoom <= 1; ++zoom) {
            const cellField = field(rowCount, columnCount, zoom);
            const lower = cellField.lower;
            const owners = new Array<number>(lower.size).fill(-1);
            const cells = new Array<number>(7);

            cellField.forEach(index => {
                cellField.fillLowerCells(index, cells);
                expect(new Set(cells).size).toBe(7);
                cells.forEach(cell => {
                    expect(owners[cell]).toBe(-1);
                    owners[cell] = index;
                });
            });

            expect(owners.filter(owner => owner < 0).length).toBe(0);
        }
    });

    test.each(SIZES)('cells stay inside the world rectangle and levels agree on positions (%i by %i)', (rowCount, columnCount) => {
        const root = field(rowCount, columnCount, 0);
        const world = root.world;
        let cellField = root;
        for (let zoom = 0; zoom <= 2; ++zoom) {
            cellField.forEach(index => {
                const x = cellField.worldX(cellField.q(index), cellField.r(index)) - world.originX;
                const y = cellField.worldY(cellField.q(index), cellField.r(index)) - world.originY;
                expect(x).toBeGreaterThan(-1e-9);
                expect(x).toBeLessThan(world.width);
                expect(y).toBeGreaterThan(-1e-9);
                expect(y).toBeLessThan(world.height);
            });
            const lower = cellField.lower;
            cellField.forEach(index => {
                const q = cellField.q(index);
                const r = cellField.r(index);
                const image = cellField.mapIndexToLowerLevel(index);
                expect(torusDistance(cellField,
                    cellField.worldX(q, r), cellField.worldY(q, r),
                    lower.worldX(lower.q(image), lower.r(image)), lower.worldY(lower.q(image), lower.r(image))
                )).toBeCloseTo(0, 9);
            });
            cellField = lower;
        }
    });

    test.each(SIZES)('neighbours are mutual and one cell away (%i by %i)', (rowCount, columnCount) => {
        for (let zoom = 0; zoom <= 1; ++zoom) {
            const cellField = field(rowCount, columnCount, zoom);
            const step = SQRT3 * cellField.scale;
            const neighbours = new Array<number>(6);
            cellField.forEach(index => {
                cellField.fillNeighbours(index, neighbours);
                expect(new Set(neighbours).size).toBe(6);
                for (let direction = 0; direction < 6; ++direction) {
                    const neighbour = neighbours[direction];
                    expect(cellField.neighbour(neighbour, (direction + 3) % 6)).toBe(index);
                    expect(torusDistance(cellField,
                        cellField.worldX(cellField.q(index), cellField.r(index)),
                        cellField.worldY(cellField.q(index), cellField.r(index)),
                        cellField.worldX(cellField.q(neighbour), cellField.r(neighbour)),
                        cellField.worldY(cellField.q(neighbour), cellField.r(neighbour))
                    )).toBeCloseTo(step, 9);
                }
            });
        }
    });

    test.each(SIZES)('a corner of a cell is a corner of the lattice below (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const lower = cellField.lower;
        cellField.forEach(index => {
            const q = cellField.q(index);
            const r = cellField.r(index);
            const lq = refineQ(q, r);
            const lr = refineR(q, r);
            for (let corner = 0; corner < 6; ++corner) {
                const cornerX = cellField.worldX(q, r) + cellField.offsetX(CORNER_X[corner], CORNER_Y[corner]);
                const cornerY = cellField.worldY(q, r) + cellField.offsetY(CORNER_X[corner], CORNER_Y[corner]);

                let meanX = 0, meanY = 0;
                CORNER_LOWER_CELLS[corner].forEach(offset => {
                    const cell = lower.indexOf(lq + offset[0], lr + offset[1]);
                    expect(cell).toBeGreaterThanOrEqual(0);
                    meanX += lower.worldX(lq + offset[0], lr + offset[1]) / 3;
                    meanY += lower.worldY(lq + offset[0], lr + offset[1]) / 3;
                });

                expect(torusDistance(cellField, cornerX, cornerY, meanX, meanY)).toBeCloseTo(0, 9);
            }
        });
    });

    test.each(SIZES)('interpolation keeps the values in place and stays inside their range (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const lower = cellField.lower;
        const high = new Array<number>(cellField.size);
        for (let i = 0; i < high.length; ++i) high[i] = Math.sin(i) + Math.cos(3 * i);
        const low = new Array<number>(lower.size).fill(NaN);

        cellField.interpolate(high, low);

        const min = Math.min(...high), max = Math.max(...high);
        low.forEach(value => {
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(min - 1e-9);
            expect(value).toBeLessThanOrEqual(max + 1e-9);
        });
        cellField.forEach(index => {
            expect(low[cellField.mapIndexToLowerLevel(index)]).toBeCloseTo(high[index], 9);
        });
    });

    test('interpolation of a plane is that very plane', () => {
        const cellField = field(12, 20, 0);
        const lower = cellField.lower;
        const linear = (x: number, y: number) => 0.25 * x - 0.5 * y;
        const high = new Array<number>(cellField.size);
        cellField.forEach(index => {
            high[index] = linear(cellField.worldX(cellField.q(index), cellField.r(index)),
                cellField.worldY(cellField.q(index), cellField.r(index)));
        });
        const low = new Array<number>(lower.size).fill(NaN);

        cellField.interpolate(high, low);

        // away from the cyclic boundary, where a plane cannot be continuous
        let checked = 0;
        lower.forEach(index => {
            const x = lower.worldX(lower.q(index), lower.r(index));
            const y = lower.worldY(lower.q(index), lower.r(index));
            const world = lower.world;
            if (x < world.originX + 3 || x > world.originX + world.width - 3) return;
            if (y < world.originY + 3 || y > world.originY + world.height - 3) return;
            expect(low[index]).toBeCloseTo(linear(x, y), 6);
            ++checked;
        });
        expect(checked).toBeGreaterThan(100);
    });

    test.each(SIZES)('gathering upwards is the mean of the seven cells covered (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const lower = cellField.lower;
        const low = new Array<number>(lower.size);
        for (let i = 0; i < low.length; ++i) low[i] = Math.sin(i);
        const high = new Array<number>(cellField.size).fill(NaN);

        cellField.gather(high, low);

        const cells = new Array<number>(7);
        cellField.forEach(index => {
            cellField.fillLowerCells(index, cells);
            const mean = cells.reduce((sum, cell) => sum + low[cell], 0) / 7;
            expect(high[index]).toBeCloseTo(mean, 12);
        });
        // the mean of all cells survives both ways, since the seven cover the plane exactly once
        const meanLow = low.reduce((a, b) => a + b, 0) / low.length;
        const meanHigh = high.reduce((a, b) => a + b, 0) / high.length;
        expect(meanHigh).toBeCloseTo(meanLow, 12);
    });

    test.each(SIZES)('a cell radius is a hexagonal disc around its centre (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const radius = cellField.radius(0, 1);
        const collected: number[] = [];
        radius.forEach(index => collected.push(index));
        expect(collected.length).toBe(radius.size);
        expect(new Set(collected).size).toBe(radius.size);

        const neighbours = new Array<number>(6);
        cellField.fillNeighbours(0, neighbours);
        expect(new Set(collected)).toEqual(new Set([0, ...neighbours]));
    });
});

describe('placing a level into the world', () => {

    test.each(SIZES)('cells sharing a corner agree on where it is (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const abstraction = new FinitePlaneAbstraction(cellField);
        const ps = new Array<number>(6);
        const xs = new Array<number>(6);
        const ys = new Array<number>(6);
        const known = new Map<number, number[]>();
        const counts = new Map<number, number>();

        cellField.forEach(index => {
            abstraction.fillPointsP(index, ps);
            abstraction.fillPointsXY(index, xs, ys);
            expect(new Set(ps).size).toBe(6);
            for (let corner = 0; corner < 6; ++corner) {
                counts.set(ps[corner], (counts.get(ps[corner]) || 0) + 1);
                const seen = known.get(ps[corner]);
                if (seen) {
                    // a shared corner must not jump over the cyclic boundary: the patch is open
                    expect(xs[corner]).toBeCloseTo(seen[0], 9);
                    expect(ys[corner]).toBeCloseTo(seen[1], 9);
                } else {
                    known.set(ps[corner], [xs[corner], ys[corner]]);
                }
            }
        });

        expect(abstraction.pointIdCount).toBe(known.size);
        counts.forEach(count => expect(count).toBeLessThanOrEqual(3));
        // inside the patch every corner belongs to three cells; the edges of it hold the rest
        const inner = Array.from(counts.values()).filter(count => count === 3).length;
        expect(inner).toBeGreaterThan(2 * cellField.size - 8 * (rowCount + columnCount));
    });

    test.each(SIZES)('a cell is found back by the corners of its own triangles (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const abstraction = new FinitePlaneAbstraction(cellField);
        abstraction.applyShift(0, 0);
        const ps = new Array<number>(6);

        cellField.forEach(index => {
            abstraction.fillPointsP(index, ps);
            expect(abstraction.pickCellByPointIds([ps[0], ps[2], ps[4]])).toBe(index);
            expect(abstraction.pickCellByPointIds([ps[1], ps[3], ps[5]])).toBe(index);
        });
    });

    test('panning by a whole cell renumbers the cells and leaves no remainder', () => {
        const cellField = field(30, 30, 0);
        const abstraction = new FinitePlaneAbstraction(cellField);
        const world = cellField.world;

        const dx = cellField.offsetX(SQRT3 * (DIRECTION_Q[0] + DIRECTION_R[0] / 2), 1.5 * DIRECTION_R[0]);
        const dy = cellField.offsetY(SQRT3 * (DIRECTION_Q[0] + DIRECTION_R[0] / 2), 1.5 * DIRECTION_R[0]);
        abstraction.applyShift(dx / world.columnsSize, dy / world.rowsSize);

        expect(abstraction.pointShift.x).toBeCloseTo(0, 9);
        expect(abstraction.pointShift.y).toBeCloseTo(0, 9);
        cellField.forEach(index => {
            expect(abstraction.getShiftedCellIndex(index)).toBe(cellField.neighbour(index, 3));
        });
    });

    test('a fraction of a cell is left to the points', () => {
        const cellField = field(30, 30, 0);
        const abstraction = new FinitePlaneAbstraction(cellField);
        const tenth = 0.1 * SQRT3 * cellField.scale / cellField.world.columnsSize;

        abstraction.applyShift(tenth, 0);

        expect(abstraction.pointShift.x).toBeCloseTo(-tenth, 9);
        cellField.forEach(index => expect(abstraction.getShiftedCellIndex(index)).toBe(index));
    });
});
