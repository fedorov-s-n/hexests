import {Material, Mesh} from "three";
import {FinitePlaneGeometry} from "./FinitePlaneGeometry";

export class FinitePlaneMesh extends Mesh {
    selector: boolean = false;

    constructor(geometry: FinitePlaneGeometry, material: Material | Material[]) {
        super(geometry, material);
    }

    inferPointIds(input: number[], output: number[]) {
        input.forEach((faceNumber, index) => {
            output[index] = this.finitePlaneGeometry.getPointId(faceNumber);
        });
    }

    get finitePlaneGeometry(): FinitePlaneGeometry {
        return this.geometry as FinitePlaneGeometry;
    }
}