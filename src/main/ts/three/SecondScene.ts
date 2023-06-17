import {
    AxesHelper,
    BoxGeometry,
    Camera,
    Color,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    PerspectiveCamera,
    Renderer,
    Scene,
    WebGLRenderer
} from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL";
import {Object3D} from "three/src/core/Object3D";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {HexesPlaneGeometry} from "./HexesPlaneGeometry";
import {Component} from "../di/Component";

@Component
export class SecondScene {
    private readonly cellFieldProvider: CellFieldProvider;

    scene!: Scene;
    camera!: Camera;
    renderer!: Renderer;

    constructor(cellFieldProvider: CellFieldProvider) {
        this.cellFieldProvider = cellFieldProvider;
    }

    installScene(window: Window) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.document.body.appendChild(this.renderer.domElement);
        this.camera.position.z = 5;
    }

    installHelper(): Object3D {
        const ah = new AxesHelper(1);
        this.scene.add(ah);
        return ah;
    }

    installCube(): Object3D {
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({color: 0x00ff00});
        const cube = new Mesh(geometry, material);
        this.scene.add(cube);
        return cube;
    }

    installHexesPlane() {
        let side = 10;
        const cellField = this.cellFieldProvider.getField(0, 0);
        const geometry = new HexesPlaneGeometry(side, side, cellField);
        const material = new MeshLambertMaterial({
            color: new Color(0x00c500),
            side: DoubleSide
        });
        const plane = new Mesh(geometry, material);

        plane.castShadow = true;
        plane.receiveShadow = true;

        this.scene.add(plane);
        return plane;
    }

    animationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            action();
            self.renderer.render(self.scene, self.camera);
        }

        if (WebGL.isWebGLAvailable()) {
            // Initiate function or other initializations here
            animate();
        } else {
            const warning = WebGL.getWebGLErrorMessage();
            throw new Error(warning.textContent || undefined);
        }
    }
}





