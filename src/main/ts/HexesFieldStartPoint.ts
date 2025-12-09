import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {LayerManager} from "./three/LayerManager";
import {HeightGeneration} from "./algorithms/HeightGeneration";
import {FlowGeneration} from "./algorithms/FlowGeneration";
import {WidgetService} from "./htmlcomponents/WidgetService";
import {RunState} from "./algorithms/RunState";
import {LevelManager} from "./level/LevelManager";
import {ColorGenerator} from "./util/ColorGenerator";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;
    private readonly heightGeneration: HeightGeneration;
    private readonly flowGeneration: FlowGeneration;
    private readonly layerManager: LayerManager;
    private readonly widgetService: WidgetService;
    private readonly levelManager: LevelManager;

    constructor(scene: SecondScene, heightGeneration: HeightGeneration, flowGeneration: FlowGeneration,
                layerManager: LayerManager, widgetService: WidgetService, levelManager: LevelManager) {
        this.scene = scene;
        this.heightGeneration = heightGeneration;
        this.flowGeneration = flowGeneration;
        this.layerManager = layerManager;
        this.widgetService = widgetService;
        this.levelManager = levelManager;
    }

    gogogo(container: HTMLElement) {
        this.scene.installDefaults(container);
        this.heightGeneration.generateDefault();
        this.layerManager.layers.array.forEach(l => l.landGeometry.refreshPositions());

        this.layerManager.layers.initial.selector.updateHeights();
        
        // generate water levels
        const waterColorFunction = ColorGenerator.getWaterColorsIndexFunction();
        const runState = new RunState(false, 10);
        const state = this.flowGeneration.run(0);
        const updateWaterLevel = () => {
            this.levelManager.data.initial.waterLevel.array.forEach((_, i, a) => a[i] = state.field[i]);
            this.levelManager.data.initial.waterLevel.interpolate();
            this.layerManager.layers.array.forEach(l => l.waterGeometry.refreshPositions());
            this.layerManager.layers.initial.landTexture.loadFrom(
                this.levelManager.finitePlainAbstractions.get(0),
                (index) => waterColorFunction(state.field[index] - state.height[index])
            );
        };


        this.widgetService.addNumberFieldEditors(runState);
        this.widgetService.addFunctionButtons(runState);
        this.widgetService.addNumberFieldEditors(state);
        this.widgetService.addFunctionButtons(state, updateWaterLevel);

        updateWaterLevel();

        this.scene.animationLoop(() => {
            if (runState.running) {
                state.steps(runState.stepCount);
                updateWaterLevel();
                this.layerManager.layers.initial.selector.updateHeights();
            }
        });
    }
}