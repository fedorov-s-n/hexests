import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {CellData} from "../cell/CellData";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";

export class Selector {
    static readonly ACCESSOR_KEY: string = 'selector-height';

    private static readonly CORNERS = new Array<number>(18);

    readonly cellRadius: CellRadius;
    readonly mesh: FinitePlaneMesh;
    readonly data: CellData;
    private readonly abstraction: FinitePlaneAbstraction;

    constructor(cellRadius: CellRadius, mesh: FinitePlaneMesh, data: CellData,
                abstraction: FinitePlaneAbstraction) {
        this.cellRadius = cellRadius;
        this.mesh = mesh;
        this.data = data;
        this.abstraction = abstraction;
    }

    /**
     * Lifts the marker just over the ground it stands on. Only the corners of its own cells are
     * touched: spreading the whole level for one cell would cost more than everything else drawn.
     */
    updateHeights() {
        const additionalHeight = 0.001;
        const corners = Selector.CORNERS;
        const below = this.data.accessor<number>(Selector.ACCESSOR_KEY).lower.array;
        const land = this.data.height.array;
        const water = this.data.waterLevel.array;

        this.cellRadius.forEach(index => {
            const cell = this.abstraction.getShiftedCellIndex(index);
            const height = Math.max(land[cell], water[cell]) + additionalHeight;
            this.abstraction.fillCornerCells(cell, corners);
            for (let i = 0; i < 18; ++i) below[corners[i]] = height;
        });
    }
}