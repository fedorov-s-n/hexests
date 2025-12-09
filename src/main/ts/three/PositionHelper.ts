import {Component} from "../di/Component";
import {Camera, Quaternion, Raycaster, Vector2, Vector3} from "three";
import {SettingsStub} from "../util/SettingsStub";
import {Layer} from "./Layer";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";

@Component
export class PositionHelper {
    private readonly settingsStub: SettingsStub;

    private readonly accumulator: Vector3 = new Vector3();
    private readonly temp: Vector3 = new Vector3();
    private _shiftChanged: boolean = false; // to trigger shifting code right on the start
    private _selectionChanged: boolean = false; // to trigger shifting code right on the start
    private cameraMoveStep: number = 0.2;
    private raycaster!: Raycaster;
    private faceAngles = [0, 0, 0];
    private pointIds = [0, 0, 0];

    constructor(settingsStub: SettingsStub) {
        this.settingsStub = settingsStub;
    }

    subscribe(element: HTMLElement, camera: Camera, raycaster: Raycaster) {
        const document = element.ownerDocument;
        document.addEventListener("keydown", event => {
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
        this.raycaster = raycaster;
        const mouse = new Vector2(1, 1);
        element.addEventListener('pointermove', event => {
            event.preventDefault();

            mouse.x = (event.clientX / element.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / element.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            this._selectionChanged = true;
        });
    }

    private makeStep(dx: number, dy: number, rotation: Quaternion) {
        this.temp.set(dx, dy, 0);
        this.temp.applyQuaternion(rotation);
        this.accumulator.x += this.temp.x;
        this.accumulator.y += this.temp.y;
        this._shiftChanged = true;
    }

    flushAccumulatedShift(layer: Layer) {
        const finitePlaneAbstraction = layer.level.finitePlaneAbstraction;
        const dx = this.accumulator.x / this.settingsStub.shiftMultiplier;
        const dy = this.accumulator.y / this.settingsStub.shiftMultiplier;

        finitePlaneAbstraction.applyShift(dx, dy);

        this.accumulator.x = finitePlaneAbstraction.helperShift.x * this.settingsStub.shiftMultiplier;
        this.accumulator.y = finitePlaneAbstraction.helperShift.y * this.settingsStub.shiftMultiplier;

        layer.landGeometry.refreshPositions();
        layer.waterGeometry.refreshPositions();
        layer.landTexture.updatePlane(finitePlaneAbstraction);
        layer.waterFlowMap.updatePlane(finitePlaneAbstraction);
        layer.selector.mesh.visible = false;

        this._shiftChanged = false;
    }

    get shiftChanged(): boolean {
        return this._shiftChanged;
    }

    flushAccumulatedSelection(layer: Layer) {
        const intersections = this.raycaster
            .intersectObjects([layer.landMesh, layer.waterMesh])
            .filter(i => i.object instanceof FinitePlaneMesh && !i.object.selector && i.face?.a && i.face?.b && i.face?.c);
        let selectedCellId: number | undefined = undefined;
        if (intersections.length) {
            const intersection = intersections.reduce((i1, i2) => i1.point.z >= i2.point.z ? i1 : i2);
            const face = intersection.face;
            if (intersection.object instanceof FinitePlaneMesh) {
                const mesh = intersection.object as FinitePlaneMesh;
                this.faceAngles[0] = face!.a;
                this.faceAngles[1] = face!.b;
                this.faceAngles[2] = face!.c;
                mesh.inferPointIds(this.faceAngles, this.pointIds);

                selectedCellId = layer.level.finitePlaneAbstraction.pickCellByPointIds(this.pointIds);
            }
        }
        if (selectedCellId !== undefined) {
            layer.selector.mesh.visible = true;
            layer.selector.cellRadius.cellIndex = selectedCellId;
            layer.selector.mesh.finitePlaneGeometry.refreshPositions();
        } else {
            layer.selector.mesh.visible = false;
        }


        this._selectionChanged = false;
    }

    get selectionChanged(): boolean {
        return this._selectionChanged;
    }
}
