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
    private static readonly CORNER_ZS = new Array<number>(6);

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

    /**
     * The values the corners are read from: this level's own, and nothing else's, taken once per
     * refresh. A corner is the meeting point of three cells of this level and is worth their mean.
     */
    get cornerHeights(): number[] {
        return this.dataAccessor.array;
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
     *
     * Cells asked for together are kept together. The world closes on itself, and a cell is drawn
     * where its own turn around it falls, so a stretch of the world lying across the seam would come
     * back as two pieces a whole world apart. Every cell is put on the turn of the first one instead,
     * which keeps a stretch whole and lets it walk off the edge of the map in one piece.
     *
     * The height is the one the ground is drawn at over the middle of the cell -- the mean of its six
     * corners -- and not the cell's own value, which the surface nowhere stands at. A name put at the
     * wrong height would slide over the land as the camera turned, by the parallax between the two.
     */
    fillCellsXYZ(cellIndexes: number[], xs: number[], ys: number[], zs: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        const array = this.dataAccessor.array;
        const shift = this.finitePlaneAbstraction.pointShift;
        const world = this.finitePlaneAbstraction.cellField.world;
        const span = this.finitePlaneAbstraction.viewState.worldSpan;
        const turnX = world.width / span * this.length;
        const turnY = world.height / span * this.width;
        let firstX = Number.NaN, firstY = Number.NaN;
        for (let i = 0; i < cellIndexes.length; ++i) {
            const place = this.cellRadius.placeOf(
                this.finitePlaneAbstraction.getUnshiftedCellIndex(cellIndexes[i]));
            if (place < 0) continue;
            this.cellRadius.fillOffset(place, offset);
            this.finitePlaneAbstraction.fillCellXY(offset[0], offset[1], xs, ys, i);
            xs[i] = (xs[i] + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + shift.y - 0.5) * this.width;
            const cornerZs = FinitePlaneModel.CORNER_ZS;
            this.finitePlaneAbstraction.fillPointsZ(cellIndexes[i], cornerZs, array);
            let total = 0;
            for (let corner = 0; corner < 6; ++corner) total += cornerZs[corner];
            zs[i] = total / 6 * this.height;
            if (Number.isNaN(firstX)) {
                firstX = xs[i];
                firstY = ys[i];
            } else {
                xs[i] -= turnX * Math.round((xs[i] - firstX) / turnX);
                ys[i] -= turnY * Math.round((ys[i] - firstY) / turnY);
            }
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
