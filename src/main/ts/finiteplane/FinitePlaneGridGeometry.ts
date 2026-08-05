import {BufferGeometry, Float32BufferAttribute} from "three";
import {FinitePlaneModel} from "./FinitePlaneModel";

/**
 * The outlines of the cells of one level, drawn as lines over its surface, so that it is visible
 * where the cells of the level being looked at actually are. The lines lie exactly on the ground and
 * are kept in front of it by the material, not by being nudged up towards the eye.
 */
export class FinitePlaneGridGeometry extends BufferGeometry {
    private static readonly XS = new Array<number>(6);
    private static readonly YS = new Array<number>(6);
    private static readonly ZS = new Array<number>(6);

    private readonly finitePlaneModel: FinitePlaneModel;
    private readonly cellIndices: number[] = [];

    constructor(finitePlaneModel: FinitePlaneModel) {
        super();
        this.type = 'FinitePlaneGridGeometry';
        this.finitePlaneModel = finitePlaneModel;

        const vertices: number[] = [];
        const indices: number[] = [];
        finitePlaneModel.forEach(cellIndex => {
            const base = 6 * this.cellIndices.length;
            this.cellIndices.push(cellIndex);
            for (let corner = 0; corner < 6; ++corner) {
                vertices.push(0, 0, 0);
                indices.push(base + corner, base + (corner + 1) % 6);
            }
        });

        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    }

    refreshPositions() {
        const position = this.getAttribute('position') as Float32BufferAttribute;
        const XS = FinitePlaneGridGeometry.XS;
        const YS = FinitePlaneGridGeometry.YS;
        const ZS = FinitePlaneGridGeometry.ZS;
        const cornerHeights = this.finitePlaneModel.cornerHeights;

        for (let i = 0; i < this.cellIndices.length; ++i) {
            this.finitePlaneModel.fillPointsXYZ(this.cellIndices[i], XS, YS, ZS, cornerHeights);
            for (let corner = 0; corner < 6; ++corner) {
                position.setXYZ(6 * i + corner, XS[corner], YS[corner], ZS[corner]);
            }
        }
        position.needsUpdate = true;
        this.computeBoundingSphere();
    }
}
