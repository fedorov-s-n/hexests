import {
    AxesHelper,
    BoxGeometry,
    Camera,
    DoubleSide,
    Mesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    PerspectiveCamera,
    Renderer,
    RepeatWrapping,
    Scene,
    UVMapping,
    WebGLRenderer
} from "three";
import WebGL from "three/examples/jsm/capabilities/WebGL";
import {Object3D} from "three/src/core/Object3D";
import {CellFieldProvider} from "../fieldmodel/CellFieldProvider";
import {HexesPlaneGeometry} from "./HexesPlaneGeometry";
import {Component} from "../di/Component";
import {PositionHelper} from "./PositionHelper";
import {CellField} from "../fieldmodel/CellField";
import {Texture1} from "./Texture1";

@Component
export class SecondScene {
    private readonly cellFieldProvider: CellFieldProvider;
    private readonly positionHelper: PositionHelper;

    scene!: Scene;
    camera!: Camera;
    renderer!: Renderer;
    cellField!: CellField;
    planeGeometry!: HexesPlaneGeometry;
    planeMesh!: Mesh;
    planeTexture!: Texture1;

    constructor(cellFieldProvider: CellFieldProvider, positionHelper: PositionHelper) {
        this.cellFieldProvider = cellFieldProvider;
        this.positionHelper = positionHelper;
    }

    installScene(window: Window) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.document.body.appendChild(this.renderer.domElement);
        this.positionHelper.subscribe(this.renderer.domElement.ownerDocument, this.camera);
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
        const geometry = new HexesPlaneGeometry(side, side, side, cellField);


        const canvasElement = this.renderer.domElement.ownerDocument.createElement('canvas');
        const texture = new Texture1(canvasElement, 32, 32);

        texture.paintExample(5);
        texture.remember()

        texture.mapping = UVMapping;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;

        // texture.repeat.set(4, 4);
        texture.needsUpdate = true;

        const material = new MeshLambertMaterial({
            // color: new Color(0x00c500),
            map: texture,
            side: DoubleSide
        });
        const plane = new Mesh(geometry, material);

        plane.castShadow = true;
        plane.receiveShadow = true;

        this.scene.add(plane);
        this.cellField = cellField;
        this.planeGeometry = geometry;
        this.planeMesh = plane;
        this.planeTexture = texture;
        return plane;
    }

    animationStep() {
        if (this.positionHelper.changed) {
            const dx = this.positionHelper.offset.x / this.planeGeometry.length;
            const dy = this.positionHelper.offset.y / this.planeGeometry.width;
            const shift = this.cellField.getShift(dx, dy);

            this.planeGeometry.computeVertexHeights(this.cellField, shift);
            this.planeGeometry.computeVertexNormals();

            this.planeMesh.position.x = -shift.getRemainedX() * this.planeGeometry.length;
            this.planeMesh.position.y = -shift.getRemainedY() * this.planeGeometry.width;

            this.planeTexture.repeat.set(1 / shift.getWorkingAreaX(), 1 / shift.getWorkingAreaY());
            this.planeTexture.translate(
                this.planeTexture.width * shift.getActualX(),
                this.planeTexture.height * shift.getActualY()
            );

            this.positionHelper.changed = false;
        }
    }

    animationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            self.animationStep();
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





