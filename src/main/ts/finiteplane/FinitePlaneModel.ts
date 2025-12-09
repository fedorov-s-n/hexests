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
    private readonly pointShiftSupplier: CellShiftSupplier;

    constructor(settingsStub: SettingsStub, finitePlaneAbstraction: FinitePlaneAbstraction,
                dataAccessor: CellDataAccessor<number>, cellSource: CellSource, pointShiftSupplier: CellShiftSupplier = finitePlaneAbstraction) {
        this.settingsStub = settingsStub;
        this.finitePlaneAbstraction = finitePlaneAbstraction;
        this.dataAccessor = dataAccessor;
        this.cellSource = cellSource;
        this.pointShiftSupplier = pointShiftSupplier;
    }

    fillPointsUVP(cellIndex: number, xs: number[], ys: number[], ps: number[]) {
        this.finitePlaneAbstraction.fillPointsXY(cellIndex, xs, ys);
        this.finitePlaneAbstraction.fillPointsP(cellIndex, ps);
    }

    fillPointsXYZP(cellIndex: number, xs: number[], ys: number[], zs: number[], ps: number[]) {
        const shiftedIndex = this.finitePlaneAbstraction.getShiftedCellIndex(cellIndex);
        this.finitePlaneAbstraction.fillPointsXY(shiftedIndex, xs, ys);
        this.finitePlaneAbstraction.fillPointsZ(cellIndex, zs, this.dataAccessor);
        const pointShiftedIndex = this.pointShiftSupplier.getShiftedCellIndex(cellIndex);
        this.finitePlaneAbstraction.fillPointsP(pointShiftedIndex, ps);

        const shift = this.finitePlaneAbstraction.pointShift;
        for (let i = 0; i < 6; ++i) {
            xs[i] = (xs[i] + this.finitePlaneAbstraction.orientationOffset.x + shift.x - 0.5) * this.length;
            ys[i] = (ys[i] + this.finitePlaneAbstraction.orientationOffset.y + shift.y - 0.5) * this.width;
            zs[i] *= this.height;
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