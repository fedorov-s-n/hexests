import {GraphSearchBuilder} from "../util/GraphSearchBuilder";
import {CellSource} from "./CellSource";

export interface CellField extends CellSource {
    size: number;
    zoom: number;

    fillNeighbours(index: number, neighbours: number[]): void;

    search(...indices: number[]): GraphSearchBuilder<number>;

    forEach(consumer: (index: number) => void): void;

    get lower(): CellField;

    get higher(): CellField | undefined;

    interpolate(highData: number[], lowData: number[]): void;
}