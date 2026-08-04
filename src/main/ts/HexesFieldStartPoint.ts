import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {LayerManager} from "./three/LayerManager";
import {HeightGeneration} from "./algorithms/HeightGeneration";
import {FlowGeneration} from "./algorithms/FlowGeneration";
import {PanelModel} from "./panel/PanelModel";
import {RunState} from "./algorithms/RunState";
import {LevelManager} from "./level/LevelManager";
import {ColorGenerator} from "./util/ColorGenerator";
import {CellData} from "./cell/CellData";
import {CellDataAccessor} from "./cell/CellDataAccessor";
import {SettingsStub} from "./util/SettingsStub";
import {PositionHelper} from "./three/PositionHelper";
import {ViewState} from "./three/ViewState";
import {SelectionState} from "./three/SelectionState";
import {OverlayManager} from "./overlay/OverlayManager";
import {PlateOverlay} from "./overlay/PlateOverlay";
import {DepthOverlay} from "./overlay/DepthOverlay";
import {LineBasicMaterial} from "three";

@Component
export class HexesFieldStartPoint {
    /** Water on the map itself, plain and flat; its depth is an overlay of its own. */
    private static readonly WATER = '#7fb8e0';

    private readonly scene: SecondScene;
    private readonly heightGeneration: HeightGeneration;
    private readonly flowGeneration: FlowGeneration;
    private readonly layerManager: LayerManager;
    private readonly panel: PanelModel;
    private readonly levelManager: LevelManager;
    private readonly settingsStub: SettingsStub;
    private readonly positionHelper: PositionHelper;
    private readonly viewState: ViewState;
    private readonly selectionState: SelectionState;
    private readonly overlays: OverlayManager;
    private gridShown: boolean = true;

    constructor(scene: SecondScene, heightGeneration: HeightGeneration, flowGeneration: FlowGeneration,
                layerManager: LayerManager, panel: PanelModel, levelManager: LevelManager,
                settingsStub: SettingsStub, positionHelper: PositionHelper, viewState: ViewState,
                selectionState: SelectionState, overlays: OverlayManager) {
        this.scene = scene;
        this.heightGeneration = heightGeneration;
        this.flowGeneration = flowGeneration;
        this.layerManager = layerManager;
        this.panel = panel;
        this.levelManager = levelManager;
        this.settingsStub = settingsStub;
        this.positionHelper = positionHelper;
        this.viewState = viewState;
        this.selectionState = selectionState;
        this.overlays = overlays;
    }

    gogogo(container: HTMLElement) {
        this.scene.installDefaults(container);
        this.heightGeneration.generateDefault();
        this.showLevel(this.settingsStub.initialZoom);

        // generate water levels
        const waterColorFunction = ColorGenerator.getWaterColorsIndexFunction();
        const runState = new RunState(false, 10);
        const state = this.flowGeneration.run(this.settingsStub.generationZoom);
        // while the water is running the colours are painted from the level they are computed on,
        // which is cheap; the fine texture is painted once the water settles
        const updateWaterLevel = (running: boolean = false) => {
            const paintZoom = this.paintZoom(running);
            const generated = this.levelManager.data.get(this.settingsStub.generationZoom);
            generated.waterLevel.array.forEach((_, i, a) => a[i] = state.field[i]);
            this.spread(data => data.waterLevel, paintZoom);
            // only the layer on the screen is worth refreshing; the others are laid out when shown
            this.layerManager.visible.waterGeometry.refreshPositions();
            this.paintTexture(waterColorFunction, paintZoom);
        };


        this.panel.addNumberFields(runState);
        this.panel.addFunctionButtons(runState);
        this.panel.addNumberFields(state);
        this.panel.addFunctionButtons(state, updateWaterLevel);
        const levelState = new LevelState();
        this.panel.addNumberFields(levelState);
        const showLevelNumber = this.panel.addIndicator('level');
        this.panel.addButton('zoom in()', () => this.changeZoom(+1));
        this.panel.addButton('zoom out()', () => this.changeZoom(-1));
        this.overlays.add(new PlateOverlay(this.levelManager, this.settingsStub));
        this.overlays.add(new DepthOverlay(this.levelManager));
        this.overlays.all.forEach(overlay => this.panel.addToggle(overlay.name,
            () => this.overlays.isOn(overlay), () => this.overlays.toggle(overlay)));
        this.overlays.onChange(() => this.paintTexture(waterColorFunction, this.paintZoom(runState.running)));

        this.panel.addSlider('selection', SelectionState.SMALLEST, SelectionState.LARGEST,
            () => this.selectionState.radius,
            radius => {
                this.selectionState.radius = radius;
                this.layerManager.layers.array.forEach(layer => layer.selector.setRadius(radius));
            });
        this.panel.addButton('grid()', () => {
            this.gridShown = !this.gridShown;
            this.updateGrids(levelState);
        });

        updateWaterLevel();
        showLevelNumber(this.describeLevel());
        this.updateGrids(levelState);
        let counter = 0;
        this.scene.animationLoop(() => {
            const notches = this.positionHelper.takeWheelNotches();
            if (notches) this.viewState.zoomBy(notches);
            const wanted = this.wantedZoom(levelState);
            if (wanted !== this.layerManager.visible.level.zoom) {
                this.showLevel(wanted);
                showLevelNumber(this.describeLevel());
                this.updateGrids(levelState);
            } else if (notches) {
                // the approach itself moved, so the places have to be laid out anew
                this.positionHelper.flushAccumulatedShift(this.layerManager.visible);
                this.updateGrids(levelState);
            }
            if (runState.running) {
                state.steps(runState.stepCount);
                updateWaterLevel(true);
                counter += runState.stepCount;
                if (counter >= 2500) {
                    runState.running = false;
                    updateWaterLevel(false);
                }
            }
        });
        runState.running = true;
    }

