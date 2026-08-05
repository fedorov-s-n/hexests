import {FinitePlaneAbstraction} from "./FinitePlaneAbstraction";
import {SettingsStub} from "../util/SettingsStub";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {CellRadius} from "../cell/CellRadius";

/**
 * What the mesh of one level is made of: the places of the window are drawn where the window puts
 * them, and every place shows the data of the cell that has flowed under it.
 */
export class FinitePlaneModel {
    private static readonly OFFSET = new Array<number>(2);

    private readonly settingsStub: SettingsStub;
    private readonly finitePlaneAbstraction: FinitePlaneAbstraction;
    private readonly dataAccessor: CellDataAccessor<number>;
    private readonly cellRadius: CellRadius;

    constructor(settingsStub: SettingsStub, finitePlaneAbstraction: FinitePlaneAbstraction,
                dataAccessor: CellDataAccessor<number>, cellRadius: CellRadius) {
        this.settingsStub = settingsStub;
        this.finitePlaneAbstraction = finitePlaneAbstraction;
        this.dataAccessor = dataAccessor;
        this.cellRadius = cellRadius;
    }

    fillPointsUVP(place: number, us: number[], vs: number[], ps: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        this.cellRadius.fillOffset(place, offset);
        this.finitePlaneAbstraction.fillOffsetWorldPointsXY(offset[0], offset[1], us, vs);
        this.cellRadius.fillPointOffset(place, offset);
        this.finitePlaneAbstraction.fillPointsP(offset[0], offset[1], ps);
    }

    /** The heights of the level below, which the corners are read from: taken once per refresh. */
    get cornerHeights(): number[] {
        return this.dataAccessor.lower.array;
    }

    fillPointsXYZ(place: number, xs: number[], ys: number[], zs: number[], cornerHeights: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        this.cellRadius.fillOffset(place, offset);
        this.finitePlaneAbstraction.fillPointsXY(offset[0], offset[1], xs, ys);
        this.finitePlaneAbstraction.fillPointsZ(
            this.finitePlaneAbstraction.getShiftedCellIndex(this.cellRadius.cellAt(place)), zs, cornerHeights);

        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < 6; ++i) {
            xs[i] = (xs[i] + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + shift.y - 0.5) * this.width;
            zs[i] *= this.height;
        }
    }

    /**
     * Takes cells of the world, not places: it answers where a cell of the level is being drawn
     * right now. The panning is undone to find the place the cell has flowed under, so whatever is
     * put here -- a marker, a label, a caption -- travels with the ground it belongs to.
     */
    fillCellsXYZ(cellIndexes: number[], xs: number[], ys: number[], zs: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        const array = this.dataAccessor.array;
        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < cellIndexes.length; ++i) {
            const place = this.cellRadius.placeOf(
                this.finitePlaneAbstraction.getUnshiftedCellIndex(cellIndexes[i]));
            if (place < 0) continue;
            this.cellRadius.fillOffset(place, offset);
            this.finitePlaneAbstraction.fillCellXY(offset[0], offset[1], xs, ys, i);
            xs[i] = (xs[i] + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + shift.y - 0.5) * this.width;
            zs[i] = array[cellIndexes[i]] * this.height;
        }
    }

    /** Every place of the disc, by its number. */
    forEach(consumer: (place: number) => void): void {
        for (let place = 0; place < this.cellRadius.size; ++place) consumer(place);
    }

    get placeCount(): number {
        return this.cellRadius.size;
    }

    get orientationNormalsCoefficient(): number {
        return -1;
    }

    get length(): number {
        return this.settingsStub.planeSideSize;
    }

    get width(): number {
        return this.settingsStub.planeSideSize;
    }

    /**
     * Heights are magnified exactly as the ground is, so a hill keeps its shape when the approach
     * changes: without it the relief would flatten out as the lattice gets finer.
     */
    get height(): number {
        const world = this.finitePlaneAbstraction.cellField.world;
        return this.settingsStub.planeSideSize * world.width / this.finitePlaneAbstraction.viewState.worldSpan;
    }
}
