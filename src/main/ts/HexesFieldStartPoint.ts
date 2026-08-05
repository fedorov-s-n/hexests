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
import {OverlayView} from "./overlay/OverlayView";
import {PlateOverlay} from "./overlay/PlateOverlay";
import {DepthOverlay} from "./overlay/DepthOverlay";
import {LandscapeOverlay} from "./overlay/LandscapeOverlay";
import {GridOverlay} from "./overlay/GridOverlay";
import {SelectionOverlay} from "./overlay/SelectionOverlay";
import {LineBasicMaterial} from "three";

@Component
export class HexesFieldStartPoint {
    /** Water on the map itself, plain and flat; its depth is an overlay of its own. */
    private static readonly WATER = '#7fb8e0';
    /** The coarser of the two grids has to be at least this deep before the finer one joins it. */
    private static readonly SHOW_TWO_GRIDS_FROM = 2;

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
    private readonly overlayView: OverlayView;
    /** The outlines of the cells and the marker under the pointer: overlays like all the others. */
    private readonly grid = new GridOverlay();
    private readonly selection = new SelectionOverlay();

    constructor(scene: SecondScene, heightGeneration: HeightGeneration, flowGeneration: FlowGeneration,
                layerManager: LayerManager, panel: PanelModel, levelManager: LevelManager,
                settingsStub: SettingsStub, positionHelper: PositionHelper, viewState: ViewState,
                selectionState: SelectionState, overlays: OverlayManager, overlayView: OverlayView) {
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
        this.overlayView = overlayView;
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
        const showLevelNumber = this.panel.addIndicator('level');
        this.overlays.add(new PlateOverlay(this.levelManager, this.settingsStub));
        this.overlays.add(new DepthOverlay(this.levelManager));
        this.overlays.add(new LandscapeOverlay(this.levelManager, this.settingsStub));
        this.overlays.add(this.grid);
        this.overlays.add(this.selection);
        // the outlines and the marker are shown to begin with, as they always were
        this.overlays.show(this.grid);
        this.overlays.show(this.selection);
        this.overlays.all.forEach(overlay => this.panel.addToggle(overlay.name,
            () => this.overlays.isOn(overlay), () => this.overlays.toggle(overlay)));
        this.overlays.onChange(overlay => {
            // only a tint calls for the whole texture to be laid down again; the outlines and the
            // marker are patches of their own and cost nothing but a walk over the window
            if (!overlay || overlay.colourOf) {
                this.paintTexture(waterColorFunction, this.paintZoom(runState.running));
            }
            this.updateGrids(levelState);
            // the marker is asked for again rather than hidden by hand: switched off it goes, with the
            // bubble over it, and switched on it comes back over the cell the pointer is still on
            this.selectionState.shown = this.overlays.isOn(this.selection);
            this.positionHelper.pickAgain();
        });

        this.panel.addSlider('selection', SelectionState.SMALLEST, SelectionState.LARGEST,
            () => this.selectionState.radius,
            radius => {
                this.selectionState.radius = radius;
                // every level holds it down to what that level allows, which is its own business
                this.layerManager.layers.array.forEach(layer =>
                    layer.selector.setRadius(this.selectionState.radiusAt(layer.level.zoom)));
            });
        // a step or two either way from the level the wheel has chosen; it can never ask for a level
        // that is not there, since wantedZoom runs it into the ends of the hierarchy and holds it
        this.panel.addSlider('shift', -LevelState.REACH, LevelState.REACH,
            () => levelState.levelOffset,
            offset => levelState.levelOffset = offset);
        // the wheel stops opening out where the picture still fills the screen; this lets it past that,
        // out to the levels the world is too small to fill, with the sky around them that follows
        this.panel.addToggle('open out', () => this.viewState.openWide, () => {
            this.viewState.openWide = !this.viewState.openWide;
            // and coming back holds the view down to where the picture fills the screen again
            this.viewState.zoomBy(0);
        });

        updateWaterLevel();
        showLevelNumber(this.describeLevel());
        this.updateGrids(levelState);
        let counter = 0;
        let panX = Number.NaN, panY = Number.NaN;
        this.scene.animationLoop(() => {
            const notches = this.positionHelper.takeWheelNotches();
            if (notches) this.viewState.zoomBy(notches);
            const wanted = this.wantedZoom(levelState);
            const panned = this.viewState.panX !== panX || this.viewState.panY !== panY;
            panX = this.viewState.panX;
            panY = this.viewState.panY;
            if (wanted !== this.layerManager.visible.level.zoom) {
                this.showLevel(wanted);
                showLevelNumber(this.describeLevel());
                this.updateGrids(levelState);
            } else if (notches) {
                // the approach itself moved, so the places have to be laid out anew
                this.positionHelper.flushAccumulatedShift(this.layerManager.visible);
                this.updateGrids(levelState);
            } else if (panned) {
                // the shown level's own grid has already followed the pan with its ground; the grid
                // of the level the approach is heading for has its own window and has to be told
                this.updateGrids(levelState);
            }
            this.overlayView.refresh();
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
            this.layerManager.visible.level.finitePlaneAbstraction,
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
     *
     * Only from a certain depth, though. While the coarser of the two is the topmost level or the one
     * under it, its cells are few and large enough to speak for themselves, and a finer grid laid over
     * them says nothing worth the clutter: that one is left off until the coarser grid is deep enough
     * to want it.
     */
    private updateGrids(levelState: LevelState) {
        const offset = Number.isFinite(levelState.levelOffset) ? levelState.levelOffset : 0;
        const deepest = this.settingsStub.maxZoom;
        const at = Math.max(0, Math.min(deepest, this.viewState.fractionalLevel + offset));
        const coarser = Math.floor(at);
        const both = coarser >= HexesFieldStartPoint.SHOW_TWO_GRIDS_FROM;

        for (const zoom of both ? [coarser, Math.ceil(at)] : [coarser]) {
            const layer = this.layerManager.layers.get(zoom);
            this.scene.installLayer(layer);
            layer.level.finitePlaneAbstraction.refreshShift();
            layer.gridGeometry.refreshPositions();
        }

        this.layerManager.layers.array.forEach(layer => {
            const light = both
                ? Math.max(0, 1 - Math.abs(at - layer.level.zoom))
                : (layer.level.zoom === coarser ? 1 : 0);
            const material = layer.gridMesh.material as LineBasicMaterial;
            material.opacity = light;
            layer.gridMesh.visible = this.overlays.isOn(this.grid) && light > 0.02;
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

    /**
     * The level the approach asks for, with the shift from the panel on top of it. The shift can
     * never ask for a level that is not there: it runs into the ends of the hierarchy and stays.
     */
    private wantedZoom(levelState: LevelState): number {
        const offset = Number.isFinite(levelState.levelOffset) ? levelState.levelOffset : 0;
        return Math.max(0, Math.min(this.settingsStub.maxZoom, this.viewState.level + offset));
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
     * seven cells they cover, the finer ones are interpolated. It has to reach the visible level,
     * which is drawn from its own cells and no others, and the level the texture is painted from.
     */
    private spread(pick: (data: CellData) => CellDataAccessor<number>,
                   paintZoom: number = this.settingsStub.textureZoom) {
        const generation = this.settingsStub.generationZoom;
        const deepest = Math.max(this.levelManager.visible.zoom, paintZoom);
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
    /**
     * How far either way the correction may go. Far enough to reach the top of the hierarchy: the view
     * itself no longer opens out to the levels holding fewer cells than the window, since they cannot
     * fill the screen, and this is the way to them.
     */
    static readonly REACH = 3;

    levelOffset: number = 0;
}
