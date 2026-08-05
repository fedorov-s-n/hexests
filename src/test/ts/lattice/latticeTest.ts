import 'reflect-metadata';
import {describe, expect, test} from '@jest/globals';
import {LatticeCellField} from "../../../main/ts/lattice/LatticeCellField";
import {
    cartX,
    cartY,
    CORNER_DIRECTIONS,
    CORNER_X,
    CORNER_Y,
    DIRECTION_Q,
    DIRECTION_R,
    refineQ,
    refineR,
    SQRT3
} from "../../../main/ts/lattice/HexLattice";
import {FinitePlaneAbstraction} from "../../../main/ts/finiteplane/FinitePlaneAbstraction";
import {LatticeCellRadius} from "../../../main/ts/lattice/LatticeCellRadius";
import {ViewState} from "../../../main/ts/three/ViewState";
import {SettingsStub} from "../../../main/ts/util/SettingsStub";
import {SelectionState} from "../../../main/ts/three/SelectionState";

const SIZES: number[][] = [[30, 30], [12, 20], [6, 6], [4, 10]];

/** A window into a level, with a view of its own so that tests do not share the panning. */
function windowInto(cellField: LatticeCellField, radius: number): FinitePlaneAbstraction {
    const settingsStub = new SettingsStub();
    settingsStub.viewRadius = radius;
    settingsStub.initialZoom = cellField.zoom;
    return new FinitePlaneAbstraction(cellField, new ViewState(settingsStub), radius);
}

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

    test.each(SIZES)('a corner is where three cells of the same level meet (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const neighbours = new Array<number>(6);
        cellField.forEach(index => {
            const q = cellField.q(index);
            const r = cellField.r(index);
            cellField.fillNeighbours(index, neighbours);
            for (let corner = 0; corner < 6; ++corner) {
                const cornerX = cellField.worldX(q, r) + cellField.offsetX(CORNER_X[corner], CORNER_Y[corner]);
                const cornerY = cellField.worldY(q, r) + cellField.offsetY(CORNER_X[corner], CORNER_Y[corner]);

                // the cell itself and the two neighbours the corner belongs to, nothing from below;
                // counted as steps away from the cell, so that the torus does not fold the mean
                let meanX = cellField.worldX(q, r), meanY = cellField.worldY(q, r);
                for (const direction of CORNER_DIRECTIONS[corner]) {
                    expect(neighbours[direction]).toBeGreaterThanOrEqual(0);
                    const dq = DIRECTION_Q[direction], dr = DIRECTION_R[direction];
                    meanX += cellField.worldX(q, r) + cellField.offsetX(cartX(dq, dr), cartY(dq, dr));
                    meanY += cellField.worldY(q, r) + cellField.offsetY(cartX(dq, dr), cartY(dq, dr));
                }
                meanX /= 3;
                meanY /= 3;

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

});

describe('the window into a level', () => {

    test.each(SIZES)('is a disc of cells around the centre (%i by %i)', (rowCount, columnCount) => {
        const cellField = field(rowCount, columnCount, 0);
        const abstraction = windowInto(cellField, 1);
        const window = new LatticeCellRadius(abstraction, 1);

        const collected: number[] = [];
        for (let place = 0; place < window.size; ++place) collected.push(window.cellAt(place));
        expect(collected.length).toBe(window.size);
        expect(new Set(collected).size).toBe(window.size);

        const centre = abstraction.centreCell;
        const neighbours = new Array<number>(6);
        cellField.fillNeighbours(centre, neighbours);
        expect(new Set(collected)).toEqual(new Set([centre, ...neighbours]));
    });

    test('shows every cell once when the level holds fewer of them than it takes', () => {
        const cellField = field(2, 2, 0);
        expect(cellField.size).toBe(4);
        const abstraction = windowInto(cellField, 3);
        const window = new LatticeCellRadius(abstraction, 3);

        expect(window.size).toBe(4);
        const offset = new Array<number>(2);
        const distances: number[] = [];
        for (let place = 0; place < window.size; ++place) {
            window.fillOffset(place, offset);
            distances.push(Math.max(Math.abs(offset[0]), Math.abs(offset[1]), Math.abs(offset[0] + offset[1])));
        }
        // and gathers them around the centre, not spread over the torus
        expect(Math.max(...distances)).toBeLessThanOrEqual(1);
    });

    test('takes the whole disc when the level is larger than it', () => {
        const abstraction = windowInto(field(30, 30, 0), 3);
        expect(new LatticeCellRadius(abstraction, 3).size).toBe(3 * 3 * 3 + 3 * 3 + 1);
    });

    test.each(SIZES)('gives neighbouring places two common corners (%i by %i)', (rowCount, columnCount) => {
        const abstraction = windowInto(field(rowCount, columnCount, 0), 4);
        const own = new Array<number>(6);
        const other = new Array<number>(6);

        for (let dq = -2; dq <= 2; ++dq) {
            for (let dr = -2; dr <= 2; ++dr) {
                abstraction.fillPointsP(dq, dr, own);
                expect(new Set(own).size).toBe(6);
                for (let direction = 0; direction < 6; ++direction) {
                    abstraction.fillPointsP(dq + DIRECTION_Q[direction], dr + DIRECTION_R[direction], other);
                    const common = own.filter(id => other.indexOf(id) >= 0);
                    expect(common.length).toBe(2);
                }
            }
        }
    });

    test('finds a place back by the corners of its own triangles', () => {
        const abstraction = windowInto(field(30, 30, 0), 4);
        const ps = new Array<number>(6);
        const out = new Array<number>(2);

        for (let dq = -3; dq <= 3; ++dq) {
            for (let dr = -3; dr <= 3; ++dr) {
                abstraction.fillPointsP(dq, dr, ps);
                expect(abstraction.pickOffsetByPointIds([ps[0], ps[2], ps[4]], out)).toBe(true);
                expect(out).toEqual([dq, dr]);
                expect(abstraction.pickOffsetByPointIds([ps[1], ps[3], ps[5]], out)).toBe(true);
                expect(out).toEqual([dq, dr]);
            }
        }
    });

    test('panning by a whole cell lets the data flow and leaves no remainder', () => {
        const cellField = field(30, 30, 0);
        const abstraction = windowInto(cellField, 4);
        const cell = SQRT3 * cellField.scale;

        abstraction.applyShift(cell / abstraction.viewState.worldSpan, 0);

        expect(abstraction.pointShift.x).toBeCloseTo(0, 9);
        expect(abstraction.pointShift.y).toBeCloseTo(0, 9);
        cellField.forEach(index => {
            // the place keeps standing where it is, the cell under it moves one step east
            expect(abstraction.getShiftedCellIndex(index)).toBe(cellField.neighbour(index, 0));
        });
    });

    test('a fraction of a cell is left to the window itself', () => {
        const cellField = field(30, 30, 0);
        const abstraction = windowInto(cellField, 4);
        const tenth = 0.1 * SQRT3 * cellField.scale / abstraction.viewState.worldSpan;

        abstraction.applyShift(tenth, 0);

        expect(abstraction.pointShift.x).toBeCloseTo(-tenth, 9);
        cellField.forEach(index => expect(abstraction.getShiftedCellIndex(index)).toBe(index));
    });

    test('the texture and the window between them carry exactly the panning', () => {
        const cellField = field(30, 30, 0);
        const abstraction = windowInto(cellField, 4);
        const world = cellField.world;
        const view = abstraction.viewState;
        const cell = SQRT3 * cellField.scale;

        // two cells and a bit each way, so both halves of the motion have something to carry
        abstraction.applyShift(2.3 * cell / view.worldSpan, -1.7 * cell / view.worldSpan);

        // the whole cells are carried by the texture and the remainder by the window itself; their
        // sum is the panning, which is what keeps the world one picture instead of two
        expect(abstraction.textureShift.x * world.width / view.worldSpan + abstraction.pointShift.x)
            .toBeCloseTo(-view.panX / view.worldSpan, 9);
        expect(abstraction.textureShift.y * world.height / view.worldSpan + abstraction.pointShift.y)
            .toBeCloseTo(-view.panY / view.worldSpan, 9);
    });

    test('undoing the panning finds the place a cell of the world has flowed under', () => {
        const cellField = field(12, 20, 0);
        const abstraction = windowInto(cellField, 4);
        const cell = SQRT3 * cellField.scale;

        abstraction.applyShift(3.4 * cell / abstraction.viewState.worldSpan,
            2.1 * cell / abstraction.viewState.worldSpan);

        cellField.forEach(index => {
            expect(abstraction.getUnshiftedCellIndex(abstraction.getShiftedCellIndex(index))).toBe(index);
            expect(abstraction.getShiftedCellIndex(abstraction.getUnshiftedCellIndex(index))).toBe(index);
        });
    });
});

describe('a selection', () => {

    test.each([1, 2, 3, 4, 5, 6, 7])('of radius %i holds the cells within that many of the centre', radius => {
        const cellField = field(30, 30, 0);
        const abstraction = windowInto(cellField, 18);
        const selection = new LatticeCellRadius(abstraction, radius, false);

        // a round disc holds about three and a half cells per unit of its area
        const perArea = 2 * Math.PI / SQRT3;
        expect(selection.size).toBeGreaterThanOrEqual(perArea * (radius - 0.5) * (radius - 0.5) - 6);
        expect(selection.size).toBeLessThanOrEqual(perArea * (radius + 0.5) * (radius + 0.5) + 6);

        const offset = new Array<number>(2);
        const cell = SQRT3 * cellField.scale;
        const centreX = abstraction.offsetWorldX(0, 0);
        const centreY = abstraction.offsetWorldY(0, 0);
        for (let place = 0; place < selection.size; ++place) {
            selection.fillOffset(place, offset);
            const x = abstraction.offsetWorldX(offset[0], offset[1]) - centreX;
            const y = abstraction.offsetWorldY(offset[0], offset[1]) - centreY;
            expect(Math.hypot(x, y) / cell).toBeLessThanOrEqual(radius + 1e-6);
        }
    });

    test('is never as wide as two to the power of the level', () => {
        const state = new SelectionState();

        state.radius = SelectionState.LARGEST;
        // one cell at the top, one or two a level down, and the whole range from the third level on
        expect([0, 1, 2, 3, 4, 5, 6, 7].map(zoom => state.radiusAt(zoom))).toEqual([0, 1, 3, 7, 7, 7, 7, 7]);

        state.radius = 2;
        // what was chosen is what is drawn, wherever the level allows it
        expect([0, 1, 2, 3, 4].map(zoom => state.radiusAt(zoom))).toEqual([0, 1, 2, 2, 2]);

        state.radius = SelectionState.SMALLEST;
        expect([0, 1, 2, 3, 4].map(zoom => state.radiusAt(zoom))).toEqual([0, 0, 0, 0, 0]);
    });

    test('of the smallest radius holds one cell, at every level', () => {
        for (let zoom = 0; zoom <= 3; ++zoom) {
            const abstraction = windowInto(field(30, 30, zoom), 18);
            expect(new LatticeCellRadius(abstraction, 0, false).size).toBe(1);
        }
    });
});
