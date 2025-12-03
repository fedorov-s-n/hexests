import {Component} from "../di/Component";
import {GenerationState} from "./GenerationState";
import {CellField} from "../cell/CellField";
import {LevelManager} from "../level/LevelManager";

@Component
export class FlowGeneration {
    private readonly levelManager: LevelManager;

    constructor(levelManager: LevelManager) {
        this.levelManager = levelManager;
    }

    run(zoomLevel: number): FGState {
        const cellField = this.levelManager.cellFields.get(zoomLevel);
        const height = this.levelManager.levels.get(zoomLevel).data.height.array;

        const state = new FGState(this, height, cellField);
        state.init();

        return state;
    }
}

class FGState implements GenerationState {
    private static readonly DC = 1 / 12;

    private readonly flow: FlowGeneration;
    private readonly heightDS: number[];
    private readonly cellField: CellField;
    field!: number[];
    private field2!: number[];
    height!: number[];
    drop!: number;
    vapourLimit: number = 0.002;
    vapourCoeff: number = 0.015;

    constructor(flow: FlowGeneration, heightDS: number[], cellField: CellField) {
        this.flow = flow;
        this.heightDS = heightDS;
        this.cellField = cellField;
    }

    init() {
        const size = this.cellField.size;
        const field1 = new Array<number>(size);
        const field2 = new Array<number>(size);
        const height = new Array<number>(size);

        this.field = field1;
        this.field2 = field2;
        this.height = height;

        this.clean();
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
            const h = this.heightDS[i];
            if (h > maxH) maxH = h;
            if (h < minH) minH = h;
            this.field[i] = h;
            this.field2[i] = h;
            this.height[i] = h;
        }
        this.drop = (maxH - minH) * 0.125;
    }

    dispose() {
        this.field.length = 0;
        this.field2.length = 0;
        this.height.length = 0;
    }
}