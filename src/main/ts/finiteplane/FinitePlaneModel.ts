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

    fillPointsUVP(cellIndex: number, us: number[], vs: number[], ps: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        if (!this.cellRadius.fillOffset(cellIndex, offset)) return;
        this.finitePlaneAbstraction.fillOffsetWorldPointsXY(offset[0], offset[1], us, vs);
        if (this.cellRadius.fillPointOffset(cellIndex, offset)) {
            this.finitePlaneAbstraction.fillPointsP(offset[0], offset[1], ps);
        }
    }

    /** The heights of the level below, which the corners are read from: taken once per refresh. */
    get cornerHeights(): number[] {
        return this.dataAccessor.lower.array;
    }

    fillPointsXYZ(cellIndex: number, xs: number[], ys: number[], zs: number[], cornerHeights: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        if (!this.cellRadius.fillOffset(cellIndex, offset)) return;
        this.finitePlaneAbstraction.fillPointsXY(offset[0], offset[1], xs, ys);
        this.finitePlaneAbstraction.fillPointsZ(
            this.finitePlaneAbstraction.getShiftedCellIndex(cellIndex), zs, cornerHeights);

        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < 6; ++i) {
            xs[i] = (xs[i] + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + shift.y - 0.5) * this.width;
            zs[i] *= this.height;
        }
    }

    fillCellsXYZ(cellIndexes: number[], xs: number[], ys: number[], zs: number[]) {
        const offset = FinitePlaneModel.OFFSET;
        const array = this.dataAccessor.array;
        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < cellIndexes.length; ++i) {
            const cellIndex = cellIndexes[i];
            if (!this.cellRadius.fillOffset(cellIndex, offset)) continue;
            this.finitePlaneAbstraction.fillCellXY(offset[0], offset[1], xs, ys, i);
            xs[i] = (xs[i] + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + shift.y - 0.5) * this.width;
            zs[i] = array[this.finitePlaneAbstraction.getShiftedCellIndex(cellIndex)] * this.height;
        }
    }

    forEach(consumer: (index: number) => void): void {
        this.cellRadius.forEach(consumer);
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

    get height(): number {
        return this.settingsStub.planeSideSize;
    }
}
