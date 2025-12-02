import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {GenericMetropolis} from "./algorithms/GenericMetropolis";
import {ColorGenerator} from "./three/ColorGenerator";
import {CellDataHelper} from "./levels2/CellDataHelper";
import {LayerManager} from "./three/LayerManager";
import {HeightGeneration} from "./algorithms/HeightGeneration";
import {AltitudeMeter} from "./algorithms/AltitudeMeter";
import {Random} from "./algorithms/Random";
import {FlowGeneration} from "./algorithms/FlowGeneration";
import {WidgetService} from "./htmlcomponents/WidgetService";
import {RunState} from "./algorithms/RunState";
import {LevelManager} from "./levels2/LevelManager";
import {CellData} from "./levels2/CellData";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;
    private readonly genericMetropolis: GenericMetropolis;
    private readonly heightGeneration: HeightGeneration;
    private readonly altitudeMeter: AltitudeMeter;
    private readonly flowGeneration: FlowGeneration;
    private readonly cellDataHelper: CellDataHelper;
    private readonly layerManager: LayerManager;
    private readonly random: Random;
    private readonly widgetService: WidgetService;
    private readonly levelManager: LevelManager;

    constructor(scene: SecondScene, genericMetropolis: GenericMetropolis, heightGeneration: HeightGeneration,
                altitudeMeter: AltitudeMeter, flowGeneration: FlowGeneration,
                cellDataHelper: CellDataHelper, layerManager: LayerManager, random: Random,
                widgetService: WidgetService, levelManager: LevelManager) {
        this.scene = scene;
        this.genericMetropolis = genericMetropolis;
        this.heightGeneration = heightGeneration;
        this.altitudeMeter = altitudeMeter;
        this.flowGeneration = flowGeneration;
        this.cellDataHelper = cellDataHelper;
        this.layerManager = layerManager;
        this.random = random;
        this.widgetService = widgetService;
        this.levelManager = levelManager;
    }

    gogogo(container: HTMLElement) {
        this.scene.installScene(container);
        this.scene.installHelper();
        this.scene.installSky();
        this.scene.installSpotLight(0, 0, 50);

        // const ambientLight = new AmbientLight(0xffffff, 1);
        // ambientLight.position.set(0, 0, 50);
        // this.scene.scene.add(ambientLight);

        // generate colors
        const cg = new ColorGenerator(-1);
        const colors = this.levelManager.levels.initial.data.color;
        this.genericMetropolis.run({
            zoomLevel: 0,
            domainTypeCount: 8,
            output: (i, value) => colors[i] = cg.toColor(value)
        });

        // generate heights
        const heights = this.levelManager.levels.initial.data.height.fill(0);
        this.heightGeneration.run({
            zoomLevel: 0,
            domainTypeCount: 3,
            output: (index: number, value: number) => heights[index] = value
        });
        this.cellDataHelper.interpolateDS(CellData.HEIGHT, 0, 2, 0);
        this.layerManager.layers.array.forEach(l => l.landGeometry.computeVertexHeights());

        this.scene.installHexesPlanes();
        new OrbitControls(this.scene.camera, this.scene.renderer.domElement);

        this.scene.camera.position.set(0, 0, 10);
        this.scene.camera.lookAt(this.scene.scene.position);

        // apply textures
        const fp0 = this.layerManager.layers.initial.level.finitePlane;
        this.layerManager.layers.initial.landTexture.loadFrom(fp0, (index) => colors[index]);
        this.layerManager.layers.initial.waterFlowMap.loadFrom(fp0, (index) => colors[index]);

        // simplest terrain
        const heightBuckets = [
            0.15, 0.2, 0.25, 0.3,
            0.35, 0.4, 0.5, 0.65,
            0.75, 0.9, 0.95
        ];
        const heightColors = [
            '#91C0D4', '#B6E3E4', '#D4F1EF', '#EBE7CD',
            '#E7D4BF', '#B3E078', '#6dd76d', '#a89b35',
            '#e5ca5d', '#f1e4a7', '#b4b4b4', '#ffffff'
        ];
        const heightLimits = this.altitudeMeter.run({
            zoomLevel: 0,
            input: (index: number) => heights[index],
            buckets: heightBuckets
        });
        //this.cellDataHelper.interpolateDS(CellData.HEIGHT, 0, 5, 0);
        //const heightDS5 = this.levelManager.levels.get(5).data.height;
        // this.levels.getLevel(0).landTexture.loadFrom(
        //     this.cellFieldProvider.getFinitePlane(5),
        //     (index) => {
        //         const value = heightDS5[index];
        //         let bucketIndex = heightLimits.findIndex((limit) => value <= limit);
        //         if (bucketIndex < 0) bucketIndex = heightLimits.length;
        //         if (bucketIndex < heightLimits.length) {
        //             bucketIndex = bucketIndex + this.random.nextInt(3) - 1;
        //             bucketIndex = Math.max(0, Math.min(bucketIndex, heightLimits.length));
        //         }
        //         return heightColors[bucketIndex];
        //     }
        // );
        this.layerManager.layers.initial.landTexture.loadFrom(
            this.levelManager.finitePlainAbstractions.get(0),
            (index) => {
                return '#b4b4b4';
            }
        );

        // generate water levels

        const wheightBuckets = [
            0.001, 0.002, 0.005, 0.01,
            0.02, 0.05, 0.1, 0.2,
            0.5, 0.8, 1.0
        ];
        const wheightColors = [
            '#f1e4a7', '#d9f1f8', '#b0e9ff', '#6fdaff',
            '#34b2fb', '#0e87d5', '#4113b6', '#7d13ba',
            '#dc06d7', '#e10f81', '#f30b0b', '#f4520d'
        ];

        const runState = new RunState(false, 10);
        const state = this.flowGeneration.run(0);
        const updateWaterLevel = () => {
            this.cellDataHelper.fillDataStorage(CellData.WATER_LEVEL, 0, 0, i => state.field[i]);
            this.cellDataHelper.interpolateDS(CellData.WATER_LEVEL, 0, 1, 0);
            this.layerManager.layers.array.forEach(l => l.waterGeometry.computeVertexHeights());
            this.layerManager.layers.initial.landTexture.loadFrom(
                this.levelManager.finitePlainAbstractions.get(0),
                (index) => {
                    const value = state.field[index] - state.height[index];
                    let bucketIndex = wheightBuckets.findIndex((limit) => value <= limit);
                    if (bucketIndex < 0) bucketIndex = wheightBuckets.length;
                    return wheightColors[bucketIndex];
                }
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
            }
        });
    }
}