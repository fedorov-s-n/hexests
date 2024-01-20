import {BufferGeometry, Float32BufferAttribute} from "three";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {DataDescriptor} from "../data/DataDescriptor";

export class HexesPlaneGeometry extends BufferGeometry {
    readonly length: number;
    readonly width: number;
    readonly height: number;

    private readonly indicesByPointId: number[];
    private readonly finitePlane: FinitePlaneAbstraction;
    private readonly heightDescriptor: DataDescriptor<number>;

    constructor(length: number, width: number, height: number,
        finitePlane: FinitePlaneAbstraction, heightDescriptor: DataDescriptor<number>) {
        super();

        // future class members
        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indicesByPointId: Array<number> = [];

        // temporary variables
        let counter: number = 0;
        const xs = new Array<number>(6);
        const ys = new Array<number>(6);
        const zs = new Array<number>(6);
        const ps = new Array<number>(6);
        const pointIndices = new Array<number>(6);
        const centerIds = [0];

        function pushPoint(x: number, y: number, z: number): number {
            vertices.push(
                (x + finitePlane.offset.x - 0.5) * length,
                (y + finitePlane.offset.y - 0.5) * width,
                (z) * height);
            normals.push(0, 0, 1);
            uvs.push(x, y);
            return counter++;
        }

        for (let cellIndex = 0; cellIndex < finitePlane.size; ++cellIndex) {
            centerIds[0] = cellIndex;
            finitePlane.fillCellXY(centerIds, xs, ys);
            finitePlane.fillCellZP(heightDescriptor, centerIds, zs, ps);
            const centerIndex = pushPoint(xs[0], ys[0], zs[0]);
            indicesByPointId[ps[0]] = centerIndex;
            finitePlane.fillPointsXY(cellIndex, xs, ys);
            finitePlane.fillPointsZP(heightDescriptor, cellIndex, zs, ps);
            for (let j = 0; j < 6; ++j) {
                const pid = ps[j];
                pointIndices[j] = indicesByPointId[pid]
                    = indicesByPointId[pid] || pushPoint(xs[j], ys[j], zs[j]);
            }
            for (let j = 0; j < 6; ++j) {
                const index1 = pointIndices[j];
                const index2 = pointIndices[(j + 1) % 6];
                if (finitePlane.zoom % 2 === 0) {
                    indices.push(centerIndex, index2, index1);
                } else {
                    indices.push(centerIndex, index1, index2);
                }
            }
        }

        // initialization
        this.type = 'HexesPlaneGeometry';
        this.length = length;
        this.width = width;
        this.height = height;
        this.indicesByPointId = indicesByPointId;
        this.finitePlane = finitePlane;
        this.heightDescriptor = heightDescriptor;
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        this.computeVertexNormals();
    }

    computeVertexHeights() {
        const vertices = this.getAttribute('position') as Float32BufferAttribute;
        const ci = [0];
        const zs = new Array<number>(6);
        const ps = new Array<number>(6);

        for (let cellIndex = 0; cellIndex < this.finitePlane.size; ++cellIndex) {
            ci[0] = cellIndex;
            this.finitePlane.fillCellZP(this.heightDescriptor, ci, zs, ps);
            vertices.setZ(this.indicesByPointId[ps[0]], zs[0] * this.height);
            this.finitePlane.fillPointsZP(this.heightDescriptor, cellIndex, zs, ps);
            for (let order = 0; order < 6; ++order) {
                const pointId = ps[order];
                const index = this.indicesByPointId[pointId];
                vertices.setZ(index, zs[order] * this.height);
            }
        }
        this.computeVertexNormals();
        vertices.needsUpdate = true;
    }
}
