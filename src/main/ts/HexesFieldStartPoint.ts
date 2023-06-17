import {Component} from "./di/Component";
import {SecondScene} from "./three/SecondScene";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {SpotLight} from "three";

@Component
export class HexesFieldStartPoint {
    private readonly scene: SecondScene;

    constructor(scene: SecondScene) {
        this.scene = scene;
    }

    gogogo(window: Window) {
        this.scene.installScene(window);
        this.scene.installHelper();
        // const cube = this.scene.installCube();
        const plane = this.scene.installHexesPlane();
        new OrbitControls(this.scene.camera, this.scene.renderer.domElement);

        this.scene.camera.position.z = 5;
        plane.position.x = -5;
        plane.position.y = -5;

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