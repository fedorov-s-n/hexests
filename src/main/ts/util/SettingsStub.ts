import {Component} from "../di/Component";

@Component
export class SettingsStub {
    initialRowCount = 30;
    initialColumnCount = 30;
    bigTextureSize = 512;
    planeSideSize = 10;
    shiftMultiplier = 10;
}