import {Component} from "../di/Component";
import {Camera, Quaternion, Raycaster, Vector2, Vector3} from "three";
import {SettingsStub} from "../util/SettingsStub";
import {Layer} from "./Layer";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {Tooltip} from "../htmlcomponents/Tooltip";
import {SelectionState} from "./SelectionState";

@Component
export class PositionHelper {
    private readonly settingsStub: SettingsStub;
    private readonly selectionState: SelectionState;

    private readonly accumulator: Vector3 = new Vector3();
    private readonly temp: Vector3 = new Vector3();
    private _shiftChanged: boolean = false; // to trigger shifting code right on the start
    private _selectionChanged: boolean = false; // to trigger shifting code right on the start
    private cameraMoveStep: number = 0.2;
    private dragMoveStep: number = 0.02;
    private middleButtonPanning: boolean = false;
    private raycaster!: Raycaster;
    private camera!: Camera;
    private container!: HTMLElement;
    private tooltip!: Tooltip<number>;
    private selectedCell = {id: [0], x: [0], y: [0], z: [0], tooltip: new Vector3()};
    private faceAngles = [0, 0, 0];
    private pointIds = [0, 0, 0];
    private readonly offset = [0, 0];
    private dataCell: number | undefined = undefined;
    private _wheelNotches: number = 0;

    constructor(settingsStub: SettingsStub, selectionState: SelectionState) {
        this.settingsStub = settingsStub;
        this.selectionState = selectionState;
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
        this.camera = camera;
        this.container = element;
        element.addEventListener('wheel', event => {
            // the wheel picks the level, not the distance to the plane
            event.preventDefault();
            this._wheelNotches += event.deltaY < 0 ? +1 : -1;
        }, {passive: false});
        this.tooltip = new Tooltip(
            e => `cell index: ${e}`,
            e => this.selectedCell.tooltip
        );
        this.tooltip.attach(element);

        element.addEventListener('pointerdown', event => {
            if (event.button === 1) {
                event.preventDefault();
                this.middleButtonPanning = true;
                element.setPointerCapture(event.pointerId);
            }
        });
        const stopPanning = (event: PointerEvent) => {
            if (event.button === 1 || event.type !== 'pointerup') {
                this.middleButtonPanning = false;
            }
        };
        element.addEventListener('pointerup', stopPanning);
        element.addEventListener('pointercancel', stopPanning);

        const mouse = new Vector2(1, 1);
        element.addEventListener('pointermove', event => {
            event.preventDefault();

            if (this.middleButtonPanning) {
                this.makeStep(
                    -event.movementX * this.dragMoveStep,
                    event.movementY * this.dragMoveStep,
                    camera.quaternion
                );
            }

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
        layer.gridGeometry.refreshPositions();
        layer.landTexture.updatePlane(finitePlaneAbstraction);
        layer.waterFlowMap.updatePlane(finitePlaneAbstraction);
        // the world has flowed under a pointer that has not moved, so the cell it is over is another
        // one: the marker is picked again, in this very frame, instead of being hidden until the
        // pointer stirs. The ray is still the one the pointer cast; it is the world that is new.
        this.pickAgain();

        this._shiftChanged = false;
    }

    get shiftChanged(): boolean {
        return this._shiftChanged;
    }

    /** Notches of the wheel turned since this was last asked; the view decides what they are worth. */
    takeWheelNotches(): number {
        const notches = this._wheelNotches;
        this._wheelNotches = 0;
        return notches;
    }

    flushAccumulatedSelection(layer: Layer) {
        // switched off from the list of overlays: nothing is asked of the world and nothing is drawn
        if (!this.selectionState.shown) {
            layer.selector.mesh.visible = false;
            this.tooltip.element = undefined;
            this._selectionChanged = false;
            return;
        }
        const abstraction = layer.level.finitePlaneAbstraction;
        // a triangle is wanted, and asking whether it has one is asking whether its face is there --
        // not whether the numbers of its corners are all true, which the corner numbered zero is not
        const intersections = this.raycaster
            .intersectObjects([layer.landMesh, layer.waterMesh])
            .filter(i => i.object instanceof FinitePlaneMesh && !i.object.selector && i.face != null);
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

                if (abstraction.pickOffsetByPointIds(this.pointIds, this.offset)) {
                    selectedCellId = abstraction.cellAtOffset(this.offset[0], this.offset[1]);
                    this.dataCell = abstraction.getShiftedCellIndex(selectedCellId);
                    const cell = this.selectedCell;
                    // the tooltip is put over the cell of the world, not over the place it flowed to
                    cell.id[0] = this.dataCell;
                    mesh.finitePlaneGeometry.fillCellsXYZ(cell.id, cell.x, cell.y, cell.z);
                    cell.tooltip.x = cell.x[0];
                    cell.tooltip.y = cell.y[0];
                    cell.tooltip.z = cell.z[0];
                    cell.tooltip.project(this.camera);

                    var width = this.container.clientWidth, height = this.container.clientHeight;
                    var widthHalf = width / 2, heightHalf = height / 2;

                    cell.tooltip.x = (cell.tooltip.x * widthHalf) + widthHalf;
                    cell.tooltip.y = -(cell.tooltip.y * heightHalf) + heightHalf;
                    cell.tooltip.z = 0;
                }
            }
        }
        if (selectedCellId !== undefined) {
            layer.selector.mesh.visible = true;
            layer.selector.cellRadius.setAnchor(this.offset[0], this.offset[1]);
            layer.selector.mesh.finitePlaneGeometry.refreshPositions();
            this.tooltip.element = this.dataCell;
        } else {
            layer.selector.mesh.visible = false;
            this.tooltip.element = undefined;
        }


        this._selectionChanged = false;
    }

    get selectionChanged(): boolean {
        return this._selectionChanged;
    }

    /** Ask for the marker to be worked out again, from the ray the pointer last cast. */
    pickAgain() {
        this._selectionChanged = true;
    }
}
