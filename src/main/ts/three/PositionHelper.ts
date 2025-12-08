import {Component} from "../di/Component";
import {Camera, Quaternion, Vector3} from "three";
import {SettingsStub} from "../util/SettingsStub";
import {Layer} from "./Layer";

@Component
export class PositionHelper {
    private readonly settingsStub: SettingsStub;

    private readonly accumulator: Vector3 = new Vector3();
    private readonly temp: Vector3 = new Vector3();
    private _changed: boolean = true; // to trigger shifting code right on the start
    private cameraMoveStep: number = 0.2;

    constructor(settingsStub: SettingsStub) {
        this.settingsStub = settingsStub;
    }

    subscribe(element: HTMLElement, camera: Camera) {
        element.ownerDocument.addEventListener("keydown", event => {
            // http://www.foreui.com/articles/Key_Code_Table.htm
            const keyCode = event.code;
            if (keyCode === 'KeyW') {
                this.makeStep(0, this.cameraMoveStep, camera.quaternion);
            } else if (keyCode === 'KeyS') {
                this.makeStep(0, -this.cameraMoveStep, camera.quaternion);
            } else if (keyCode === 'KeyA') {
                this.makeStep(-this.cameraMoveStep, 0, camera.quaternion);
            } else if (keyCode === 'KeyD') {
                this.makeStep(this.cameraMoveStep, 0, camera.quaternion);
            }
        });
    }

    private makeStep(dx: number, dy: number, rotation: Quaternion) {
        this.temp.set(dx, dy, 0);
        this.temp.applyQuaternion(rotation);
        this.accumulator.x += this.temp.x;
        this.accumulator.y += this.temp.y;
        this._changed = true;
    }

    flushAccumulated(layer: Layer) {
        const finitePlaneAbstraction = layer.level.finitePlaneAbstraction;
        const dx = this.accumulator.x / this.settingsStub.shiftMultiplier;
        const dy = this.accumulator.y / this.settingsStub.shiftMultiplier;

        finitePlaneAbstraction.applyShift(dx, dy, this.settingsStub);

        this.accumulator.x = finitePlaneAbstraction.helperShift.x * this.settingsStub.shiftMultiplier;
        this.accumulator.y = finitePlaneAbstraction.helperShift.y * this.settingsStub.shiftMultiplier;

        layer.landGeometry.computeVertexHeights();
        layer.waterGeometry.computeVertexHeights();
        layer.landMesh.position.x = finitePlaneAbstraction.meshShift.x;
        layer.landMesh.position.y = finitePlaneAbstraction.meshShift.y;
        layer.waterMesh.position.x = finitePlaneAbstraction.meshShift.x;
        layer.waterMesh.position.y = finitePlaneAbstraction.meshShift.y;
        layer.landTexture.updatePlane(finitePlaneAbstraction);
        layer.waterFlowMap.updatePlane(finitePlaneAbstraction);

        this._changed = false;
    }

    get changed(): boolean {
        return this._changed;
    }
}
