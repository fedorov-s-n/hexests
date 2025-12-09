import {BufferGeometry, Float32BufferAttribute} from "three";
import {FinitePlaneModel} from "./FinitePlaneModel";

export class FinitePlaneGeometry extends BufferGeometry {
    static XS = new Array<number>(6);
    static YS = new Array<number>(6);
    static ZS = new Array<number>(6);
    static PS = new Array<number>(6);

    private readonly pointIdsByIndices: number[];
    private readonly indicesByPointId: number[];
    private readonly finitePlaneModel: FinitePlaneModel;

    constructor(finitePlaneModel: FinitePlaneModel) {
        super();
        this.type = 'FinitePlaneGeometry';
        this.finitePlaneModel = finitePlaneModel;

        // future class members
        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const points: number[] = [];
        const indexMap: number[] = [];

        // temporary variables
        let counter: number = -1;
        const pointIndices = new Array<number>(6);

        const US = FinitePlaneGeometry.XS;
        const VS = FinitePlaneGeometry.YS;
        const PS = FinitePlaneGeometry.PS;

        finitePlaneModel.forEach(cellIndex => {
            finitePlaneModel.fillPointsUVP(cellIndex, US, VS, PS);
            for (let j = 0; j < 6; ++j) {
                const pid = PS[j];
                if (!Number.isFinite(indexMap[pid])) {
                    vertices.push(0, 0, 0);
                    normals.push(0, 0, 1);
                    uvs.push(US[j], VS[j]);
                    points.push(pid);
                    indexMap[pid] = ++counter;
                }
                pointIndices[j] = indexMap[pid];
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
        this.indicesByPointId = indexMap;
        this.pointIdsByIndices = points;

        this.computeVertexNormals();
    }

    getPointId(index: number): number {
        return this.pointIdsByIndices[index];
    }

    refreshPositions() {
        const vertices = this.getAttribute('position') as Float32BufferAttribute;
        const XS = FinitePlaneGeometry.XS;
        const YS = FinitePlaneGeometry.YS;
        const ZS = FinitePlaneGeometry.ZS;
        const PS = FinitePlaneGeometry.PS;

        this.finitePlaneModel.forEach(cellIndex => {
            this.finitePlaneModel.fillPointsXYZP(cellIndex, XS, YS, ZS, PS);
            for (let order = 0; order < 6; ++order) {
                const pointId = PS[order];
                const index = this.indicesByPointId[pointId];
                vertices.setXYZ(index, XS[order], YS[order], ZS[order]);
            }
        });
        this.computeVertexNormals();
        vertices.needsUpdate = true;
    }
}
