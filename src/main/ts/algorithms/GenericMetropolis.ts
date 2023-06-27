import {CellField} from "../fieldmodel/CellField";
import {AbstractAlgorithm} from "./AbstractAlgorithm";
import {Random} from "./Random";
import {CellDataDescriptor} from "../fieldmodel/CellDataDescriptor";

export class GenericMetropolis extends AbstractAlgorithm {
    public static readonly DOMAIN_TYPE = new CellDataDescriptor<number>('metropolis:domaintype');

    private readonly cellField: CellField;
    private readonly random: Random;
    private readonly domainTypeCount: number;

    public temperature: number = 1;

    constructor(cellField: CellField, random: Random, domainTypeCount: number) {
        super();
        this.cellField = cellField;
        this.random = random;
        this.domainTypeCount = domainTypeCount;
    }

    step(): void {
        const index = this.random.nextInt(this.cellField.getSize());

        const val1 = this.cellField.getData(index, GenericMetropolis.DOMAIN_TYPE) || 0;
        const val2 = (val1 + this.random.nextInt(this.domainTypeCount)) % this.domainTypeCount;

        const neighbours = this.cellField.getNeighbours(index);
        const e1 = 6 - neighbours.filter(i => this.cellField.getData(i, GenericMetropolis.DOMAIN_TYPE) === val1).length;
        const e2 = 6 - neighbours.filter(i => this.cellField.getData(i, GenericMetropolis.DOMAIN_TYPE) === val2).length;

        const changeChance = Math.exp(-(e2 - e1) / this.temperature);
        if (this.random.nextFloat() < changeChance) {
            this.cellField.setData(index, GenericMetropolis.DOMAIN_TYPE, val2);
        }
    }

    generateDefault() {
        const stepCount = 10 * this.cellField.getSize();
        this.temperature = 100;
        this.steps(stepCount);
        this.temperature = 1;
        this.steps(stepCount);
        this.temperature = 0;
        this.steps(stepCount);
    }
}