import {Component} from "../di/Component";
import {CellField} from "../fieldmodel/CellField";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {DataDescriptor} from "../data/DataDescriptor";
import {LevelController} from "../three/LevelController";
import {Math2} from "./Math2";


@Component
export class FlowGeneration {
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly levels: LevelController;

    cellField!: CellField;
    heightDescriptor!: DataDescriptor<number>;

    initialRain!: number;
    vapourCoefficient!: number;
    iterationMultiplier!: number;
    disposableRatio!: number;

    matrixC!: number[];
    matrixD!: number[];

    v0!: number[];
    v1!: number[];

    neighbours!: number[];
    neighbourIndices!: number[];
    w!: number[];

    outputValues!: (index: number, xSpeed: number, ySpeed: number, volume: number) => void;

    colorMultiplier!: number;

    constructor(cellFieldProvider: CellFieldProvider, levels: LevelController) {
        this.cellFieldProvider = cellFieldProvider;
        this.levels = levels;
    }

    init(options: FlowGenerationOptions) {
        this.cellField = this.cellFieldProvider.getField(options.zoomLevel);
        this.heightDescriptor = options.heightDescriptor;
        this.outputValues = options.output;
        this.vapourCoefficient = 0.8;//options.vapourCoefficient || 0.99;
        this.initialRain = options.initialRain || 0;

        this.v0 = new Array<number>(this.cellField.size).fill(this.initialRain);
        this.v1 = new Array<number>(this.cellField.size).fill(0);
        this.matrixC = new Array<number>(6 * this.cellField.size).fill(0);
        this.matrixD = new Array<number>(this.cellField.size).fill(0);

        this.neighbours = new Array<number>(6);
        this.neighbourIndices = [0, 1, 2, 3, 4, 5, 6];
        this.w = new Array<number>(7);

        this.disposableRatio = 0.8;
        this.iterationMultiplier = -1;
        this.colorMultiplier = 0.002;
    }

    step() {
        const hs = this.cellFieldProvider.getDataStorage(this.heightDescriptor, this.cellField.zoom, 0);
        const b = this.vapourCoefficient;
        const b1 = (1 - b) / b; // > 0
        const cm = this.iterationMultiplier;

        // calculate matrix
        this.cellField.forEach(centerId => {
            this.cellField.fillNeighbours(centerId, this.neighbours);
            const hk = (cellId: number) => hs.getOrDefault(cellId, 0) + this.v0[cellId];
            const nk = (index: number) => index === 6 ? centerId : this.neighbours[index];
            const hnk = (index: number) => hk(nk(index));
            Math2.sortBy(this.neighbourIndices, (index: number) => hnk(index));

            let index = this.neighbourIndices[0];
            let h0 = hnk(index);
            const sumW = Math.max(0, Math.min(hnk(6) - h0, this.v0[centerId]));
            let undistributed = sumW * this.disposableRatio;
            for (let ii = 0; ii < 6; ++ii) {
                const ii1 = ii + 1;
                const index1 = this.neighbourIndices[ii1];
                const h1 = hnk(index1);
                const wii = Math.min((h1 - h0) * ii1, undistributed);
                this.w[index] = wii / ii1;
                undistributed -= wii;
                index = index1;
                h0 = h1;
            }
            this.w[index] = undistributed / 7;

            let tba = 0;
            for (let ii = 6; ii >= 0; --ii) {
                index = this.neighbourIndices[ii];
                tba += this.w[index];
                this.w[index] = tba;
            }
            this.w[6] += sumW * (1 - this.disposableRatio);

            const cmcd = sumW > 0 ? 1 / sumW : 0;
            for (let ii = 0; ii < 7; ++ii) {
                const index = this.neighbourIndices[ii];
                if (index === 6) continue;
                const cellId = this.neighbours[index];
                this.matrixC[cellId * 6 + (index + 3) % 6] = this.w[index] * cmcd;
            }
            this.matrixD[centerId] = Math.max(0, sumW - this.w[6]) * cmcd + b1; // b1 is for rain
        });

        // iterative multiplication
        this.cellField.forEach(centerId => {
            let vi = this.v0[centerId] + cm * this.matrixD[centerId] * this.v0[centerId] /*+ cm * a1*/;
            this.cellField.fillNeighbours(centerId, this.neighbours);
            this.neighbours.forEach((cellId, arrayId) => {
                vi -= cm * this.matrixC[centerId * 6 + arrayId] * this.v0[cellId];
            });

            this.v1[centerId] = Math.max(0, vi);
        });

        // rain
        const undistributedV = (Math2.sum(...this.v0) - Math2.sum(...this.v1)) / this.cellField.size;
        if (undistributedV < 0) {
            throw new Error('Cannot result in more water than there was');
        }
        this.cellField.forEach(centerId => {
            this.v1[centerId] = Math.max(0, this.v1[centerId] + undistributedV);
        });

        // swap
        const v2 = this.v0;
        this.v0 = this.v1;
        this.v1 = v2;
    }

    output() {
        const orientation = this.cellFieldProvider.getFinitePlane(this.cellField.zoom).orientation;
        this.cellField.forEach(center => {
            const rowSpeed = 0;
            const columnSpeed = 0;
            const xSpeed = orientation.getXPos(rowSpeed, columnSpeed);
            const ySpeed = orientation.getYPos(rowSpeed, columnSpeed);
            this.outputValues(center, xSpeed, ySpeed, this.v0[center]);
        });
    }

    next(iterations: number) {
        for (let i = 0; i < iterations; ++i) {
            this.step();
        }
        this.output();
        this.updateTexture();
    }

    empty() {
        this.v0.fill(this.initialRain);
        this.v1.fill(0);
        this.matrixC.fill(0);
        this.matrixD.fill(0);
        this.neighbours.fill(0);
        this.w.fill(0);

        this.output();
        this.updateTexture();
    }

    updateTexture() {
        const zoom = this.cellField.zoom;
        const colorDS5 = this.cellFieldProvider.getDataStorage(DataDescriptor.COLOR, zoom, 0);
        const texture = this.levels.getCurrentLevel().landTexture;
        texture.loadFrom(
            this.cellFieldProvider.getFinitePlane(zoom),
            (index) => colorDS5.getValue(index)!!
        );
        texture.updatePlane(this.levels.getCurrentLevel().finitePlane);
    }

    clear() {
        // ['newSpeeds', 'newMasses', 'oldSpeeds', 'oldMasses', 'stillMasses'].forEach(field => {
        //     (this as any)[field] = undefined;
        // });
    }

    run(options: FlowGenerationOptions) {
        this.init(options);
        for (let i = 0; i < (options.stepCount || 100); ++i) {
            this.step();
        }
        this.output();
        if (!options.skipClear) {
            this.clear();
        }
    }
}

export interface FlowGenerationOptions {
    zoomLevel: number,
    heightDescriptor: DataDescriptor<number>,
    stepCount?: number,
    skipClear?: boolean,
    vapourCoefficient?: number;
    initialRain?: number;
    output: (index: number, xSpeed: number, ySpeed: number, volume: number) => void
}