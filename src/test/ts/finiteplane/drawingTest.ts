import 'reflect-metadata';
import {describe, expect, test} from '@jest/globals';
import {LatticeCellField} from "../../../main/ts/lattice/LatticeCellField";
import {FinitePlaneAbstraction} from "../../../main/ts/finiteplane/FinitePlaneAbstraction";
import {FinitePlaneModel} from "../../../main/ts/finiteplane/FinitePlaneModel";
import {LatticeCellRadius} from "../../../main/ts/lattice/LatticeCellRadius";
import {ViewState} from "../../../main/ts/three/ViewState";
import {SettingsStub} from "../../../main/ts/util/SettingsStub";
import {CellDataAccessor} from "../../../main/ts/cell/CellDataAccessor";
import {CellDataKey} from "../../../main/ts/cell/CellDataKey";
import {DataSourceImpl} from "../../../main/ts/data/DataSourceImpl";
import {CORNER_DIRECTIONS, SQRT3} from "../../../main/ts/lattice/HexLattice";

function field(rowCount: number, columnCount: number, zoom: number): LatticeCellField {
    let result = LatticeCellField.root(rowCount, columnCount);
    for (let i = 0; i < zoom; ++i) result = result.lower;
    return result;
}

/** A window into a level, with a view of its own so that tests do not share the panning. */
function windowInto(cellField: LatticeCellField, radius: number) {
    const settingsStub = new SettingsStub();
    settingsStub.viewRadius = radius;
    settingsStub.initialZoom = cellField.zoom;
    const viewState = new ViewState(settingsStub);
    const abstraction = new FinitePlaneAbstraction(cellField, viewState, radius);
    return {settingsStub, viewState, abstraction};
}

/** Anything but a flat field, so that a mean of three cells cannot be mistaken for one of them. */
function bumpy(cellField: LatticeCellField): number[] {
    const values = new Array<number>(cellField.size);
    for (let cell = 0; cell < cellField.size; ++cell) values[cell] = (cell % 17) / 17;
    return values;
}

describe('the ground of a level', () => {

    test('takes the corners of its cells from its own data and nothing else', () => {
        const cellField = field(12, 20, 0);
        const {abstraction} = windowInto(cellField, 4);
        const values = bumpy(cellField);
        const zs = new Array<number>(6);
        const neighbours = new Array<number>(6);
        const corners = new Array<number>(18);

        cellField.forEach(cell => {
            abstraction.fillPointsZ(cell, zs, values);
            cellField.fillNeighbours(cell, neighbours);
            abstraction.fillCornerCells(cell, corners);
            for (let corner = 0; corner < 6; ++corner) {
                const directions = CORNER_DIRECTIONS[corner];
                const mean = (values[cell]
                    + values[neighbours[directions[0]]]
                    + values[neighbours[directions[1]]]) / 3;
                expect(zs[corner]).toBeCloseTo(mean, 12);
            }
            // every cell a corner is made of belongs to this level: none of them is an index into a
            // finer lattice, which would be both out of range and none of this level's business
            corners.forEach(cell => {
                expect(cell).toBeGreaterThanOrEqual(0);
                expect(cell).toBeLessThan(cellField.size);
            });
        });
    });

    test('leaves no crack between neighbours: a shared corner has one height', () => {
        const cellField = field(12, 20, 0);
        const {abstraction} = windowInto(cellField, 4);
        const values = bumpy(cellField);
        const mine = new Array<number>(6);
        const theirs = new Array<number>(6);
        const neighbours = new Array<number>(6);

        cellField.forEach(cell => {
            abstraction.fillPointsZ(cell, mine, values);
            cellField.fillNeighbours(cell, neighbours);
            for (let corner = 0; corner < 6; ++corner) {
                for (const direction of CORNER_DIRECTIONS[corner]) {
                    abstraction.fillPointsZ(neighbours[direction], theirs, values);
                    // the same point of the world, named by the other cell that owns it
                    const same = theirs.filter((height, at) =>
                        CORNER_DIRECTIONS[at].some(back => cellField.neighbour(neighbours[direction], back) === cell)
                        && Math.abs(height - mine[corner]) < 1e-12);
                    expect(same.length).toBeGreaterThan(0);
                }
            }
        });
    });
});

