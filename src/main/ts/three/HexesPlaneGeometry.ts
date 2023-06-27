import {BufferGeometry, Float32BufferAttribute} from "three";
import {CellField} from "../fieldmodel/CellField";
import {CellDataDescriptor} from "../fieldmodel/CellDataDescriptor";
import {Shift} from "../fieldmodel/Shift";

const UNSET_MARK = -1;
const CENTER_MARK = -2;

export class HexesPlaneGeometry extends BufferGeometry {
    readonly length: number;
    readonly width: number;
    readonly height: number;
    shift: Shift;
    private readonly neighbours: number[];

    constructor(length: number, width: number, height: number, cellField: CellField) {
        super();

        // future class members
        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const neighbours: number[] = [];

        // temporary variables
        let counter: number = 0;
        const cellCount = cellField.getSize();
        const indicesByPointId = new Array<number>(cellField.getPointIdUpperBorder()).fill(UNSET_MARK);
        const indicesByCellIndex = new Array<number>(cellCount).fill(UNSET_MARK);
        const groupedIndices = new Array<number>(7 * cellCount).fill(UNSET_MARK);

        // create and group vertices; no heights and normals are set
        cellField.traversePoints((cellIndex: number, pointId: number, pointOrder: number, xpos: number, ypos: number) => {
            let index = indicesByPointId[pointId];
            if (index === UNSET_MARK) {
                vertices.push((xpos - 0.5) * length, (ypos - 0.5) * width, 0);
                normals.push(0, 0, 1);
                uvs.push(xpos, ypos);
                indicesByPointId[pointId] = index = counter++;
                if (pointOrder === 0) {
                    indicesByCellIndex[cellIndex] = index;
                    neighbours.push(UNSET_MARK, CENTER_MARK, cellIndex);
                } else {
                    neighbours.push(cellIndex, UNSET_MARK, UNSET_MARK);
                }
            } else {
                let nextNeighborIndex = 3 * index + 1;
                if (neighbours[nextNeighborIndex] !== UNSET_MARK) {
                    ++nextNeighborIndex;
                }
                if (neighbours[nextNeighborIndex] !== UNSET_MARK) {
                    throw new Error('Neighbour pool overflow');
                }
                neighbours[nextNeighborIndex] = cellIndex;
            }
            groupedIndices[7 * cellIndex + pointOrder] = index;
        });

        // bind vertices into faces
        for (let i = 0; i < cellCount; ++i) {
            const center = groupedIndices[7 * i];
            if (center === UNSET_MARK) throw  new Error('No center index');
            for (let j = 0; j < 6; ++j) {
                const index1 = groupedIndices[7 * i + j + 1];
                const index2 = groupedIndices[7 * i + ((j + 1) % 6) + 1];
                if (index1 === UNSET_MARK || index2 === UNSET_MARK) throw new Error('No point index');
                indices.push(index1, index2, center);
            }
        }

        // remap neighbours from cells to vertices
        for (let i = 0; i < neighbours.length; i += 3) {
            for (let j = 0; j < 3; ++j) {
                const index = i + j;
                const value = neighbours[index];
                if (value === UNSET_MARK) break;
                neighbours[index] = indicesByCellIndex[value];
            }
        }

        // initialization
        this.type = 'HexesPlaneGeometry';
        this.length = length;
        this.width = width;
        this.height = height;
        this.neighbours = neighbours;
        this.shift = cellField.getShift(0, 0);
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

        this.computeVertexHeights(cellField);
    }

    computeVertexHeights(cellField: CellField) {
        const vertices = this.getAttribute('position') as Float32BufferAttribute;

        for (let i = 0; i < vertices.count; ++i) {
            if (this.neighbours[3 * i + 1] === CENTER_MARK) {
                // this is a special meaning of 3rd neighbour: cell index corresponding to the center point
                const cellIndex = this.neighbours[3 * i + 2];
                const shiftedCellIndex = this.shift.getShiftedCell(cellIndex);
                const dataHeight = cellField.getData(shiftedCellIndex, CellDataDescriptor.HEIGHT) || 0;
                vertices.setZ(i, dataHeight * this.height);
            }
        }

        for (let i = 0; i < vertices.count; ++i) {
            const point1 = this.neighbours[3 * i];
            if (point1 === UNSET_MARK) {
                continue;
            }

            const point2 = this.neighbours[3 * i + 1];
            if (point2 === UNSET_MARK) {
                vertices.setZ(i, vertices.getZ(point1));
                continue;
            }

            const point3 = this.neighbours[3 * i + 2];
            if (point3 === UNSET_MARK) {
                vertices.setZ(i, (vertices.getZ(point1) + vertices.getZ(point2)) / 2);
                continue;
            }

            vertices.setZ(i, (vertices.getZ(point1) + vertices.getZ(point2) + vertices.getZ(point3)) / 3);
        }

        vertices.needsUpdate = true;
    }
}
