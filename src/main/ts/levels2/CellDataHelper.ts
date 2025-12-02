import {RectangularCellField} from "../fieldmodel/RectangularCellField";
import {Component} from "../di/Component";
import {LevelManager} from "./LevelManager";
import {DataManager} from "../data2/DataManager";
import {CellDataKey} from "./CellDataKey";

@Component
export class CellDataHelper {
    private readonly levelManager: LevelManager;
    private readonly dataManager: DataManager;

    constructor(levelManager: LevelManager, dataManager: DataManager) {
        this.levelManager = levelManager;
        this.dataManager = dataManager;
    }

    mapIndexExactly(index: number, fromZoom: number, toZoom: number): number | undefined {
        this.levelManager.cellFields.get(Math.max(fromZoom, toZoom));
        let zoom = fromZoom;
        for (; zoom < toZoom; ++zoom) {
            index = (this.levelManager.cellFields.get(zoom) as RectangularCellField).mapIndexToLowerLevel(index);
        }
        return zoom === toZoom ? index : undefined;
    }

    interpolateDS(name: string, fromZoom: number, toZoom: number, depth: number) {
        if (toZoom < fromZoom) throw new Error();
        const neighbours = new Array<number>(6);
        for (let zoom = fromZoom; zoom < toZoom; ++zoom) {
            const upField = this.levelManager.cellFields.get(zoom);
            const lowField = this.levelManager.cellFields.get(zoom + 1);
            const upDS = this.dataManager.get<number>(new CellDataKey(name, zoom, depth))!!;
            const lowKey = new CellDataKey<number>(name, zoom + 1, depth);
            const lowDS = this.dataManager.getOrCreate<number>(lowKey, lowField.size).fill(0);

            for (let upIndex = 0; upIndex < upField.size; ++upIndex) {
                const lowIndex = (upField as RectangularCellField).mapIndexToLowerLevel(upIndex);
                lowField.fillNeighbours(lowIndex, neighbours);
                const input = upDS[upIndex];
                lowDS[lowIndex] = 3 * input;
                for (let ni = 0; ni < 6; ++ni) {
                    const index = neighbours[ni];
                    lowDS[index] += input;
                }
            }
            for (let lowIndex = 0; lowIndex < lowField.size; ++lowIndex) {
                lowDS[lowIndex] /= 3;
            }
        }
    }

    fillDataStorage<T>(name: string, zoom: number, depth: number, func: (index: number) => T): T[] {
        const cellField = this.levelManager.cellFields.get(zoom);
        const size = cellField.size;
        const array = this.dataManager.getOrCreate<T>(new CellDataKey<T>(name, zoom, depth), size);

        for (let i = 0; i < size; ++i) {
            array[i] = func(i);
        }
        return array;
    }
}