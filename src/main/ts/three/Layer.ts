import {Level2} from "../levels2/Level2";
import {HexesPlaneGeometry} from "./HexesPlaneGeometry";
import {Mesh} from "three";
import {Texture1} from "./Texture1";
import {Object3D} from "three/src/core/Object3D";
import {Point2d} from "../fieldmodel/Point2d";

export class Layer {
    level: Level2;
    landGeometry: HexesPlaneGeometry;
    landMesh: Mesh;
    landTexture: Texture1;
    waterGeometry: HexesPlaneGeometry;
    waterMesh: Mesh;
    waterFlowMap: Texture1;
    objects: Object3D[];

    constructor(level: Level2, landGeometry: HexesPlaneGeometry, landMesh: Mesh, landTexture: Texture1, waterGeometry: HexesPlaneGeometry, waterMesh: Mesh, waterFlowMap: Texture1, objects: Object3D[]) {
        this.level = level;
        this.landGeometry = landGeometry;
        this.landMesh = landMesh;
        this.landTexture = landTexture;
        this.waterGeometry = waterGeometry;
        this.waterMesh = waterMesh;
        this.waterFlowMap = waterFlowMap;
        this.objects = objects;
    }

    setShift(value: Point2d) {
        this.level.finitePlane.shift = value;
        this.landGeometry.computeVertexHeights();
        this.landMesh.position.x = -(this.level.finitePlane.totalShift.x - this.level.finitePlane.shift.x) * this.landGeometry.length;
        this.landMesh.position.y = -(this.level.finitePlane.totalShift.y - this.level.finitePlane.shift.y) * this.landGeometry.width;
        this.landTexture.updatePlane(this.level.finitePlane);
        this.waterFlowMap.updatePlane(this.level.finitePlane);
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