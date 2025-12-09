import {GraphSearchBuilder} from "../util/GraphSearchBuilder";
import {CellSource} from "./CellSource";
import {CellRadius} from "./CellRadius";

export interface CellField extends CellSource {
    get size(): number;

    get zoom(): number;

    fillNeighbours(index: number, neighbours: number[]): void;

    search(...indices: number[]): GraphSearchBuilder<number>;

    forEach(consumer: (index: number) => void): void;

    get lower(): CellField;

    get higher(): CellField | undefined;

    interpolate(highData: number[], lowData: number[]): void;

    radius(index?: number, radius?: number): CellRadius;
}