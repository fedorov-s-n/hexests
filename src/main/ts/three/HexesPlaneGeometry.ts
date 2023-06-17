import {BufferGeometry, Float32BufferAttribute} from "three";
import {CellField} from "../fieldmodel/CellField";

export class HexesPlaneGeometry extends BufferGeometry {
    constructor(width: number, height: number, cellField: CellField) {
        super();

        this.type = 'HexesPlaneGeometry';

        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        let counter: number = 0;
        const cellCount = cellField.getSize();
        const indicesByPointId = new Array<number>(cellField.getPointIdUpperBorder()).fill(-1);
        const groupedIndices = new Array<number>(7 * cellCount).fill(-1);

        cellField.traversePoints((cellIndex: number, pointId: number, pointOrder: number, xpos: number, ypos: number) => {
            let index = indicesByPointId[pointId];
            if (index === -1) {
                vertices.push(xpos * width, ypos * height, 0);
                normals.push(0, 0, 1);
                uvs.push(xpos, ypos);
                indicesByPointId[pointId] = index = counter++;
            }
            groupedIndices[7 * cellIndex + pointOrder] = index;
        });

        for (let i = 0; i < cellCount; ++i) {
            const center = groupedIndices[7 * i];
            if (center === -1) throw  new Error('No center index');
            for (let j = 0; j < 6; ++j) {
                const index1 = groupedIndices[7 * i + j + 1];
                const index2 = groupedIndices[7 * i + ((j + 1) % 6) + 1];
                if (index1 === -1 || index2 === -1) throw new Error('No point index');
                indices.push(index1, index2, center);
            }
        }

        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }
}