    /**
     * Paints the colours from a level of its own, finer than the one being drawn: the texture keeps
     * the detail the cells of the visible level are too coarse to show.
     */
    private paintTexture(colourOf: (waterDepth: number) => string, zoom: number) {
        const data = this.levelManager.data.get(zoom);
        const water = data.waterLevel.array;
        const height = data.height.array;
        this.layerManager.visible.landTexture.loadFrom(
            this.levelManager.finitePlainAbstractions.get(zoom),
            (index) => {
                const depth = water[index] - height[index];
                // the map itself only says land or water; how deep it is, is for an overlay to tell
                const beneath = depth > DepthOverlay.PUDDLE ? HexesFieldStartPoint.WATER : colourOf(0);
                return this.overlays.colourOf(index, zoom, beneath);
            }
        );
    }

    /**
     * Two grids at a time: the one of the level being shown and the one of the level the approach is
     * heading for, one dimming as the other lights up, so a switch is not a jump.
     */
    private updateGrids(levelState: LevelState) {
        const offset = Number.isFinite(levelState.levelOffset) ? levelState.levelOffset : 0;
        const deepest = this.settingsStub.maxZoom - 1;
        const at = Math.max(0, Math.min(deepest, this.viewState.fractionalLevel + offset));

        for (const zoom of [Math.floor(at), Math.ceil(at)]) {
            const layer = this.layerManager.layers.get(zoom);
            this.scene.installLayer(layer);
            layer.level.finitePlaneAbstraction.refreshShift();
            layer.gridGeometry.refreshPositions();
        }

        this.layerManager.layers.array.forEach(layer => {
            const light = Math.max(0, 1 - Math.abs(at - layer.level.zoom));
            const material = layer.gridMesh.material as LineBasicMaterial;
            material.opacity = light;
            layer.gridMesh.visible = this.gridShown && light > 0.02;
        });
    }

    /** While the water runs the colours come from the level it runs on; then from a finer one. */
    private paintZoom(running: boolean): number {
        return running ? this.settingsStub.generationZoom : this.settingsStub.textureZoom;
    }

    private describeLevel(): string {
        const level = this.layerManager.visible.level;
        return `${level.zoom} (${level.cellField.size} cells)`;
    }

    /** The level the approach asks for, with the correction from the panel on top of it. */
    private wantedZoom(levelState: LevelState): number {
        const offset = Number.isFinite(levelState.levelOffset) ? levelState.levelOffset : 0;
        // the deepest level of the hierarchy can only serve the corners of the one above it
        return Math.max(0, Math.min(this.settingsStub.maxZoom - 1, this.viewState.level + offset));
    }

    /** Steps the approach a whole level in or out. */
    private changeZoom(delta: number) {
        const current = this.layerManager.visible.level.zoom;
        const zoom = Math.max(0, Math.min(this.settingsStub.maxZoom - 1, current + delta));
        if (zoom !== current) this.viewState.worldSpan = this.viewState.spanAt(zoom);
    }

    private showLevel(zoom: number) {
        this.levelManager.visible = this.levelManager.levels.get(zoom);
        this.spread(data => data.height);
        this.spread(data => data.waterLevel);
        this.scene.installLayer(this.layerManager.layers.get(zoom));
        this.layerManager.notify();
    }

    /**
     * Carries the generated data to every level in use: the coarser ones gather the mean of the
     * seven cells they cover, the finer ones are interpolated. It has to reach one level below the
     * visible one, whose corners it feeds, and the level the texture is painted from.
     */
    private spread(pick: (data: CellData) => CellDataAccessor<number>,
                   paintZoom: number = this.settingsStub.textureZoom) {
        const generation = this.settingsStub.generationZoom;
        const deepest = Math.max(this.levelManager.visible.zoom + 1, paintZoom);
        for (let zoom = generation - 1; zoom >= 0; --zoom) {
            pick(this.levelManager.data.get(zoom)).gather();
        }
        for (let zoom = generation; zoom < deepest; ++zoom) {
            pick(this.levelManager.data.get(zoom)).interpolate();
        }
    }
}

/** The correction the panel keeps on top of the level the wheel has chosen. */
class LevelState {
    levelOffset: number = 0;
}
