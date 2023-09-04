import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {SpotLight} from "three";
import {DataDescriptor} from "./data/DataDescriptor";
import {GenericMetropolis} from "./algorithms/GenericMetropolis";
import {ColorGenerator} from "./three/ColorGenerator";
import {BrownianDrift} from "./algorithms/BrownianDrift";
import {CellFieldProvider} from "./fieldmodel/CellFieldProvider";
import {LevelController} from "./three/LevelController";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;
    private readonly brownianDrift: BrownianDrift;
    private readonly genericMetropolis: GenericMetropolis;
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly levels: LevelController;

    constructor(scene: SecondScene, brownianDrift: BrownianDrift, genericMetropolis: GenericMetropolis, cellFieldProvider: CellFieldProvider, levels: LevelController) {
        this.scene = scene;
        this.brownianDrift = brownianDrift;
        this.genericMetropolis = genericMetropolis;
        this.cellFieldProvider = cellFieldProvider;
        this.levels = levels;
    }

    gogogo(container: HTMLElement) {
        this.scene.installScene(container);
        this.scene.installHelper();
        // const cube = this.scene.installCube();
        this.scene.installHexesPlanes();
        new OrbitControls(this.scene.camera, this.scene.renderer.domElement);

        this.scene.camera.position.z = 5;

        let spotLight = new SpotLight(0xcccccc);
        spotLight.position.set(0, 0, -50);
        // spotLight.castShadow = true;
        this.scene.scene.add(spotLight);
        let spotLight2 = new SpotLight(0xcccccc);
        spotLight2.position.set(0, 0, +50);
        // spotLight.castShadow = true;
        this.scene.scene.add(spotLight2);

        const cellField = this.cellFieldProvider.getField(0);
        const dtc = 5;
        const cg = new ColorGenerator(dtc);

        this.genericMetropolis.init(cellField, dtc);
        this.genericMetropolis.generateDefault();

        const dtDS = this.cellFieldProvider.getDataStorage(GenericMetropolis.DOMAIN_TYPE, 0, 0);
        const colorDS = this.cellFieldProvider.getDataStorage(DataDescriptor.COLOR, 0, 0);
        for (let i = 0; i < cellField.size; ++i) {
            const dt = dtDS.getOrDefault(i, 0);
            const color = cg.toColor(dt);
            colorDS.putValue(i, color)
        }
        const finitePlane = this.cellFieldProvider.getFinitePlane(0);
        this.levels.getLevel(0).planeTexture.loadFrom(finitePlane, (index) => colorDS.getOrDefault(index, '#ffffff'));

        this.brownianDrift.init(cellField, (index: number) => dtDS.getValue(index)!!);
        this.brownianDrift.generateDefault();

        this.levels.getLevel(0).planeGeometry.computeVertexHeights();
        this.cellFieldProvider.interpolateDS(DataDescriptor.HEIGHT, 0, 2, 0);
        this.levels.getLevel(1).planeGeometry.computeVertexHeights();
        this.levels.setCurrentZoomLevel(1);

        this.scene.animationLoop(() => {
        });
    }
}