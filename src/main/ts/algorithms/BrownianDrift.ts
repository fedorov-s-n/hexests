import {AbstractAlgorithm} from "./AbstractAlgorithm";
import {CellField} from "../fieldmodel/CellField";
import {Random} from "./Random";
import {DataDescriptor} from "../data/DataDescriptor";
import {Component} from "../di/Component";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";

const NEIGHBOURS = new Array<number>(6);

@Component
export class BrownianDrift extends AbstractAlgorithm {
    private readonly random: Random;
    private readonly cellFieldProvider: CellFieldProvider;

    public cellField!: CellField;
    public plateTagger!: (index: number) => number;
    public heightStep!: number;

    private cellIndexToDomain!: number[];
    private domainDirections!: number[];
    private cellRemapping!: number[];
    private cellDensity!: number[];
    private iterations!: number;

    constructor(random: Random, cellFieldProvider: CellFieldProvider) {
        super();
        this.random = random;
        this.cellFieldProvider = cellFieldProvider;
    }

    init(cellField: CellField, plateTagger: (index: number) => number) {
        this.cellField = cellField;
        this.heightStep = 0.02 / Math.sqrt(cellField.size);
        this.plateTagger = plateTagger;

        let domainIndex = -1;
        let domainTag = -1
        this.cellIndexToDomain = new Array<number>(this.cellField.size);
        this.cellField.search()
            .onEnter(() => domainIndex++)
            .onEnter(index => domainTag = this.plateTagger(index))
            .withChildFilter(index => this.plateTagger(index) === domainTag)
            .onFinish(index => this.cellIndexToDomain[index] = domainIndex)
            .dfs();
        this.domainDirections = new Array<number>(domainIndex + 1);
        this.cellRemapping = new Array<number>(this.cellField.size);
        for (let i = 0; i < this.cellField.size; ++i) {
            this.cellRemapping[i] = i;
        }
        this.cellDensity = new Array<number>(this.cellField.size).fill(0);
        this.iterations = 0;
    }

    step(): void {
        for (let d = 0; d < this.domainDirections.length; ++d) {
            this.domainDirections[d] = this.random.nextInt(6);
        }
        for (let i = 0; i < this.cellField.size; ++i) {
            const domain = this.cellIndexToDomain[i];
            const direction = this.domainDirections[domain];
            const oldPositionIndex = this.cellRemapping[i];
            this.cellField.fillNeighbours(oldPositionIndex, NEIGHBOURS);
            const newPositionIndex = NEIGHBOURS[direction];
            this.cellRemapping[i] = newPositionIndex;
            this.cellDensity[newPositionIndex]++;
        }
        this.iterations++;
    }

    fillHeights() {
        const dataStorage = this.cellFieldProvider.getDataStorage(DataDescriptor.HEIGHT, this.cellField.zoom, 0);
        for (let i = 0; i < this.cellField.size; ++i) {
            dataStorage.putValue(i, this.heightStep * (this.cellDensity[i] - this.iterations));
        }
    }

    generateDefault() {
        this.steps(700);
        this.fillHeights();
    }
}