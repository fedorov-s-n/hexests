import {Component} from "../di/Component";
import {Camera, Quaternion, Vector3} from "three";
import {SettingsStub} from "../util/SettingsStub";
import {Point2d} from "../finiteplane/Point2d";

@Component
export class PositionHelper {
    private readonly settingsStub: SettingsStub;

    public changed: boolean = true; // to trigger shifting code right on the start
    private readonly accumulator: Vector3 = new Vector3();
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
                this.makeStep(0, this.offsetStep, camera.quaternion);
            } else if (keyCode === 'KeyS') {
                this.makeStep(0, -this.offsetStep, camera.quaternion);
            } else if (keyCode === 'KeyA') {
                this.makeStep(-this.offsetStep, 0, camera.quaternion);
            } else if (keyCode === 'KeyD') {
                this.makeStep(this.offsetStep, 0, camera.quaternion);
            }
        });
    }

    private makeStep(dx: number, dy: number, rotation: Quaternion) {
        this.temp.set(dx, dy, 0);
        this.temp.applyQuaternion(rotation);
        this.accumulator.x += this.temp.x;
        this.accumulator.y += this.temp.y;
        this.changed = true;
    }

    get shift(): Point2d {
        this.temp.x = this.accumulator.x / this.settingsStub.shiftMultiplier
        this.temp.y = this.accumulator.y / this.settingsStub.shiftMultiplier;
        return this.temp as Point2d;
    }

    set shift(value: Point2d) {
        this.accumulator.x = value.x * this.settingsStub.shiftMultiplier;
        this.accumulator.y = value.y * this.settingsStub.shiftMultiplier;
    }
}