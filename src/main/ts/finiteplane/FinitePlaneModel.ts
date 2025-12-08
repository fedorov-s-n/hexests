import {FinitePlaneAbstraction} from "./FinitePlaneAbstraction";
import {SettingsStub} from "../util/SettingsStub";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {Point2d} from "../util/Point2d";
import {CellSource} from "../cell/CellSource";

export class FinitePlaneModel {
    private readonly settingsStub: SettingsStub;
    private readonly finitePlaneAbstraction: FinitePlaneAbstraction;
    private readonly dataAccessor: CellDataAccessor<number>;
    private readonly cellSource: CellSource;

    constructor(settingsStub: SettingsStub, finitePlaneAbstraction: FinitePlaneAbstraction, dataAccessor: CellDataAccessor<number>, cellSource: CellSource) {
        this.settingsStub = settingsStub;
        this.finitePlaneAbstraction = finitePlaneAbstraction;
        this.dataAccessor = dataAccessor;
        this.cellSource = cellSource;
    }

    fillPointsXYZP(cellIndex: number, xs?: number[], ys?: number[], zs?: number[], ps?: number[]) {
        this.finitePlaneAbstraction.fillPointsXYZP(cellIndex, this.dataAccessor.lower, xs, ys, zs, ps);
    }

    forEach(consumer: (index: number) => void): void {
        this.cellSource.forEach(consumer);
    }

    get pointIdCount(): number {
        return this.finitePlaneAbstraction.pointIdCount;
    }

    get orientationOffset(): Point2d {
        return this.finitePlaneAbstraction.orientationOffset;
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