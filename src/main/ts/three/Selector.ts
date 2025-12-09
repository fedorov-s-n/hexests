import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {CellData} from "../cell/CellData";

export class Selector {
    static readonly ACCESSOR_KEY: string = 'selector-height';

    readonly cellRadius: CellRadius;
    readonly mesh: FinitePlaneMesh;
    readonly data: CellData;

    constructor(cellRadius: CellRadius, mesh: FinitePlaneMesh, data: CellData) {
        this.cellRadius = cellRadius;
        this.mesh = mesh;
        this.data = data;
    }

    updateHeights() {
        const additionalHeight = 0.001;
        const accessor = this.data.accessor(Selector.ACCESSOR_KEY);
        const heights = accessor.array;
        const h1 = this.data.height.array;
        const h2 = this.data.waterLevel.array;
        for (let i = 0; i < this.data.cellField.size; ++i) {
            heights[i] = Math.max(h1[i], h2[i]) + additionalHeight;
        }
        accessor.interpolate();
    }
}