describe('what is put on the map', () => {

    /** The window into a level, exactly as a layer builds it, over data of the level's own. */
    function windowModel(rowCount: number, columnCount: number, zoom: number, radius: number) {
        const cellField = field(rowCount, columnCount, zoom);
        const {settingsStub, viewState, abstraction} = windowInto(cellField, radius);
        const accessor = new CellDataAccessor<number>(
            new DataSourceImpl(), cellField, new CellDataKey<number>('height', zoom, 0), 0);
        const window = new LatticeCellRadius(abstraction, abstraction.viewRadius);
        return {cellField, viewState, abstraction, window,
                model: new FinitePlaneModel(settingsStub, abstraction, accessor, window)};
    }

    test('a cell is drawn where the place it has flowed under is drawn', () => {
        const {cellField, viewState, abstraction, window, model} = windowModel(30, 30, 0, 4);
        const cell = SQRT3 * cellField.scale;
        const xs = [Number.NaN], ys = [0], zs = [0];
        const offset = new Array<number>(2);
        const placeXs = [0], placeYs = [0];

        for (let step = 0; step <= 12; ++step) {
            abstraction.applyShift(0.37 * step * cell / viewState.worldSpan,
                -0.21 * step * cell / viewState.worldSpan);
            for (let place = 0; place < window.size; ++place) {
                // the cell of the world this place is showing right now
                const shown = abstraction.getShiftedCellIndex(window.cellAt(place));
                xs[0] = Number.NaN;
                model.fillCellsXYZ([shown], xs, ys, zs);
                expect(Number.isFinite(xs[0])).toBe(true);

                window.fillOffset(place, offset);
                abstraction.fillCellXY(offset[0], offset[1], placeXs, placeYs, 0);
                const shift = abstraction.pointShift;
                expect(xs[0]).toBeCloseTo((placeXs[0] + shift.x - 0.5) * model.length, 9);
                expect(ys[0]).toBeCloseTo((placeYs[0] + shift.y - 0.5) * model.width, 9);
            }
        }
    });

    test('a stretch of the world is never torn by the seam the map closes on', () => {
        // a level small enough for the whole world to be inside the window, so the seam is on screen,
        // and still wide enough for a stretch of five cells to be well short of half a turn
        const {cellField, viewState, abstraction, model} = windowModel(12, 12, 0, 18);
        const cells = [0, 0, 0, 0, 0];
        cells[0] = 12;
        for (let at = 1; at < cells.length; ++at) cells[at] = cellField.neighbour(cells[at - 1], 0);
        const xs = cells.map(() => Number.NaN), ys = cells.map(() => 0), zs = cells.map(() => 0);
        const cell = SQRT3 * cellField.scale;
        const turn = cellField.world.width / viewState.worldSpan * model.length;

        let spacing = Number.NaN;
        for (let step = 0; step <= 40; ++step) {
            abstraction.applyShift(0.3 * cell / viewState.worldSpan, 0);
            for (let at = 0; at < cells.length; ++at) xs[at] = Number.NaN;
            model.fillCellsXYZ(cells, xs, ys, zs);

            for (let at = 1; at < cells.length; ++at) {
                const gap = Math.hypot(xs[at] - xs[at - 1], ys[at] - ys[at - 1]);
                // a step of the lattice, always: never a whole turn around the world
                if (Number.isNaN(spacing)) spacing = gap;
                expect(gap).toBeCloseTo(spacing, 9);
                expect(gap).toBeLessThan(turn / 2);
            }
        }
    });
});
