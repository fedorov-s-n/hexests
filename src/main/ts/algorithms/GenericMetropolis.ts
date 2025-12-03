import {CellField} from "../cell/CellField";
import {Random} from "../util/Random";
import {Component} from "../di/Component";
import {LevelManager} from "../level/LevelManager";
import {CellDataAccessor} from "../cell/CellDataAccessor";

const NEIGHBOURS = new Array<number>(6);
const DOMAIN_TYPE = 'metropolis:domaintype';

@Component
export class GenericMetropolis {
    private readonly random: Random;
    private readonly levelManager: LevelManager;

    public data!: CellDataAccessor<number>;
    public cellField!: CellField;
    public domainTypeCount!: number;
    public temperature: number = 1;

    constructor(random: Random, levelManager: LevelManager) {
        this.random = random;
        this.levelManager = levelManager;
    }

    init(cellField: CellField, domainTypeCount: number) {
        this.cellField = cellField;
        this.domainTypeCount = domainTypeCount;
        this.data = this.levelManager.levels.get(cellField.zoom).data.accessor(DOMAIN_TYPE, 0);
        this.data.array.fill(0);
    }

    step(): void {
        const index = this.random.nextInt(this.cellField.size);

        const val1 = this.data.array[index];
        const val2 = (val1 + this.random.nextInt(this.domainTypeCount)) % this.domainTypeCount;

        this.cellField.fillNeighbours(index, NEIGHBOURS);
        const e1 = 6 - NEIGHBOURS.filter(i => this.data.array[i] === val1).length;
        const e2 = 6 - NEIGHBOURS.filter(i => this.data.array[i] === val2).length;

        const changeChance = Math.exp(-(e2 - e1) / this.temperature);
        if (this.random.nextFloat() < changeChance) {
            this.data.array[index] = val2;
        }
    }

    public steps(count: number) {
        for (let i = 0; i < count; ++i) {
            this.step();
        }
    }

    fillOutput(output: (index: number, value: number) => void) {
        for (let i = 0; i < this.cellField.size; ++i) {
            output(i, this.data.array[i]);
        }
    }

    generateDefault(stepCountMultiplier: number, temperatures: number[]) {
        const stepCount = stepCountMultiplier * this.cellField.size;
        temperatures.forEach(temperature => {
            this.temperature = temperature;
            this.steps(stepCount);
        })
    }

    clear() {
        this.data.remove();
    }

    run(options: GenericMetropolisOptions) {
        const cellField = this.levelManager.cellFields.get(options.zoomLevel || 0);
        this.init(cellField, options.domainTypeCount || 3);
        this.generateDefault(options.stepCountMultiplier || 150, options.temperatures || [100, 1, 0]);
        if (options.output) this.fillOutput(options.output);
        if (!options.skipClear) this.clear();
    }
}

export interface GenericMetropolisOptions {
    stepCountMultiplier?: number,
    zoomLevel?: number,
    domainTypeCount?: number,
    temperatures?: number[],
    skipClear?: boolean,
    output?: (index: number, value: number) => void
}