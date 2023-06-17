import {
    AmbientLight,
    BoxGeometry,
    BufferGeometry,
    Camera,
    Color,
    Light,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Renderer,
    Scene,
    SpotLight,
    Vector3,
    WebGLRenderer
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import WebGL from "three/examples/jsm/capabilities/WebGL";
import {Object3D} from "three/src/core/Object3D";

export class FirstScene {
    scene: Scene;
    camera: Camera;
    renderer: Renderer;
    // temporary!
    offsetX: number = 0;
    offsetY: number = 0;
    offsetStep: number = 1;

    constructor(window: Window) {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new WebGLRenderer({
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.document.body.appendChild(this.renderer.domElement);
    }

    installControls(): OrbitControls {
        this.renderer.domElement.ownerDocument.addEventListener("keydown", (event: HTMLElementEventMap[keyof HTMLElementEventMap]) => {
            // http://www.foreui.com/articles/Key_Code_Table.htm
            var keyCode = (event as any).which;
            if (keyCode == 87) { // w
                this.offsetY += this.offsetStep;
            } else if (keyCode == 83) { // s
                this.offsetY -= this.offsetStep;
            } else if (keyCode == 65) { // a
                this.offsetX -= this.offsetStep;
            } else if (keyCode == 68) { // d
                this.offsetX += this.offsetStep;
            }
        });

        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enablePan = false;
        return controls;
    }

    installCube(): Object3D {
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({color: 0x00ff00});
        const cube = new Mesh(geometry, material);
        this.scene.add(cube);
        return cube;
    }

    installLine(): Object3D {
        const material = new LineBasicMaterial({color: 0xffff00});
        const points = [];
        points.push(new Vector3(-10, 0, 0));
        points.push(new Vector3(0, 10, 0));
        points.push(new Vector3(10, 0, 0));

        const geometry = new BufferGeometry().setFromPoints(points);
        const line = new Line(geometry, material);
        this.scene.add(line);
        return line;
    }

    installPlane(): Object3D {
        let side = 120;
        const geometry = new PlaneGeometry(40, 40, side, side);
        let material = new MeshStandardMaterial({
            roughness: 0.8,
            color: new Color(0x00c500),
        });
        this.applyPlaneOffset(geometry);
        const plane = new Mesh(geometry, material);

        plane.castShadow = true;
        plane.receiveShadow = true;

        this.scene.add(plane);
        return plane;
    }

    installLights() {
        let ambientLight = new AmbientLight(0x0c0c0c);
        this.scene.add(ambientLight);

        let spotLight = new SpotLight(0xcccccc);
        spotLight.position.set(-30, 60, 60);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
    }

    applyPlaneOffset(geometry: PlaneGeometry) {
        const positionAttribute = geometry.getAttribute('position') as any;
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = (positionAttribute.getX(i) + 20 - this.offsetX) % 40 - 20;
            const y = (positionAttribute.getY(i) + 20 - this.offsetY) % 40 - 20;
            const z = this.getZByXY(x, y);
            positionAttribute.setZ(i, z);
        }
        positionAttribute.needsUpdate = true;
    }

    getZByXY(x: number, y: number) {
        return 20 * Math.exp(-0.1 * ((x - 15) * (x - 15) + (y - 7) * (y - 7)));
    }

    applyObjectOffset(position: Vector3) {
        const x = (20 + this.offsetX) % 40 - 20;
        const y = (20 + this.offsetY) % 40 - 20;
        const z = this.getZByXY(x, y) + 5;
        position.set(x, y, z);
    }

    applyOffsets() {
        if (!this.offsetX && !this.offsetY) return;
        this.scene.children.forEach(object3d => {
            if (object3d instanceof Mesh && object3d.geometry instanceof PlaneGeometry) {
                this.applyPlaneOffset(object3d.geometry);
            } else if (object3d instanceof Light) {
                // skip for now
            } else {
                this.applyObjectOffset(object3d.position);
            }
        });
    }

    startAnimationLoop(action: () => void) {
        const self = this;

        function animate() {
            requestAnimationFrame(animate);
            self.applyOffsets();
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





