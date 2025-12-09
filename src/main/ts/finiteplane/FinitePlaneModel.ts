import {FinitePlaneAbstraction} from "./FinitePlaneAbstraction";
import {SettingsStub} from "../util/SettingsStub";
import {CellDataAccessor} from "../cell/CellDataAccessor";
import {CellSource} from "../cell/CellSource";
import {Point2d} from "../util/Point2d";

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

    fillPointsUVP(cellIndex: number, xs: number[], ys: number[], ps: number[]) {
        this.finitePlaneAbstraction.fillPointsXYZP(cellIndex, undefined, 0, xs, ys, undefined, ps);
    }

    fillPointsXYZP(cellIndex: number, xs: number[], ys: number[], zs: number[], ps: number[]) {
        this.finitePlaneAbstraction.fillPointsXYZP(cellIndex, this.dataAccessor.lower, 1, xs, ys, zs, ps);
        for (let i = 0; i < 6; ++i) {
            xs[i] = (xs[i] + this.finitePlaneAbstraction.orientationOffset.x - 0.5) * this.length;
            ys[i] = (ys[i] + this.finitePlaneAbstraction.orientationOffset.y - 0.5) * this.width;
            zs[i] *= this.height;
        }
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