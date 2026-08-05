import {FinitePlaneGeometry} from "../finiteplane/FinitePlaneGeometry";
import {LineBasicMaterial, LineSegments, MeshLambertMaterial, Plane, TextureLoader, Vector3} from "three";
import {FinitePlaneGridGeometry} from "../finiteplane/FinitePlaneGridGeometry";
import {LatticeCellRadius} from "../lattice/LatticeCellRadius";
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
import {SelectionState} from "./SelectionState";

@Component
export class LayerManager {
    /** The cell outlines: a bright colour nothing on the surface uses. */
    private static readonly GRID_COLOUR = '#ffff00';
    /** Both are drawn after the ground and neither asks the depth buffer; the outlines go on top. */
    private static readonly MARKER_ORDER = 1;
    private static readonly GRID_ORDER = 2;

    private readonly settingsStub: SettingsStub;
    private readonly positionHelper: PositionHelper;
    private readonly levelManager: LevelManager;
    private readonly selectionState: SelectionState;
    /** Cuts the grids to what the screen shows; the ground itself is left whole. */
    readonly gridPlanes: Plane[];

    private readonly texture1common: Texture1;
    private readonly flowMapTexture: Texture1;

    private _visible: Layer;
    readonly layers: LazyGeneratedArray<Layer>;

    constructor(settingsStub: SettingsStub, positionHelper: PositionHelper, levelManager: LevelManager,
                selectionState: SelectionState) {
        this.settingsStub = settingsStub;
        this.positionHelper = positionHelper;
        this.levelManager = levelManager;
        this.selectionState = selectionState;

        const canvasElement = document.createElement('canvas');
        canvasElement.width = this.settingsStub.bigTextureSize;
        canvasElement.height = this.settingsStub.bigTextureSize;
        this.texture1common = new Texture1(canvasElement); // so far that's good
        const waterCanvasElement = document.createElement('canvas');
        waterCanvasElement.width = this.settingsStub.bigTextureSize;
        waterCanvasElement.height = this.settingsStub.bigTextureSize;
        this.flowMapTexture = new Texture1(waterCanvasElement);

        this.gridPlanes = [0, 1, 2, 3, 4, 5].map(side => {
            const angle = Math.PI * side / 3;
            return new Plane(new Vector3(-Math.cos(angle), -Math.sin(angle), 0),
                this.settingsStub.planeSideSize);
        });


        this.layers = new LazyGeneratedArray(this.installLayer(0), l => this.installLayer(l.level.zoom + 1));
        this._visible = this.layers.initial;
        this._visible.visible = true;
    }

    /** How far from the middle the grids are allowed to reach, in the units of the plane. */
    fitGrids(reach: number) {
        this.gridPlanes.forEach(plane => plane.constant = reach);
    }

    private installSelector(zoom: number): Selector {
        const finitePlaneAbstraction = this.levelManager.finitePlainAbstractions.get(zoom);
        // a disc of cells of its own, moved around the window by the pointer
        const radius = new LatticeCellRadius(finitePlaneAbstraction, this.selectionState.radiusAt(zoom));
        const data = this.levelManager.data.get(zoom);

        // the marker is the cells of the grid, filled in: it is built over the very heights the ground
        // and the outlines are built over, so there is nothing left for the two to disagree about
        const build = () => new FinitePlaneGeometry(
            new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction, data.height, radius));
        // and it asks nothing of the depth buffer, as the outlines do not, so the water it lies under
        // cannot cover it and the two surfaces never fight over which of them is in front
        const material = new MeshLambertMaterial({color: '#ff0000', depthTest: false});
        const mesh = new FinitePlaneMesh(build(), material);
        mesh.renderOrder = LayerManager.MARKER_ORDER;
        mesh.selector = true;
        mesh.visible = false;
        return new Selector(radius, mesh, build);
    }

    private installLayer(zoom: number): Layer {
        const finitePlaneAbstraction = this.levelManager.finitePlainAbstractions.get(zoom);
        // the window into the level: the same disc of cells whatever the level is, so a deeper level
        // shows the same count of smaller cells and reaches less far into the world
        const window = new LatticeCellRadius(finitePlaneAbstraction, finitePlaneAbstraction.viewRadius);

        const geometry = new FinitePlaneGeometry(new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction,
            this.levelManager.data.get(zoom).height, window));
        const texture = this.texture1common;
        const material = new MeshLambertMaterial({map: texture});
        const plane = new FinitePlaneMesh(geometry, material);

        plane.castShadow = true;
        plane.receiveShadow = true;
        plane.visible = false;

        const waterGeometry = new FinitePlaneGeometry(new FinitePlaneModel(this.settingsStub, finitePlaneAbstraction,
            this.levelManager.data.get(zoom).waterLevel, window));
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
            this.levelManager.data.get(zoom).height, window));
        // nothing on the map may hide the outlines: they ask nothing of the depth buffer and are
        // drawn after everything else, so a hill in front of them no longer swallows them
        const gridMesh = new LineSegments(gridGeometry, new LineBasicMaterial({
            color: LayerManager.GRID_COLOUR, transparent: true, depthTest: false,
            clippingPlanes: this.gridPlanes
        }));
        gridMesh.renderOrder = LayerManager.GRID_ORDER;
        gridMesh.visible = false;

        const selector = this.installSelector(zoom);

        return new Layer(
            this.levelManager.levels.get(zoom),
            geometry, plane, texture,
            waterGeometry, waterMesh, flowMap,
            gridGeometry, gridMesh,
            selector,
            [selector.mesh, gridMesh]
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