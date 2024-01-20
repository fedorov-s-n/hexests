import {Component} from "../di/Component";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";

@Component
export class AltitudeMeter {
    private readonly cellFieldProvider: CellFieldProvider;

    constructor(cellFieldProvider: CellFieldProvider) {
        this.cellFieldProvider = cellFieldProvider;
    }

    run(options: AltitudeMeterOptions): number[] {
        const cellField = this.cellFieldProvider.getField(options.zoomLevel || 0);
        const heights = new Array<number>(cellField.size);
        cellField.forEach(i => heights[i] = options.input(i));
        heights.sort((a, b) => a - b);
        let buckets = options.buckets;
        if (!buckets) {
            const bucketCount = options.bucketCount || 10;
            buckets = new Array<number>(bucketCount);
            for (let i = 0; i < bucketCount; ++i) {
                buckets[i] = i / bucketCount;
            }
        }
        return buckets.map(bucket => heights[Math.max(0, Math.min(Math.round(bucket * cellField.size), cellField.size - 1))]);
    }
}

export interface AltitudeMeterOptions {
    zoomLevel?: number,
    input: (index: number) => number,
    buckets?: number[],
    bucketCount?: number
}