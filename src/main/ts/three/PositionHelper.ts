import {Component} from "../di/Component";
import {Camera, Quaternion, Vector3} from "three";

@Component
export class PositionHelper {
    changed: boolean = true; // to trigger shifting code right on the start
    readonly offset: Vector3 = new Vector3();
    private readonly temp: Vector3 = new Vector3();
    private offsetStep: number = 0.2;

    subscribe(document: Document, camera: Camera) {
        document.addEventListener("keydown", (event: HTMLElementEventMap[keyof HTMLElementEventMap]) => {
            // http://www.foreui.com/articles/Key_Code_Table.htm
            var keyCode = (event as any).which;
            if (keyCode === 87) { // w
                this.applyShift(0, this.offsetStep, camera.quaternion);
            } else if (keyCode === 83) { // s
                this.applyShift(0, -this.offsetStep, camera.quaternion);
            } else if (keyCode === 65) { // a
                this.applyShift(-this.offsetStep, 0, camera.quaternion);
            } else if (keyCode === 68) { // d
                this.applyShift(this.offsetStep, 0, camera.quaternion);
            }
        });
    }

    applyShift(dx: number, dy: number, rotation: Quaternion) {
        this.temp.set(dx, dy, 0);
        this.temp.applyQuaternion(rotation);
        this.offset.add(this.temp);
        this.changed = true;
    }
}