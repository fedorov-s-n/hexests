import {BufferGeometry, Float32BufferAttribute} from "three";
import {FinitePlaneModel} from "./FinitePlaneModel";

const XS = new Array<number>(6);
const YS = new Array<number>(6);
const ZS = new Array<number>(6);
const PS = new Array<number>(6);

export class FinitePlaneGeometry extends BufferGeometry {
    readonly indicesByPointId: number[];
    private readonly finitePlaneModel: FinitePlaneModel;

    constructor(finitePlaneModel: FinitePlaneModel) {
        super();
        this.type = 'FinitePlaneGeometry';
        this.finitePlaneModel = finitePlaneModel;
        this.indicesByPointId = new Array<number>(finitePlaneModel.pointIdCount);

        // future class members
        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        // temporary variables
        let counter: number = -1;
        const pointIndices = new Array<number>(6);

        function pushPoint(x: number, y: number, z: number): number {
            vertices.push(
                (x + finitePlaneModel.orientationOffset.x - 0.5) * finitePlaneModel.length,
                (y + finitePlaneModel.orientationOffset.y - 0.5) * finitePlaneModel.width,
                (z) * finitePlaneModel.height);
            normals.push(0, 0, 1);
            uvs.push(x, y);
            return ++counter;
        }

        finitePlaneModel.forEach(cellIndex => {
            finitePlaneModel.fillPointsXYZP(cellIndex, XS, YS, ZS, PS);
            for (let j = 0; j < 6; ++j) {
                const pid = PS[j];
                if (!Number.isFinite(this.indicesByPointId[pid])) {
                    this.indicesByPointId[pid] = pushPoint(XS[j], YS[j], ZS[j]);
                }
                pointIndices[j] = this.indicesByPointId[pid];
            }

            const d = finitePlaneModel.orientationNormalsCoefficient;
            for (let j = 0; j < 3; ++j) {
                const i0 = 6 + 2 * j;
                for (let k = 0; k < 3; ++k) {
                    indices.push(pointIndices[(i0 + d * k) % 6]);
                }
            }
            for (let j = 0; j < 3; ++j) {
                indices.push(pointIndices[(6 + 2 * d * j) % 6]);
            }
        });

        // initialization
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        this.computeVertexNormals();
    }

    computeVertexHeights() {
        const vertices = this.getAttribute('position') as Float32BufferAttribute;

        this.finitePlaneModel.forEach(cellIndex => {
            this.finitePlaneModel.fillPointsXYZP(cellIndex, undefined, undefined, ZS, PS);
            for (let order = 0; order < 6; ++order) {
                const pointId = PS[order];
                const index = this.indicesByPointId[pointId];
                vertices.setZ(index, ZS[order] * this.finitePlaneModel.height);
            }
        });
        this.computeVertexNormals();
        vertices.needsUpdate = true;
    }
}
