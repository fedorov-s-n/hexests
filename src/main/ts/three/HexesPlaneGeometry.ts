import {BufferGeometry, Float32BufferAttribute} from "three";
import {Shift} from "../fieldmodel/Shift";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {DataStorage} from "../data/DataStorage";

export class HexesPlaneGeometry extends BufferGeometry {
    readonly length: number;
    readonly width: number;
    readonly height: number;

    private readonly cells: number[];

    constructor(length: number, width: number, height: number, finitePlane: FinitePlaneAbstraction) {
        super();

        // future class members
        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const cells: number[] = [];

        // temporary variables
        let counter: number = 0;
        const xs = new Array<number>(6);
        const ys = new Array<number>(6);
        const pointIds = new Array<number>(6);
        const pointIndices = new Array<number>(6);
        const centerIds = [0];
        const indicesByPointId: Array<number> = [];

        function pushPoint(x: number, y: number): number {
            vertices.push((x + finitePlane.offset.x - 0.5) * length, (y + finitePlane.offset.y - 0.5) * width, 0);
            normals.push(0, 0, 1);
            uvs.push(x, y);
            return counter++;
        }

        for (let cellIndex = 0; cellIndex < finitePlane.size; ++cellIndex) {
            centerIds[0] = cellIndex;
            finitePlane.fillPositions(centerIds, xs, ys);
            const centerIndex = pushPoint(xs[0], ys[0]);
            cells[centerIndex] = cellIndex;
            finitePlane.fillPoints(cellIndex, xs, ys, pointIds);
            for (let j = 0; j < 6; ++j) {
                const pid = pointIds[j];
                pointIndices[j] = indicesByPointId[pid] = indicesByPointId[pid] || pushPoint(xs[j], ys[j]);
            }
            for (let j = 0; j < 6; ++j) {
                const index1 = pointIndices[j];
                const index2 = pointIndices[(j + 1) % 6];
                indices.push(centerIndex, index1, index2);
            }
        }

        // initialization
        this.type = 'HexesPlaneGeometry';
        this.length = length;
        this.width = width;
        this.height = height;
        this.cells = cells;
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }

    computeVertexHeights(shift: Shift, heightDataStorage: DataStorage<number, number>) {
        const vertices = this.getAttribute('position') as Float32BufferAttribute;
        const index = this.index!!;

        for (let p = 0; p < vertices.count; ++p) {
            vertices.setZ(p, 0);
        }

        let heightContribution;
        for (let i = 0; i < index.count; i += 3) {
            heightContribution = 0;
            for (let j = 0; j < 3; ++j) {
                const pointIndex = index.getX(i + j);
                const maybeCell = this.cells[pointIndex];
                if (maybeCell) {
                    const cellIndex = shift.getShiftedCell(maybeCell);
                    heightContribution = heightDataStorage.getOrDefault(cellIndex, 0);
                    break;
                }
            }
            for (let j = 0; j < 3; ++j) {
                const pointIndex = index.getX(i + j);
                const zValue = vertices.getZ(pointIndex) + heightContribution;
                vertices.setZ(pointIndex, zValue);
            }
        }

        for (let p = 0; p < vertices.count; ++p) {
            const z = vertices.getZ(p);
            vertices.setZ(p, z * this.height / 6);
        }

        this.computeVertexNormals();
        vertices.needsUpdate = true;
    }
}
