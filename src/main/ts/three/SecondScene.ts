import {
    BoxGeometry,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Raycaster,
    Renderer,
    Scene,
    SpotLight,
    Vector3,
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
import {SQRT3} from "../lattice/HexLattice";

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

    private controls?: OrbitControls;

    /** Worked out afresh on every frame; kept here so that no frame allocates one. */
    private readonly corner = new Vector3();
    private readonly ray = new Vector3();
    private readonly offset = new Vector3();
    private readonly aim = new Vector3();

    constructor(positionHelper: PositionHelper, layerManager: LayerManager, settingsStub: SettingsStub) {
        this.positionHelper = positionHelper;
        this.layerManager = layerManager;
        this.settingsStub = settingsStub;
    }

    installDefaults(container: HTMLElement) {
        this.installScene(container);
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
        // the window is the only thing that says it has been resized: an element never does, which is
        // why the picture used to be left stretched by the browser instead of drawn afresh
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        // a wider screen reaches further into the window from the same distance, so the camera is put
        // back where the whole of the screen fits inside it again
        this.refit();
    }

    /**
     * Puts the camera where it belongs, every frame: it may be turned at any moment, and both how far
     * it stands and what it looks at follow the way it is pointed.
     */
    refit() {
        if (!this.controls) return;
        const target = this.controls.target;
        this.offset.copy(this.camera.position).sub(target);
        const distance = this.fittingDistance();
        if (Math.abs(this.offset.length() - distance) > 1e-9) this.offset.setLength(distance);

        const along = this.aimingOffset();
        const setBack = Math.hypot(this.offset.x, this.offset.y);
        // back along the way the camera is pointed, which is nowhere at all when it points straight down
        if (setBack > 1e-6) {
            this.aim.set(-this.offset.x / setBack * along, -this.offset.y / setBack * along, 0);
        } else {
            this.aim.set(0, 0, 0);
        }
        target.copy(this.aim);
        this.camera.position.copy(this.aim).add(this.offset);
        this.camera.lookAt(target);
        this.fitGrids();
    }

    /** Lets the grids reach as far over the ground as the picture does, and no further. */
    private fitGrids() {
        this.layerManager.fitGrids(this.groundReach());
    }

    /**
     * How far over the ground the picture reaches: the corners of it, thrown down onto the ground.
     *
     * Tilted far enough, a corner looks over the ground altogether and lands nowhere; then there is no
     * cutting the grids to the picture at all, and the whole plane is given to them.
     */
    private groundReach(): number {
        let reach = 0;
        for (const x of [-1, 1]) {
            for (const y of [-1, 1]) {
                this.corner.set(x, y, 0.5).unproject(this.camera);
                this.ray.copy(this.corner).sub(this.camera.position);
                if (this.ray.z > -1e-9) return this.settingsStub.planeSideSize;
                const steps = -this.camera.position.z / this.ray.z;
                reach = Math.max(reach,
                    Math.hypot(this.camera.position.x + steps * this.ray.x,
                        this.camera.position.y + steps * this.ray.y));
            }
        }
        return Math.min(reach, this.settingsStub.planeSideSize);
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
        // the wheel chooses the level instead of the distance, and the camera is aimed by refit alone
        controls.enableZoom = false;
        controls.enablePan = false;
        this.controls = controls;

        this.camera.position.set(0, 0, this.fittingDistance());
        this.camera.lookAt(this.scene.position);
        this.refit();
    }

    /**
     * How much of the plane the picture holds from straight above: the window has to hold all of it.
     *
     * The window is a hexagon of `viewRadius` cells and the plane holds `2 * viewRadius + 1` of them
     * across, so the hexagon reaches that share of the plane -- and only its flat sides are that
     * close, which is what the picture has to fit inside whichever way the level's lattice is turned.
     * The corner of the picture is the far point of it, so it is the diagonal that is measured, and
     * `screenFill` is what is left of the window beyond it.
     */
    private pictureHalfHeight(): number {
        const radius = this.settingsStub.viewRadius;
        const reach = this.settingsStub.planeSideSize * radius * SQRT3 / 2 / (2 * radius + 1);
        return reach * this.settingsStub.screenFill / Math.hypot(this.camera.aspect, 1);
    }

    /** How far the camera has to stand for the window to hold the whole picture. */
    private fittingDistance(): number {
        return this.pictureHalfHeight() / Math.tan(this.camera.fov * Math.PI / 360);
    }

    /**
     * Where the camera has to look for the cells to lie in front of it and never behind.
     *
     * Turned off the vertical, a camera leaves the ground nearest it out of the bottom of the picture:
     * the world goes on there, behind the camera as it were, and none of it is seen. So the point the
     * camera looks at slides back along the way it is pointed, by however much the tilt costs, until
     * the near edge of the picture lies over the same ground it lay over from straight above. Looking
     * straight down there is no near side and no far side, nothing can be behind, and it looks at the
     * middle of the window as it always did; the further it is tilted, the further back it looks.
     */
    private aimingOffset(): number {
        const half = this.camera.fov * Math.PI / 360;
        const height = Math.abs(this.offset.z);
        const setBack = Math.hypot(this.offset.x, this.offset.y);
        // the ground the bottom of the picture reaches, counted forward from the camera's own place;
        // from straight above it falls a picture's half behind it, which is what makes this nothing there
        const nearEdge = height * Math.tan(Math.atan2(setBack, height) - half);
        return setBack - nearEdge - this.pictureHalfHeight();
    }

    animationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            // the camera may have been turned since the last frame, and where it stands follows that
            self.refit();
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





