import {CellField} from "../fieldmodel/CellField";
import {Random} from "./Random";
import {DataDescriptor} from "../data/DataDescriptor";
import {Component} from "../di/Component";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {DataStorage} from "../data/DataStorage";

const NEIGHBOURS = new Array<number>(6);
const DOMAIN_TYPE = new DataDescriptor<number>('metropolis:domaintype');

@Component
export class GenericMetropolis {
    private readonly random: Random;
    private readonly cellFieldProvider: CellFieldProvider;

    public dataStorage!: DataStorage<number, number>;
    public cellField!: CellField;
    public domainTypeCount!: number;
    public temperature: number = 1;

    constructor(random: Random, cellFieldProvider: CellFieldProvider) {
        this.random = random;
        this.cellFieldProvider = cellFieldProvider;
    }

    init(cellField: CellField, domainTypeCount: number) {
        this.cellField = cellField;
        this.domainTypeCount = domainTypeCount;
        this.dataStorage = this.cellFieldProvider.getDataStorage(DOMAIN_TYPE, cellField.zoom, 0);
    }

    step(): void {
        const index = this.random.nextInt(this.cellField.size);

        const val1 = this.dataStorage.getOrDefault(index, 0);
        const val2 = (val1 + this.random.nextInt(this.domainTypeCount)) % this.domainTypeCount;

        this.cellField.fillNeighbours(index, NEIGHBOURS);
        const e1 = 6 - NEIGHBOURS.filter(i => this.dataStorage.getValue(i) === val1).length;
        const e2 = 6 - NEIGHBOURS.filter(i => this.dataStorage.getValue(i) === val2).length;

        const changeChance = Math.exp(-(e2 - e1) / this.temperature);
        if (this.random.nextFloat() < changeChance) {
            this.dataStorage.putValue(index, val2);
        }
    }

    public steps(count: number) {
        for (let i = 0; i < count; ++i) {
            this.step();
        }
    }

    fillOutput(output: (index: number, value: number) => void) {
        for (let i = 0; i < this.cellField.size; ++i) {
            output(i, this.dataStorage.getOrDefault(i, 0));
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
        this.cellFieldProvider.removeData(DOMAIN_TYPE, this.cellField.zoom, 0);
    }

    run(options: GenericMetropolisOptions) {
        const cellField = this.cellFieldProvider.getField(options.zoomLevel || 0);
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