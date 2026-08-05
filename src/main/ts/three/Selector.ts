import {CellRadius} from "../cell/CellRadius";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {FinitePlaneGeometry} from "../finiteplane/FinitePlaneGeometry";

/**
 * The marker under the pointer: a disc of cells, filled in over the ground.
 *
 * It is drawn from the very heights the ground and the cell outlines are drawn from, so it lies on
 * exactly the cells the outlines show and cannot drift from them, whatever the level and whichever
 * way the camera is turned.
 */
export class Selector {
    readonly cellRadius: CellRadius;
    readonly mesh: FinitePlaneMesh;
    private readonly buildGeometry: () => FinitePlaneGeometry;

    constructor(cellRadius: CellRadius, mesh: FinitePlaneMesh, buildGeometry: () => FinitePlaneGeometry) {
        this.cellRadius = cellRadius;
        this.mesh = mesh;
        this.buildGeometry = buildGeometry;
    }

    /** A wider or narrower selection is a different set of cells, so the mesh is built anew. */
    setRadius(radius: number) {
        if (this.cellRadius.radius === radius) return;
        this.cellRadius.radius = radius;
        const shown = this.mesh.visible;
        this.mesh.geometry.dispose();
        this.mesh.geometry = this.buildGeometry();
        this.mesh.finitePlaneGeometry.refreshPositions();
        this.mesh.visible = shown;
    }
}
