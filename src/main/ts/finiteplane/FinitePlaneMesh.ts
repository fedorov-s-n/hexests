import {Material, Mesh} from "three";
import {FinitePlaneGeometry} from "./FinitePlaneGeometry";

export class FinitePlaneMesh extends Mesh {
    constructor(geometry: FinitePlaneGeometry, material: Material | Material[]) {
        super(geometry, material);
    }

    inferPointIds(input: number[], output: number[]) {
        const geometry = this.geometry as FinitePlaneGeometry;
        input.forEach((faceNumber, index) => {
            output[index] = geometry.indicesByPointId.findIndex(v => v === faceNumber);
        });
    }
}