import {GraphSearchBuilder} from "../algorithms/GraphSearchBuilder";

export interface CellField {
    size: number;
    zoom: number;

    fillNeighbours(index: number, neighbours: number[]): void;

    search(...indices: number[]): GraphSearchBuilder<number>;

    forEach(consumer: (index: number) => void): void;
}