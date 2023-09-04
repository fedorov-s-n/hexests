import {Component} from "../di/Component";
import {Camera, Quaternion, Vector3} from "three";
import {SettingsStub} from "./SettingsStub";
import {Point2d} from "../fieldmodel/Point2d";

@Component
export class PositionHelper {
    private readonly settingsStub: SettingsStub;

    public changed: boolean = true; // to trigger shifting code right on the start
    private readonly offset: Vector3 = new Vector3();
    private readonly temp: Vector3 = new Vector3();
    private offsetStep: number = 0.2;

    constructor(settingsStub: SettingsStub) {
        this.settingsStub = settingsStub;
    }

    subscribe(element: HTMLElement, camera: Camera) {
        element.ownerDocument.addEventListener("keydown", event => {
            // http://www.foreui.com/articles/Key_Code_Table.htm
            const keyCode = event.code;
            if (keyCode === 'KeyW') {
                this.applyShift(0, this.offsetStep, camera.quaternion);
            } else if (keyCode === 'KeyS') {
                this.applyShift(0, -this.offsetStep, camera.quaternion);
            } else if (keyCode === 'KeyA') {
                this.applyShift(-this.offsetStep, 0, camera.quaternion);
            } else if (keyCode === 'KeyD') {
                this.applyShift(this.offsetStep, 0, camera.quaternion);
            }
        });
    }

    private applyShift(dx: number, dy: number, rotation: Quaternion) {
        this.temp.set(dx, dy, 0);
        this.temp.applyQuaternion(rotation);
        this.offset.x += this.temp.x;
        this.offset.y += this.temp.y;
        this.changed = true;
    }

    get shift(): Point2d {
        const dx = this.offset.x / this.settingsStub.shiftMultiplier;
        const dy = this.offset.y / this.settingsStub.shiftMultiplier;
        return new Point2d(dx, dy);
    }

    set shift(value: Point2d) {
        this.offset.x = value.x * this.settingsStub.shiftMultiplier;
        this.offset.y = value.y * this.settingsStub.shiftMultiplier;
    }
}