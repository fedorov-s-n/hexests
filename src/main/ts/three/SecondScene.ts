import {
    AxesHelper,
    BoxGeometry,
    Camera,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Renderer,
    Scene,
    WebGLRenderer
} from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL";
import {Object3D} from "three/src/core/Object3D";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {Component} from "../di/Component";
import {PositionHelper} from "./PositionHelper";
import {LevelController} from "./LevelController";
import {DataDescriptor} from "../data/DataDescriptor";

@Component
export class SecondScene {
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly positionHelper: PositionHelper;
    private readonly levels: LevelController;

    scene!: Scene;
    camera!: Camera;
    renderer!: Renderer;

    constructor(cellFieldProvider: CellFieldProvider, positionHelper: PositionHelper, levels: LevelController) {
        this.cellFieldProvider = cellFieldProvider;
        this.positionHelper = positionHelper;
        this.levels = levels;
    }

    installScene(container: HTMLElement) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);
        this.positionHelper.subscribe(this.renderer.domElement.parentElement!, this.camera);
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

    installHexesPlanes() {
        this.levels.installLevels(2);
        this.levels.setCurrentZoomLevel(0);
        this.levels.getLevel(0).loadTexture(this.cellFieldProvider.getDataStorage(DataDescriptor.COLOR, 0, 0));

        this.levels.getAllLevels().forEach(level => {
            this.scene.add(level.planeMesh);
            level.objects.forEach(object => this.scene.add(object));
        });
    }

    animationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            self.positionHelper.onAnimationStep();
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





