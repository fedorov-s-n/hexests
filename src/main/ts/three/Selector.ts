import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {CellData} from "../cell/CellData";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {FinitePlaneGeometry} from "../finiteplane/FinitePlaneGeometry";

export class Selector {
    static readonly ACCESSOR_KEY: string = 'selector-height';

    /** How far over the ground the marker floats, in the units of the plane, at any level. */
    private static readonly LIFT = 0.02;

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
     * Lifts the marker just over the ground it stands on. The ground is read from the level's own
     * cells, as the ground itself is, and only the cells holding the marker's corners are touched:
     * going over the whole level for one cell would cost more than everything else drawn.
     *
     * The lift is a hair in the plane's own units, and the same hair at every level. What is written
     * here is a value, which the model magnifies on its way to becoming a height -- and that
     * magnification grows with every level, so a lift given as a value would raise the marker a whole
     * cell over the ground at the deep levels and leave it standing beside what it marks.
     */
    updateHeights() {
        const additionalHeight = Selector.LIFT / this.mesh.finitePlaneGeometry.heightMagnification;
        const corners = Selector.CORNERS;
        const marker = this.data.accessor<number>(Selector.ACCESSOR_KEY).array;
        // the cells the ground's own corners are taken from, so the marker lies on it, not through it
        const land = this.data.height.array;
        const water = this.data.waterLevel.array;

        for (let place = 0; place < this.cellRadius.size; ++place) {
            const cell = this.abstraction.getShiftedCellIndex(this.cellRadius.cellAt(place));
            this.abstraction.fillCornerCells(cell, corners);
            for (let i = 0; i < 18; ++i) {
                const corner = corners[i];
                marker[corner] = Math.max(land[corner] || 0, water[corner] || 0) + additionalHeight;
            }
        }
    }
}