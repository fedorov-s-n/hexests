import {
    AxesHelper,
    BoxGeometry,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Raycaster,
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
import {Layer} from "./Layer";
import {SettingsStub} from "../util/SettingsStub";
import {BackSide} from "three/src/constants";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

@Component
export class SecondScene {
    private readonly positionHelper: PositionHelper;
    private readonly layerManager: LayerManager;
    private readonly settingsStub: SettingsStub;

    scene!: Scene;
    camera!: PerspectiveCamera;
    raycaster!: Raycaster;
    renderer!: Renderer;
    container!: HTMLElement;

    constructor(positionHelper: PositionHelper, layerManager: LayerManager, settingsStub: SettingsStub) {
        this.positionHelper = positionHelper;
        this.layerManager = layerManager;
        this.settingsStub = settingsStub;
    }

    installDefaults(container: HTMLElement) {
        this.installScene(container);
        this.installHelper();
        this.installSky();
        this.installSpotLight(0, 0, 50);
        this.installHexesPlanes();
        this.installControls();
    }

    installScene(container: HTMLElement) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
        this.raycaster = new Raycaster();
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        // only the grids are cut, and only to the screen
        (this.renderer as WebGLRenderer).localClippingEnabled = true;
        this.container = container;
        this.onWindowResize();
        container.appendChild(this.renderer.domElement);
        const eventElement = this.renderer.domElement.parentElement!;
        this.positionHelper.subscribe(eventElement, this.camera, this.raycaster);
        eventElement.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.fitGrids();
    }

    /** Lets the grids reach the corners of the screen, and no further. */
    private fitGrids() {
        const distance = this.camera.position.length() || this.fittingDistance();
        const half = distance * Math.tan(this.camera.fov * Math.PI / 360);
        this.layerManager.fitGrids(Math.hypot(half * this.camera.aspect, half));
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
        this.layerManager.layers.array.forEach(layer => this.installLayer(layer));
    }

    /** Layers are built on demand, when a level is looked at for the first time. */
    installLayer(layer: Layer) {
        if (this.scene.children.indexOf(layer.landMesh) >= 0) return;
        this.scene.add(layer.landMesh);
        this.scene.add(layer.waterMesh);
        layer.objects.forEach(object => this.scene.add(object));
    }

    installControls() {
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        // the wheel chooses the level instead of the distance, and the window stays in the middle
        controls.enableZoom = false;
        controls.enablePan = false;

        this.camera.position.set(0, 0, this.fittingDistance());
        this.camera.lookAt(this.scene.position);
        this.fitGrids();
    }

    /** How far the camera has to stand for the window to fill the screen. */
    private fittingDistance(): number {
        const half = this.settingsStub.planeSideSize / 2;
        return half / (this.settingsStub.screenFill * Math.tan(this.camera.fov * Math.PI / 360));
    }

    animationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            if (self.positionHelper.shiftChanged) {
                self.positionHelper.flushAccumulatedShift(self.layerManager.visible);
            }
            if (self.positionHelper.selectionChanged) {
                self.positionHelper.flushAccumulatedSelection(self.layerManager.visible);
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





