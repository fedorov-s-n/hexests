import {AbstractAlgorithm} from "./AbstractAlgorithm";
import {CellField} from "../fieldmodel/CellField";
import {Random} from "./Random";
import {CellDataDescriptor} from "../fieldmodel/CellDataDescriptor";

export class BrownianDrift extends AbstractAlgorithm {
    private readonly cellField: CellField;
    private readonly random: Random;
    private readonly plateTagger: (index: number) => number;
    private cellIndexToDomain!: number[];
    private domainDirections!: number[];
    private cellRemapping!: number[];
    private cellDensity!: number[];
    private iterations!: number;
    heightStep: number = 0.001;

    constructor(cellField: CellField, random: Random, plateTagger: (index: number) => number) {
        super();
        this.cellField = cellField;
        this.random = random;
        this.plateTagger = plateTagger;
    }

    init() {
        let domainIndex = -1;
        let domainTag = -1
        this.cellIndexToDomain = new Array<number>(this.cellField.getSize());
        this.cellField.search()
            .onEnter(() => domainIndex++)
            .onEnter(index => domainTag = this.plateTagger(index))
            .withChildFilter(index => this.plateTagger(index) === domainTag)
            .onFinish(index => this.cellIndexToDomain[index] = domainIndex)
            .dfs();
        this.domainDirections = new Array<number>(domainIndex + 1);
        this.cellRemapping = new Array<number>(this.cellField.getSize());
        for (let i = 0; i < this.cellField.getSize(); ++i) {
            this.cellRemapping[i] = i;
        }
        this.cellDensity = new Array<number>(this.cellField.getSize()).fill(0);
        this.iterations = 0;
    }

    step(): void {
        for (let d = 0; d < this.domainDirections.length; ++d) {
            this.domainDirections[d] = this.random.nextInt(6);
        }
        for (let i = 0; i < this.cellField.getSize(); ++i) {
            const domain = this.cellIndexToDomain[i];
            const direction = this.domainDirections[domain];
            const oldPositionIndex = this.cellRemapping[i];
            const newPositionIndex = this.cellField.getNeighbours(oldPositionIndex)[direction];
            this.cellRemapping[i] = newPositionIndex;
            this.cellDensity[newPositionIndex]++;
        }
        this.iterations++;
    }

    fillHeights() {
        for (let i = 0; i < this.cellField.getSize(); ++i) {
            this.cellField.setData(i, CellDataDescriptor.HEIGHT, this.heightStep * (this.cellDensity[i] - this.iterations));
        }
    }

    generateDefault() {
        this.init();
        this.steps(700);
        this.fillHeights();
    }
}