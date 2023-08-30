import {CellField} from "../fieldmodel/CellField";
import {AbstractAlgorithm} from "./AbstractAlgorithm";
import {Random} from "./Random";
import {DataDescriptor} from "../data/DataDescriptor";
import {Component} from "../di/Component";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {DataStorage} from "../data/DataStorage";

const NEIGHBOURS = new Array<number>(6);

@Component
export class GenericMetropolis extends AbstractAlgorithm {
    public static readonly DOMAIN_TYPE = new DataDescriptor<number>('metropolis:domaintype');

    private readonly random: Random;
    private readonly cellFieldProvider: CellFieldProvider;

    private dataStorage!: DataStorage<number, number>;

    public cellField!: CellField;
    public domainTypeCount!: number;
    public temperature: number = 1;

    constructor(random: Random, cellFieldProvider: CellFieldProvider) {
        super();
        this.random = random;
        this.cellFieldProvider = cellFieldProvider;
    }

    init(cellField: CellField, domainTypeCount: number) {
        this.cellField = cellField;
        this.domainTypeCount = domainTypeCount;
        this.dataStorage = this.cellFieldProvider.getDataStorage(GenericMetropolis.DOMAIN_TYPE, cellField.zoom, 0);
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

    generateDefault() {
        const stepCount = 150 * this.cellField.size;
        this.temperature = 100;
        this.steps(stepCount);
        this.temperature = 1;
        this.steps(stepCount);
        this.temperature = 0;
        this.steps(stepCount);
    }
}