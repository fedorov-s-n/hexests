import {Component} from "../di/Component";
import {Camera, Quaternion, Vector3} from "three";
import {LevelController} from "./LevelController";
import {SettingsStub} from "./SettingsStub";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {DataDescriptor} from "../data/DataDescriptor";

@Component
export class PositionHelper {
    private readonly levels: LevelController;
    private readonly settingsStub: SettingsStub;
    private readonly cellFieldProvider: CellFieldProvider;

    private changed: boolean = true; // to trigger shifting code right on the start
    readonly offset: Vector3 = new Vector3();
    private readonly temp: Vector3 = new Vector3();
    private offsetStep: number = 0.2;

    constructor(levels: LevelController, settingsStub: SettingsStub, cellFieldProvider: CellFieldProvider) {
        this.levels = levels;
        this.settingsStub = settingsStub;
        this.cellFieldProvider = cellFieldProvider;
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

    applyShift(dx: number, dy: number, rotation: Quaternion) {
        this.temp.set(dx, dy, 0);
        this.temp.applyQuaternion(rotation);
        this.offset.x += this.temp.x;
        this.offset.y += this.temp.y;
        this.changed = true;
    }

    onAnimationStep() {
        if (this.changed) {
            const dx = this.offset.x / this.settingsStub.shiftMultiplier;
            const dy = this.offset.y / this.settingsStub.shiftMultiplier;
            const level = this.levels.getCurrentLevel();
            const shift = level.applyShift(dx, dy, this.cellFieldProvider.getDataStorage(DataDescriptor.HEIGHT, level.cellField.zoom, 0));

            this.offset.x = shift.requested.x * this.settingsStub.planeSideSize;
            this.offset.y = shift.requested.y * this.settingsStub.planeSideSize;
            this.changed = false;
        }
    }
}