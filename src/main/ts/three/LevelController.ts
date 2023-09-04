import {CellField} from "../fieldmodel/CellField";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {HexesPlaneGeometry} from "./HexesPlaneGeometry";
import {DoubleSide, Mesh, MeshLambertMaterial} from "three";
import {Texture1} from "./Texture1";
import {Object3D} from "three/src/core/Object3D";
import {Component} from "../di/Component";
import {SettingsStub} from "./SettingsStub";
import {PositionHelper} from "./PositionHelper";
import {Point2d} from "../fieldmodel/Point2d";

@Component
export class LevelController {
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly settingsStub: SettingsStub;
    private readonly document: Document;
    private readonly positionHelper: PositionHelper;
    private readonly levels!: Level[];
    private zoom: number = 0;
    private depth: number = 0;

    private texture1common: Texture1;

    constructor(cellFieldProvider: CellFieldProvider, settingsStub: SettingsStub, document: Document, positionHelper: PositionHelper) {
        this.cellFieldProvider = cellFieldProvider;
        this.settingsStub = settingsStub;
        this.document = document;
        this.positionHelper = positionHelper;
        this.levels = [];

        const canvasElement = document.createElement('canvas');
        canvasElement.width = this.settingsStub.bigTextureSize;
        canvasElement.height = this.settingsStub.bigTextureSize;
        this.texture1common = new Texture1(canvasElement); // so far that's good
    }

    installLevels(count: number) {
        for (let zoom = 0; zoom < count; ++zoom) {
            const side = this.settingsStub.planeSideSize;
            const cellField = this.cellFieldProvider.getField(zoom);
            const finitePlane = this.cellFieldProvider.getFinitePlane(zoom);

            const geometry = new HexesPlaneGeometry(side, side, side, finitePlane);
            const texture = this.texture1common;
            const material = new MeshLambertMaterial({
                map: texture,
                side: DoubleSide
            });
            const plane = new Mesh(geometry, material);

            plane.castShadow = true;
            plane.receiveShadow = true;
            plane.visible = false;

            this.levels[zoom] = new Level(cellField, finitePlane, geometry, plane, texture, [])
        }
    }

    getCurrentZoomLevel(): number {
        return this.zoom;
    }

    getCurrentDepthLevel(): number {
        return this.depth;
    }

    setCurrentZoomLevel(zoom: number) {
        const oldLevel = this.levels[this.zoom];
        const newLevel = this.levels[zoom];
        oldLevel.planeMesh.visible = false;
        oldLevel.objects.forEach(object => object.visible = false);
        newLevel.planeMesh.visible = true;
        newLevel.objects.forEach(object => object.visible = true);

        // todo: to be removed! positionHelper should not be a dependency
        newLevel.shift = this.positionHelper.shift;
        this.positionHelper.shift = newLevel.finitePlane.totalShift;
        
        this.zoom = zoom;
    }

    setCurrentDepthLevel(depth: number) {
        this.depth = depth;
    }

    getLevel(zoom: number): Level {
        return this.levels[zoom];
    }

    getCurrentLevel(): Level {
        return this.levels[this.zoom];
    }

    getAllLevels(): Level[] {
        return this.levels
    }
}

export class Level {
    cellField: CellField;
    finitePlane: FinitePlaneAbstraction;
    planeGeometry: HexesPlaneGeometry;
    planeMesh: Mesh;
    planeTexture: Texture1;
    objects: Object3D[];

    constructor(cellField: CellField, planeAbstraction: FinitePlaneAbstraction, planeGeometry: HexesPlaneGeometry, planeMesh: Mesh, planeTexture: Texture1, objects: Object3D[]) {
        this.cellField = cellField;
        this.finitePlane = planeAbstraction;
        this.planeGeometry = planeGeometry;
        this.planeMesh = planeMesh;
        this.planeTexture = planeTexture;
        this.objects = objects;
    }

    get zoom(): number {
        return this.cellField.zoom;
    }

    get shift(): Point2d {
        return this.finitePlane.shift;
    }

    set shift(value: Point2d) {
        this.finitePlane.shift = value;
        this.planeGeometry.computeVertexHeights();
        this.planeMesh.position.x = -(this.finitePlane.totalShift.x - this.finitePlane.shift.x) * this.planeGeometry.length;
        this.planeMesh.position.y = -(this.finitePlane.totalShift.y - this.finitePlane.shift.y) * this.planeGeometry.width;
        this.planeTexture.updatePlane(this.finitePlane);
        this.planeTexture.repaint();
    }
}