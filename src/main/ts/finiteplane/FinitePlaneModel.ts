import {FinitePlaneAbstraction} from "./FinitePlaneAbstraction";
import {SettingsStub} from "../util/SettingsStub";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {CellSource} from "../cell/CellSource";
import {CellShiftSupplier} from "../cell/CellShiftSupplier";

export class FinitePlaneModel {
    private readonly settingsStub: SettingsStub;
    private readonly finitePlaneAbstraction: FinitePlaneAbstraction;
    private readonly dataAccessor: CellDataAccessor<number>;
    private readonly cellSource: CellSource;
    private readonly pointShiftSupplier: CellShiftSupplier | undefined;

    constructor(settingsStub: SettingsStub, finitePlaneAbstraction: FinitePlaneAbstraction,
                dataAccessor: CellDataAccessor<number>, cellSource: CellSource, pointShiftSupplier?: CellShiftSupplier) {
        this.settingsStub = settingsStub;
        this.finitePlaneAbstraction = finitePlaneAbstraction;
        this.dataAccessor = dataAccessor;
        this.cellSource = cellSource;
        this.pointShiftSupplier = pointShiftSupplier;
    }

    fillPointsUVP(cellIndex: number, xs: number[], ys: number[], ps: number[]) {
        this.finitePlaneAbstraction.fillPointsXY(cellIndex, xs, ys);
        const pointsIndex = this.pointShiftSupplier === undefined ? cellIndex : this.pointShiftSupplier.getShiftedCellIndex(cellIndex);
        this.finitePlaneAbstraction.fillPointsP(pointsIndex, ps);
    }

    fillPointsXYZP(cellIndex: number, xs: number[], ys: number[], zs: number[], ps: number[]) {
        const shiftedIndex = this.finitePlaneAbstraction.getShiftedCellIndex(cellIndex);
        this.finitePlaneAbstraction.fillPointsXY(shiftedIndex, xs, ys);
        this.finitePlaneAbstraction.fillPointsZ(cellIndex, zs, this.dataAccessor);
        const pointShiftedIndex = this.pointShiftSupplier === undefined ? shiftedIndex : this.pointShiftSupplier.getShiftedCellIndex(cellIndex);
        this.finitePlaneAbstraction.fillPointsP(pointShiftedIndex, ps);

        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < 6; ++i) {
            xs[i] = (xs[i] + this.finitePlaneAbstraction.orientationOffset.x + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + this.finitePlaneAbstraction.orientationOffset.y + shift.y - 0.5) * this.width;
            zs[i] *= this.height;
        }
    }

    fillCellsXYZ(cellIndexes: number[], xs: number[], ys: number[], zs: number[]) {
        this.finitePlaneAbstraction.fillCellsXY(cellIndexes, xs, ys);
        const array = this.dataAccessor.array;
        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < cellIndexes.length; ++i) {
            const cellIndex = cellIndexes[i];
            xs[i] = (xs[i] + this.finitePlaneAbstraction.orientationOffset.x + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + this.finitePlaneAbstraction.orientationOffset.y + shift.y - 0.5) * this.width;
            zs[i] = array[cellIndex] * this.height;
        }
    }

    forEach(consumer: (index: number) => void): void {
        this.cellSource.forEach(consumer);
    }

    get orientationNormalsCoefficient(): number {
        return this.finitePlaneAbstraction.zoom % 2 === 0 ? -1 : +1;
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