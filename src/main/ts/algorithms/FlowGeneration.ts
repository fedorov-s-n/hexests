import {Component} from "../di/Component";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {LevelController} from "../three/LevelController";
import {GenerationState} from "./GenerationState";
import {DataDescriptor} from "../data/DataDescriptor";
import {CellField} from "../fieldmodel/CellField";

@Component
export class FlowGeneration {
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly levels: LevelController;

    constructor(cellFieldProvider: CellFieldProvider, levels: LevelController) {
        this.cellFieldProvider = cellFieldProvider;
        this.levels = levels;
    }

    run(zoomLevel: number): FGState {
        const state = new FGState(this.cellFieldProvider, this.levels);
        state.init();
        state.clean();

        return state;
    }
}

class FGState implements GenerationState {
    private static readonly DC = 1 / 12;

    private readonly levels: LevelController;
    private readonly cellFieldProvider: CellFieldProvider;

    private cellField!: CellField;
    field!: number[];
    private field2!: number[];
    height!: number[];

    drop!: number;
    initialAmount: number = 0.125;
    vapourLimit: number = 0.002;
    vapourCoeff: number = 0.015;

    constructor(cellFieldProvider: CellFieldProvider, levels: LevelController) {
        this.cellFieldProvider = cellFieldProvider;
        this.levels = levels;
    }

    init() {
        this.cellField = this.levels.getCurrentLevel().cellField;
        const zoom = this.levels.getCurrentZoomLevel();
        const depth = this.levels.getCurrentDepthLevel();
        this.height = this.cellFieldProvider.getData(DataDescriptor.HEIGHT, zoom, depth);
        this.field = this.cellFieldProvider.getData(DataDescriptor.WATER_LEVEL, zoom, depth);
        this.field2 = new Array<number>(this.cellField.size).fill(0);
        this.resetConstants();
    }

    swap() {
        const f = this.field;
        this.field = this.field2;
        this.field2 = f;
    }

    spill() {
        const drop = this.drop;
        for (let i = 0; i < this.cellField.size; ++i) {
            this.field2[i] = this.field[i] + drop;
        }
    }

    diffuse() {
        const neighbours = new Array<number>(6).fill(-1);
        for (let i = 0; i < this.cellField.size; ++i) {
            this.cellField.fillNeighbours(i, neighbours);
            for (let j = 0; j < 3; ++j) {
                this.diffuseOne(i, neighbours[j]);
            }
        }
    }

    diffuseOne(i1: number, i2: number) {
        const f = this.field;
        const h = this.height;

        const sign = Math.sign(f[i1] - f[i2]);
        if (sign == 0) return;
        const diff = FGState.DC * Math.max(0, sign > 0
            ? f[i1] - Math.max(f[i2], h[i1])
            : f[i2] - Math.max(f[i1], h[i2])
        );

        this.field2[i1] -= sign * diff;
        this.field2[i2] += sign * diff;
    }

    vapour(): number {
        const vl = this.vapourLimit;
        const vc = this.vapourCoeff;
        let totalVA = 0;
        for (let i = 0; i < this.cellField.size; ++i) {
            const w = Math.max(0, this.field[i] - this.height[i]);
            const vp = Math.min(w / vl, 1);
            const va = Math.min(vp * vc, w);
            this.field[i] -= va;
            totalVA += va;
        }
        return totalVA;
    }

    collect(totalVA: number) {
        this.drop = totalVA / this.cellField.size;
    }

    interpolate(diff: number) {
        const zoom = this.levels.getCurrentZoomLevel();
        const depth = this.levels.getCurrentDepthLevel();

        this.cellFieldProvider.setData(DataDescriptor.WATER_LEVEL, zoom, depth, this.field);
        this.cellFieldProvider.interpolateData(DataDescriptor.WATER_LEVEL, zoom, zoom + diff, depth);
    }

    readyForDisplay() {
        this.interpolate(+1);
        this.levels.getCurrentLevel().waterGeometry.computeVertexHeights();
    }

    step() {
        this.spill();
        this.diffuse();
        this.swap();
        const va = this.vapour();
        this.collect(va);
    }

    steps(count: number) {
        for (let i = 0; i < count; ++i) {
            this.step();
        }
    }

    clean() {
        let maxH = 0, minH = 0;
        for (let i = 0; i < this.cellField.size; ++i) {
            const h = this.height[i];
            if (h > maxH) maxH = h;
            if (h < minH) minH = h;
            this.field[i] = h;
            this.field2[i] = h;
        }
        this.drop = (maxH - minH) * this.initialAmount;
    }

    dispose() {
        this.field = [];
        this.field2 = [];
        this.height = [];
    }

    levelUp() {
        this.interpolate(+1);
        this.levels.levelUp();
        this.init();
        this.drop /= 3;
    }

    levelDown() {
        if (this.levels.getCurrentZoomLevel() === 0) return;
        this.interpolate(-1);
        this.levels.levelDown();
        this.init();
        this.drop *= 3;
    }

    resetConstants() {
        const squareModifier = Math.pow(3, this.levels.getCurrentZoomLevel());
        this.vapourCoeff = 0.015 / squareModifier;
        this.vapourLimit = 0.002 / squareModifier;
        this.initialAmount = 0.125 / squareModifier;
    }
}