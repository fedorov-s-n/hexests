import {Level} from "../level/Level";
import {FinitePlaneGeometry} from "../finiteplane/FinitePlaneGeometry";
import {Mesh} from "three";
import {Texture1} from "./Texture1";
import {Object3D} from "three/src/core/Object3D";

export class Layer {
    level: Level;
    landGeometry: FinitePlaneGeometry;
    landMesh: Mesh;
    landTexture: Texture1;
    waterGeometry: FinitePlaneGeometry;
    waterMesh: Mesh;
    waterFlowMap: Texture1;
    objects: Object3D[];

    constructor(level: Level, landGeometry: FinitePlaneGeometry, landMesh: Mesh, landTexture: Texture1, waterGeometry: FinitePlaneGeometry, waterMesh: Mesh, waterFlowMap: Texture1, objects: Object3D[]) {
        this.level = level;
        this.landGeometry = landGeometry;
        this.landMesh = landMesh;
        this.landTexture = landTexture;
        this.waterGeometry = waterGeometry;
        this.waterMesh = waterMesh;
        this.waterFlowMap = waterFlowMap;
        this.objects = objects;
    }

    get visible(): boolean {
        return this.landMesh.visible;
    }

    set visible(visible: boolean) {
        this.landMesh.visible = visible;
        this.waterMesh.visible = visible;
        this.objects.forEach(object => object.visible = visible);
    }
}