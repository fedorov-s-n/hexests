import {FinitePlaneGeometry} from "../finiteplane/FinitePlaneGeometry";
import {LineBasicMaterial, LineSegments, MeshLambertMaterial, TextureLoader} from "three";
import {FinitePlaneGridGeometry} from "../finiteplane/FinitePlaneGridGeometry";
import {Texture1} from "./Texture1";
import {Component} from "../di/Component";
import {SettingsStub} from "../util/SettingsStub";
import {PositionHelper} from "./PositionHelper";
import {LevelManager} from "../level/LevelManager";
import {LazyGeneratedArray} from "../util/LazyGeneratedArray";
import {Layer} from "./Layer";
import {FinitePlaneModel} from "../finiteplane/FinitePlaneModel";
import {FinitePlaneMesh} from "../finiteplane/FinitePlaneMesh";
import {CellRadius} from "../cell/CellRadius";
import {Selector} from "./Selector";
import {CellData} from "../cell/CellData";

@Component
export class LayerManager {
    /** The cell outlines: a bright colour nothing on the surface uses, lifted clear of it. */
    private static readonly GRID_COLOUR = '#ffff00';
    private static readonly GRID_LIFT = 0.02;

    private readonly settingsStub: SettingsStub;
    private readonly positionHelper: PositionHelper;
    private readonly levelManager: LevelManager;

    private readonly texture1common: Texture1;
    private readonly flowMapTexture: Texture1;

    private _visible: Layer;
    readonly layers: LazyGeneratedArray<Layer>;

    constructor(settingsStub: SettingsStub, positionHelper: PositionHelper, levelManager: LevelManager) {
        this.settingsStub = settingsStub;
        this.positionHelper = positionHelper;
        this.levelManager = levelManager;

        const canvasElement = document.createElement('canvas');
        canvasElement.width = this.settingsStub.bigTextureSize;
        canvasElement.height = this.settingsStub.bigTextureSize;
        this.texture1common = new Texture1(canvasElement); // so far that's good
        const waterCanvasElement = document.createElement('canvas');
        waterCanvasElement.width = this.settingsStub.bigTextureSize;
        waterCanvasElement.height = this.settingsStub.bigTextureSize;
        this.flowMapTexture = new Texture1(waterCanvasElement);

        this.layers = new LazyGeneratedArray(this.installLayer(0), l => this.installLayer(l.level.zoom + 1));
        this._visible = this.layers.initial;
        this._visible.visible = true;
    }

    private installSelector(zoom: number): { radius: CellRadius, mesh: FinitePlaneMesh, data: CellData } {
        const finitePlaneAbstraction = this.levelManager.finitePlainAbstractions.get(zoom);
        const cellField = this.levelManager.cellFields.get(zoom);
        const radius = cellField.radius();
        const data = this.levelManager.data.get(zoom);

        const geometry = new FinitePlaneGeometry(new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction,
            data.accessor<number>(Selector.ACCESSOR_KEY), radius, radius));
        const material = new MeshLambertMaterial({color: '#ff0000'});
        const mesh = new FinitePlaneMesh(geometry, material);
        mesh.selector = true;
        return {mesh, radius, data};
    }

    private installLayer(zoom: number): Layer {
        const finitePlaneAbstraction = this.levelManager.finitePlainAbstractions.get(zoom);

        const geometry = new FinitePlaneGeometry(new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction,
            this.levelManager.data.get(zoom).height, this.levelManager.cellFields.get(zoom)));
        const texture = this.texture1common;
        const material = new MeshLambertMaterial({
            map: texture
        });
        const plane = new FinitePlaneMesh(geometry, material);

        plane.castShadow = true;
        plane.receiveShadow = true;
        plane.visible = false;

        const waterGeometry = new FinitePlaneGeometry(new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction,
            this.levelManager.data.get(zoom).waterLevel, this.levelManager.cellFields.get(zoom)));
        const flowMap = this.flowMapTexture;

        const textureLoader = new TextureLoader();

        const waterMesh = new FinitePlaneMesh(waterGeometry, material);
        // const waterMesh = new Water(waterGeometry, {
        //     color: new Color(0, 0, 1),
        //     textureWidth: this.settingsStub.bigTextureSize,
        //     textureHeight: this.settingsStub.bigTextureSize,
        //     flowSpeed: 0,
        //     reflectivity: 0.1,
        //     clipBias: 1.0,
        //     // scale: 1,
        //     flowMap: flowMap,
        //     normalMap0: textureLoader.load(Textures.water.normal1),
        //     normalMap1: textureLoader.load(Textures.water.normal2),
        //     shader: ZWaterShader
        // });
        waterMesh.visible = false;

        const gridGeometry = new FinitePlaneGridGeometry(new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction,
            this.levelManager.data.get(zoom).height, this.levelManager.cellFields.get(zoom)), LayerManager.GRID_LIFT);
        const gridMesh = new LineSegments(gridGeometry, new LineBasicMaterial({color: LayerManager.GRID_COLOUR}));
        gridMesh.visible = false;

        const selectorData = this.installSelector(zoom);
        const selector = new Selector(selectorData.radius, selectorData.mesh, selectorData.data);
        selector.updateHeights();

        return new Layer(
            this.levelManager.levels.get(zoom),
            geometry, plane, texture,
            waterGeometry, waterMesh, flowMap,
            gridGeometry, gridMesh,
            selector,
            [selectorData.mesh, gridMesh]
        );
    }

    get visible() {
        return this._visible;
    }

    set visible(visible: Layer) {
        for (let zoom = 0; zoom < this.layers.array.length; ++zoom) {
            this.layers.get(zoom).visible = zoom === visible.level.zoom;
        }
        this._visible = visible;

        this.positionHelper.flushAccumulatedShift(visible);
    }

    notify() {
        this.visible = this.layers.get(this.levelManager.visible.zoom);
        this.visible.selector.mesh.visible = false;
    }
}