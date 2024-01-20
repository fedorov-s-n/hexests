import {CellField} from "../fieldmodel/CellField";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {HexesPlaneGeometry} from "./HexesPlaneGeometry";
import {Mesh, MeshLambertMaterial, TextureLoader} from "three";
import {Texture1} from "./Texture1";
import {Object3D} from "three/src/core/Object3D";
import {Component} from "../di/Component";
import {SettingsStub} from "./SettingsStub";
import {PositionHelper} from "./PositionHelper";
import {Point2d} from "../fieldmodel/Point2d";
import {Water} from "three/examples/jsm/objects/Water2";
import {DataDescriptor} from "../data/DataDescriptor";
import {Textures} from "../img/Textures";
import {ZWaterShader} from "./ZWaterShader";

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
    private flowMapTexture: Texture1;

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
        const waterCanvasElement = document.createElement('canvas');
        waterCanvasElement.width = this.settingsStub.bigTextureSize;
        waterCanvasElement.height = this.settingsStub.bigTextureSize;
        this.flowMapTexture = new Texture1(waterCanvasElement);
    }

    installLevels(count: number) {
        for (let zoom = 0; zoom < count; ++zoom) {
            const side = this.settingsStub.planeSideSize;
            const cellField = this.cellFieldProvider.getField(zoom);
            const finitePlane = this.cellFieldProvider.getFinitePlane(zoom);

            const geometry = new HexesPlaneGeometry(side, side, side, finitePlane, DataDescriptor.HEIGHT);
            const texture = this.texture1common;
            const material = new MeshLambertMaterial({
                map: texture
            });
            const plane = new Mesh(geometry, material);

            plane.castShadow = true;
            plane.receiveShadow = true;
            plane.visible = false;

            const waterGeometry = new HexesPlaneGeometry(side, side, side, finitePlane, DataDescriptor.WATER_LEVEL);
            const flowMap = this.flowMapTexture;

            const textureLoader = new TextureLoader();
            const waterMesh = new Water(waterGeometry, {
                textureWidth: this.settingsStub.bigTextureSize,
                textureHeight: this.settingsStub.bigTextureSize,
                flowSpeed: 0.1,
                reflectivity: 0.1,
                clipBias: 1.0,
                // scale: 1,
                flowMap: flowMap,
                normalMap0: textureLoader.load(Textures.water.normal1),
                normalMap1: textureLoader.load(Textures.water.normal2),
                shader: ZWaterShader
            });
            waterMesh.visible = false;

            this.levels[zoom] = new Level(
                cellField, finitePlane,
                geometry, plane, texture,
                waterGeometry, waterMesh, flowMap,
                []
            );
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
        oldLevel.landMesh.visible = false;
        oldLevel.waterMesh.visible = false;
        oldLevel.objects.forEach(object => object.visible = false);
        newLevel.landMesh.visible = true;
        newLevel.waterMesh.visible = true;
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
    landGeometry: HexesPlaneGeometry;
    landMesh: Mesh;
    landTexture: Texture1;
    waterGeometry: HexesPlaneGeometry;
    waterMesh: Mesh;
    waterFlowMap: Texture1;
    objects: Object3D[];

    constructor(cellField: CellField, finitePlane: FinitePlaneAbstraction, landGeometry: HexesPlaneGeometry, landMesh: Mesh, landTexture: Texture1, waterGeometry: HexesPlaneGeometry, waterMesh: Mesh, waterFlowMap: Texture1, objects: Object3D[]) {
        this.cellField = cellField;
        this.finitePlane = finitePlane;
        this.landGeometry = landGeometry;
        this.landMesh = landMesh;
        this.landTexture = landTexture;
        this.waterGeometry = waterGeometry;
        this.waterMesh = waterMesh;
        this.waterFlowMap = waterFlowMap;
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
        this.landGeometry.computeVertexHeights();
        this.landMesh.position.x = -(this.finitePlane.totalShift.x - this.finitePlane.shift.x) * this.landGeometry.length;
        this.landMesh.position.y = -(this.finitePlane.totalShift.y - this.finitePlane.shift.y) * this.landGeometry.width;
        this.landTexture.updatePlane(this.finitePlane);
        this.waterFlowMap.updatePlane(this.finitePlane);
    }
}