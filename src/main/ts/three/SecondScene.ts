import {
    AxesHelper,
    BoxGeometry,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Renderer,
    Scene,
    SpotLight,
    WebGLRenderer
} from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL";
import {Object3D} from "three/src/core/Object3D";
import {Component} from "../di/Component";
import {PositionHelper} from "./PositionHelper";
import {LayerManager} from "./LayerManager";
import {BackSide} from "three/src/constants";
import {LevelManager} from "../levels2/LevelManager";

@Component
export class SecondScene {
    private readonly positionHelper: PositionHelper;
    private readonly layerManager: LayerManager;
    private readonly levelManager: LevelManager;

    scene!: Scene;
    camera!: PerspectiveCamera;
    renderer!: Renderer;
    container!: HTMLElement;

    constructor(positionHelper: PositionHelper,
                layerManager: LayerManager, levelManager: LevelManager) {
        this.positionHelper = positionHelper;
        this.layerManager = layerManager;
        this.levelManager = levelManager;
    }

    installScene(container: HTMLElement) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        this.container = container;
        this.onWindowResize();
        container.appendChild(this.renderer.domElement);
        const eventElement = this.renderer.domElement.parentElement!;
        this.positionHelper.subscribe(eventElement, this.camera);
        eventElement.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    installHelper(): Object3D {
        const ah = new AxesHelper(1);
        this.scene.add(ah);
        return ah;
    }

    installSky(): Object3D {
        const geometry = new BoxGeometry(1000, 1000, 1000);
        const material = new MeshBasicMaterial({
            color: 0x87CEEB,
            side: BackSide
        });
        const cube = new Mesh(geometry, material);
        this.scene.add(cube);
        return cube;
    }

    installSpotLight(x: number, y: number, z: number) {
        let spotLight = new SpotLight(0xcccccc);
        spotLight.position.set(x, y, z);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
    }

    installHexesPlanes() {
        this.layerManager.layers.initial.landTexture.loadFrom(this.layerManager.layers.initial.level.finitePlane, (index) => this.levelManager.levels.initial.data.color[index]);

        this.layerManager.layers.array.forEach(level => {
            this.scene.add(level.landMesh);
            this.scene.add(level.waterMesh);
            level.objects.forEach(object => this.scene.add(object));
        });
    }

    animationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            if (self.positionHelper.changed) {
                const layer = self.layerManager.visible;
                layer.setShift(self.positionHelper.shift);
                self.positionHelper.shift = layer.level.finitePlane.totalShift;
                self.positionHelper.changed = false;
            }
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





