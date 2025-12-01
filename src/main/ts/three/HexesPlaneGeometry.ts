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
        let counter: number = -1;
        const xs = new Array<number>(6);
        const ys = new Array<number>(6);
        const zs = new Array<number>(6);
        const ps = new Array<number>(6);
        const pointIndices = new Array<number>(6);

        function pushPoint(x: number, y: number, z: number): number {
            vertices.push(
                (x + finitePlane.offset.x - 0.5) * length,
                (y + finitePlane.offset.y - 0.5) * width,
                (z) * height);
            normals.push(0, 0, 1);
            uvs.push(x, y);
            return ++counter;
        }

        for (let cellIndex = 0; cellIndex < finitePlane.size; ++cellIndex) {
            finitePlane.fillPointsXY(cellIndex, xs, ys);
            finitePlane.fillPointsZP(heightDescriptor, cellIndex, zs, ps);
            for (let j = 0; j < 6; ++j) {
                const pid = ps[j];
                if (!Number.isFinite(indicesByPointId[pid])) {
                    indicesByPointId[pid] = pushPoint(xs[j], ys[j], zs[j]);
                }
                pointIndices[j] = indicesByPointId[pid];
            }

            const d = finitePlane.zoom % 2 === 0 ? -1 : +1; // direction, for normals
            for (let j = 0; j < 3; ++j) {
                const i0 = 6 + 2 * j;
                for (let k = 0; k < 3; ++k) {
                    indices.push(pointIndices[(i0 + d * k) % 6]);
                }
            }
            for (let j = 0; j < 3; ++j) {
                indices.push(pointIndices[(6 + 2 * d * j) % 6]);
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
        const zs = new Array<number>(6);
        const ps = new Array<number>(6);

        for (let cellIndex = 0; cellIndex < this.finitePlane.size; ++cellIndex) {
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
