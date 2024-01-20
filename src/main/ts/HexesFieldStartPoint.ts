import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {DataDescriptor} from "./data/DataDescriptor";
import {GenericMetropolis} from "./algorithms/GenericMetropolis";
import {ColorGenerator} from "./three/ColorGenerator";
import {CellFieldProvider} from "./fieldmodel/CellFieldProvider";
import {LevelController} from "./three/LevelController";
import {HeightGeneration} from "./algorithms/HeightGeneration";
import {AltitudeMeter} from "./algorithms/AltitudeMeter";
import {Random} from "./algorithms/Random";
import {FlowGeneration} from "./algorithms/FlowGeneration";
import {WidgetService} from "./htmlcomponents/WidgetService";
import {Math2} from "./algorithms/Math2";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;
    private readonly genericMetropolis: GenericMetropolis;
    private readonly heightGeneration: HeightGeneration;
    private readonly altitudeMeter: AltitudeMeter;
    private readonly flowGeneration: FlowGeneration;
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly levels: LevelController;
    private readonly random: Random;
    private readonly widgetService: WidgetService;

    constructor(scene: SecondScene, genericMetropolis: GenericMetropolis, heightGeneration: HeightGeneration, altitudeMeter: AltitudeMeter, flowGeneration: FlowGeneration, cellFieldProvider: CellFieldProvider, levels: LevelController, random: Random, widgetService: WidgetService) {
        this.scene = scene;
        this.genericMetropolis = genericMetropolis;
        this.heightGeneration = heightGeneration;
        this.altitudeMeter = altitudeMeter;
        this.flowGeneration = flowGeneration;
        this.cellFieldProvider = cellFieldProvider;
        this.levels = levels;
        this.random = random;
        this.widgetService = widgetService;
    }

    gogogo(container: HTMLElement) {
        this.scene.installScene(container);
        this.scene.installHelper();
        this.scene.installSky();
        this.scene.installSpotLight(0, 0, 50);

        this.scene.installHexesPlanes();
        new OrbitControls(this.scene.camera, this.scene.renderer.domElement);

        this.scene.camera.position.set(0, 0, 10);
        this.scene.camera.lookAt(this.scene.scene.position);

        // const ambientLight = new AmbientLight(0xffffff, 1);
        // ambientLight.position.set(0, 0, 50);
        // this.scene.scene.add(ambientLight);

        // generate colors
        const cg = new ColorGenerator(-1);
        const colorDS = this.cellFieldProvider.getDataStorage(DataDescriptor.COLOR, 0, 0);
        this.genericMetropolis.run({
            zoomLevel: 0,
            domainTypeCount: 8,
            output: (i, value) => colorDS.putValue(i, cg.toColor(value))
        });

        // apply textures
        const fp0 = this.levels.getLevel(0).finitePlane;
        this.levels.getLevel(0).landTexture.loadFrom(fp0, (index) => colorDS.getOrDefault(index, '#ffffff'));
        this.levels.getLevel(0).waterFlowMap.loadFrom(fp0, (index) => colorDS.getOrDefault(index, '#ffffff'));

        // generate heights
        const heightDS = this.cellFieldProvider.getDataStorage(DataDescriptor.HEIGHT, 0, 0);
        this.heightGeneration.run({
            zoomLevel: 0,
            domainTypeCount: 3,
            output: (index: number, value: number) => heightDS.putValue(index, value)
        });
        this.cellFieldProvider.interpolateDS(DataDescriptor.HEIGHT, 0, 2, 0);
        this.levels.getAllLevels().forEach(l => l.landGeometry.computeVertexHeights());

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
            input: (index: number) => heightDS.getValue(index)!!,
            buckets: heightBuckets
        });
        this.cellFieldProvider.interpolateDS(DataDescriptor.HEIGHT, 0, 5, 0);
        const heightDS5 = this.cellFieldProvider.getDataStorage(DataDescriptor.HEIGHT, 5, 0);
        this.levels.getLevel(0).landTexture.loadFrom(
            this.cellFieldProvider.getFinitePlane(5),
            (index) => {
                const value = heightDS5.getValue(index)!!;
                let bucketIndex = heightLimits.findIndex((limit) => value <= limit);
                if (bucketIndex < 0) bucketIndex = heightLimits.length;
                if (bucketIndex < heightLimits.length) {
                    bucketIndex = bucketIndex + this.random.nextInt(3) - 1;
                    bucketIndex = Math.max(0, Math.min(bucketIndex, heightLimits.length));
                }
                return heightColors[bucketIndex];
            }
        );

        const twi = this.widgetService.addIndicator('Total water');

        // generate water levels
        // const wlDS5 = this.cellFieldProvider.getDataStorage(DataDescriptor.WATER_LEVEL, 5, 0);
        const heightDS2 = this.cellFieldProvider.getDataStorage(DataDescriptor.HEIGHT, 2, 0);
        const colorDS2 = this.cellFieldProvider.getDataStorage(DataDescriptor.COLOR, 2, 0);
        this.flowGeneration.init({
            zoomLevel: 2,
            stepCount: 1,
            vapourCoefficient: 0.8,
            initialRain: 0.1,
            heightDescriptor: DataDescriptor.HEIGHT,
            output: (index: number, xSpeed: number, ySpeed: number, volume: number) => {
                let color: string;
                // if (volume <= this.flowGeneration.dryFriction) {
                //     color = '#808080';
                // } else {
                //     const mult = this.flowGeneration.colorMultiplier;
                //     const red = Math.max(0, Math.min(128 + Math.floor(xSpeed / mult), 255));
                //     const green = Math.max(0, Math.min(128 + Math.floor(ySpeed / mult), 255));
                //     const blue = Math.max(0, Math.min(Math.floor(volume / mult), 255));
                //     color = '#' + red.toString(16) + green.toString(16) + blue.toString(16);
                // }
                const blue = Math.max(0, Math.min(Math.floor(volume / this.flowGeneration.colorMultiplier), 255));
                const intensity = (255 - blue).toString(16);
                color = '#' + intensity + intensity + 'ff';

                colorDS2.putValue(index, color);

                const totalWater = Math2.sum2(this.flowGeneration.v0);
                twi(totalWater);
            }
        });
        this.levels.setCurrentZoomLevel(0);
        this.widgetService.addNumberFieldEditors(this.flowGeneration);
        this.widgetService.addButton('Clean', () => this.flowGeneration.empty());
        this.widgetService.addButton('Next step', () => this.flowGeneration.next(1));
        this.widgetService.addButton('Next 1000 steps', () => this.flowGeneration.next(1000));


        this.cellFieldProvider.fillDataStorage(DataDescriptor.WATER_LEVEL, 0, 0, i => -1);
        // this.cellFieldProvider.fillDataStorage(DataDescriptor.WATER_LEVEL, 0, 0, i => heightDS.getOrDefault(i, 0) + 0.25);
        this.cellFieldProvider.interpolateDS(DataDescriptor.WATER_LEVEL, 0, 2, 0);
        this.levels.getAllLevels().forEach(l => l.waterGeometry.computeVertexHeights());

        // choose active level
        this.levels.getCurrentLevel().waterMesh.visible = false;
        // this.levels.getCurrentLevel().waterMesh.position.z = 1;
        this.flowGeneration.empty();
        this.flowGeneration.next(1000);

        this.scene.animationLoop(() => {
            // this.flowGeneration.next();
        });
    }
}