import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {LayerManager} from "./three/LayerManager";
import {HeightGeneration} from "./algorithms/HeightGeneration";
import {FlowGeneration} from "./algorithms/FlowGeneration";
import {WidgetService} from "./htmlcomponents/WidgetService";
import {RunState} from "./algorithms/RunState";
import {LevelManager} from "./level/LevelManager";
import {ColorGenerator} from "./util/ColorGenerator";
import {CellData} from "./cell/CellData";
import {CellDataAccessor} from "./cell/CellDataAccessor";
import {SettingsStub} from "./util/SettingsStub";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;
    private readonly heightGeneration: HeightGeneration;
    private readonly flowGeneration: FlowGeneration;
    private readonly layerManager: LayerManager;
    private readonly widgetService: WidgetService;
    private readonly levelManager: LevelManager;
    private readonly settingsStub: SettingsStub;

    constructor(scene: SecondScene, heightGeneration: HeightGeneration, flowGeneration: FlowGeneration,
                layerManager: LayerManager, widgetService: WidgetService, levelManager: LevelManager,
                settingsStub: SettingsStub) {
        this.scene = scene;
        this.heightGeneration = heightGeneration;
        this.flowGeneration = flowGeneration;
        this.layerManager = layerManager;
        this.widgetService = widgetService;
        this.levelManager = levelManager;
        this.settingsStub = settingsStub;
    }

    gogogo(container: HTMLElement) {
        this.scene.installDefaults(container);
        this.heightGeneration.generateDefault();
        this.showLevel(this.settingsStub.initialZoom);

        // generate water levels
        const waterColorFunction = ColorGenerator.getWaterColorsIndexFunction();
        const runState = new RunState(false, 10);
        const state = this.flowGeneration.run(this.settingsStub.generationZoom);
        const updateWaterLevel = () => {
            const generated = this.levelManager.data.get(this.settingsStub.generationZoom);
            generated.waterLevel.array.forEach((_, i, a) => a[i] = state.field[i]);
            this.spread(data => data.waterLevel);
            this.layerManager.layers.array.forEach(l => l.waterGeometry.refreshPositions());
            this.paintTexture(waterColorFunction);
        };


        this.widgetService.addNumberFieldEditors(runState);
        this.widgetService.addFunctionButtons(runState);
        this.widgetService.addNumberFieldEditors(state);
        this.widgetService.addFunctionButtons(state, updateWaterLevel);
        this.widgetService.addButton('zoom in()', () => this.changeZoom(+1));
        this.widgetService.addButton('zoom out()', () => this.changeZoom(-1));
        this.widgetService.addButton('grid()', () => {
            const grid = this.layerManager.visible.gridMesh;
            grid.visible = !grid.visible;
        });

        updateWaterLevel();
        let counter = 0;
        this.scene.animationLoop(() => {
            if (runState.running) {
                state.steps(runState.stepCount);
                updateWaterLevel();
                this.layerManager.visible.selector.updateHeights();
                counter += runState.stepCount;
                if (counter === 2500) {
                    runState.running = false;
                }
            }
        });
        runState.running = true;
    }

    /**
     * Paints the colours from a level of its own, finer than the one being drawn: the texture keeps
     * the detail the cells of the visible level are too coarse to show.
     */
    private paintTexture(colourOf: (waterDepth: number) => string) {
        const data = this.levelManager.data.get(this.settingsStub.textureZoom);
        const water = data.waterLevel.array;
        const height = data.height.array;
        this.layerManager.visible.landTexture.loadFrom(
            this.levelManager.finitePlainAbstractions.get(this.settingsStub.textureZoom),
            (index) => colourOf(water[index] - height[index])
        );
    }

    /** Shows the next level up or down. */
    private changeZoom(delta: number) {
        const current = this.layerManager.visible.level.zoom;
        // the deepest level of the hierarchy can only serve the corners of the one above it
        const zoom = Math.max(0, Math.min(this.settingsStub.maxZoom - 1, current + delta));
        if (zoom !== current) this.showLevel(zoom);
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
    private spread(pick: (data: CellData) => CellDataAccessor<number>) {
        const generation = this.settingsStub.generationZoom;
        const deepest = Math.max(this.levelManager.visible.zoom + 1, this.settingsStub.textureZoom);
        for (let zoom = generation - 1; zoom >= 0; --zoom) {
            pick(this.levelManager.data.get(zoom)).gather();
        }
        for (let zoom = generation; zoom < deepest; ++zoom) {
            pick(this.levelManager.data.get(zoom)).interpolate();
        }
    }
}
