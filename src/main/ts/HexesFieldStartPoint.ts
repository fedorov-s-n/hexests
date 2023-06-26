import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {SpotLight} from "three";
import {CellDataTable} from "./fieldmodel/CellDataTable";
import {CellDataDescriptor} from "./fieldmodel/CellDataDescriptor";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;
    private readonly cellDataTable: CellDataTable;

    constructor(scene: SecondScene, cellDataTable: CellDataTable) {
        this.scene = scene;
        this.cellDataTable = cellDataTable;
    }

    gogogo(window: Window) {
        this.scene.installScene(window);
        this.scene.installHelper();
        // const cube = this.scene.installCube();
        const plane = this.scene.installHexesPlane();
        new OrbitControls(this.scene.camera, this.scene.renderer.domElement);

        this.scene.camera.position.z = 5;

        const cellField = this.scene.cellField;
        this.cellDataTable.set(24, cellField, CellDataDescriptor.HEIGHT, 0.05);
        this.cellDataTable.set(26, cellField, CellDataDescriptor.HEIGHT, 0.04);
        this.cellDataTable.set(351, cellField, CellDataDescriptor.HEIGHT, 0.06);

        // let ambientLight = new AmbientLight(0x0c0c0c);
        // this.scene.scene.add(ambientLight);
        let spotLight = new SpotLight(0xcccccc);
        spotLight.position.set(0, 0, -50);
        // spotLight.castShadow = true;
        this.scene.scene.add(spotLight);
        let spotLight2 = new SpotLight(0xcccccc);
        spotLight2.position.set(0, 0, +50);
        // spotLight.castShadow = true;
        this.scene.scene.add(spotLight2);

        this.scene.animationLoop(() => {

        });
    }
}