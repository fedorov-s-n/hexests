import {BufferGeometry, Float32BufferAttribute} from "three";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";

const ROW_ID_SHIFTS = [3, 2, 1, 0, 1, 2];
const ODD_COLUMN_ID_SHIFTS = [0, 1, 1, 0, 0, 0];
const EVEN_COLUMN_ID_SHIFTS = [1, 1, 1, 1, 0, 0];

const XS = new Array<number>(6);
const YS = new Array<number>(6);
const ZS = new Array<number>(6);
const PS = new Array<number>(6);
const NS = new Array<number>(6);

export class HexesPlaneGeometry extends BufferGeometry {
    readonly length: number;
    readonly width: number;
    readonly height: number;

    private readonly indicesByPointId: number[];
    private readonly finitePlane: FinitePlaneAbstraction;
    private readonly heights: number[];

    constructor(length: number, width: number, height: number,
                finitePlane: FinitePlaneAbstraction, heights: number[]) {
        super();
        this.type = 'HexesPlaneGeometry';
        this.length = length;
        this.width = width;
        this.height = height;
        this.finitePlane = finitePlane;
        this.heights = heights;
        this.indicesByPointId = new Array<number>(heights.length);

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
                (x + finitePlane.offset.x - 0.5) * length,
                (y + finitePlane.offset.y - 0.5) * width,
                (z) * height);
            normals.push(0, 0, 1);
            uvs.push(x, y);
            return ++counter;
        }

        for (let cellIndex = 0; cellIndex < finitePlane.size; ++cellIndex) {
            finitePlane.fillPointsXY(cellIndex, XS, YS);
            this.fillPointHeights(cellIndex, ZS, NS);
            this.fillPointIds(cellIndex, PS);
            for (let j = 0; j < 6; ++j) {
                const pid = PS[j];
                if (!Number.isFinite(this.indicesByPointId[pid])) {
                    this.indicesByPointId[pid] = pushPoint(XS[j], YS[j], ZS[j]);
                }
                pointIndices[j] = this.indicesByPointId[pid];
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
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        this.computeVertexNormals();
    }

    computeVertexHeights() {
        const vertices = this.getAttribute('position') as Float32BufferAttribute;

        for (let cellIndex = 0; cellIndex < this.finitePlane.size; ++cellIndex) {
            this.fillPointHeights(cellIndex, ZS, NS);
            this.fillPointIds(cellIndex, PS);
            for (let order = 0; order < 6; ++order) {
                const pointId = PS[order];
                const index = this.indicesByPointId[pointId];
                vertices.setZ(index, ZS[order] * this.height);
            }
        }
        this.computeVertexNormals();
        vertices.needsUpdate = true;
    }

    fillPointHeights(cellIndex: number, zs: number[], neighbours: number[]) {
        this.finitePlane.fillShiftedCellPointIndexes(cellIndex, neighbours);
        for (let arrayIndex = 0; arrayIndex < 6; ++arrayIndex) {
            const index = neighbours[arrayIndex];
            zs[arrayIndex] = this.heights[index];
        }
    }

    private fillPointIds(cellIndex: number, pointIds: number[]) {
        const column = cellIndex % this.finitePlane.columnCount;
        const row = (cellIndex - column) / this.finitePlane.columnCount;
        const columnIdShifts = row % 2 === 0 ? EVEN_COLUMN_ID_SHIFTS : ODD_COLUMN_ID_SHIFTS;
        const rowSize = this.finitePlane.columnCount + 1;
        for (let order = 0; order < 6; ++order) {
            pointIds[order] = (2 * row + ROW_ID_SHIFTS[order]) * rowSize + column + columnIdShifts[order];
        }
    }
}
