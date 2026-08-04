import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {CellData} from "../cell/CellData";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {FinitePlaneGeometry} from "../finiteplane/FinitePlaneGeometry";

export class Selector {
    static readonly ACCESSOR_KEY: string = 'selector-height';

    private static readonly CORNERS = new Array<number>(18);

    readonly cellRadius: CellRadius;
    readonly mesh: FinitePlaneMesh;
    readonly data: CellData;
    private readonly abstraction: FinitePlaneAbstraction;
    private readonly buildGeometry: () => FinitePlaneGeometry;

    constructor(cellRadius: CellRadius, mesh: FinitePlaneMesh, data: CellData,
                abstraction: FinitePlaneAbstraction, buildGeometry: () => FinitePlaneGeometry) {
        this.cellRadius = cellRadius;
        this.mesh = mesh;
        this.data = data;
        this.abstraction = abstraction;
        this.buildGeometry = buildGeometry;
    }

    /** A wider or narrower selection is a different set of cells, so the mesh is built anew. */
    setRadius(radius: number) {
        if (this.cellRadius.radius === radius) return;
        this.cellRadius.radius = radius;
        const shown = this.mesh.visible;
        this.mesh.geometry.dispose();
        this.mesh.geometry = this.buildGeometry();
        this.updateHeights();
        this.mesh.finitePlaneGeometry.refreshPositions();
        this.mesh.visible = shown;
    }

    /**
     * Lifts the marker just over the ground it stands on. Only the corners of its own cells are
     * touched: spreading the whole level for one cell would cost more than everything else drawn.
     */
    updateHeights() {
        const additionalHeight = 0.005;
        const corners = Selector.CORNERS;
        const below = this.data.accessor<number>(Selector.ACCESSOR_KEY).lower.array;
        // the corners of the ground itself, so that the marker lies on it instead of cutting through
        const land = this.data.height.lower.array;
        const water = this.data.waterLevel.lower.array;

        for (let place = 0; place < this.cellRadius.size; ++place) {
            const cell = this.abstraction.getShiftedCellIndex(this.cellRadius.cellAt(place));
            this.abstraction.fillCornerCells(cell, corners);
            for (let i = 0; i < 18; ++i) {
                const corner = corners[i];
                below[corner] = Math.max(land[corner] || 0, water[corner] || 0) + additionalHeight;
            }
        }
    }
}