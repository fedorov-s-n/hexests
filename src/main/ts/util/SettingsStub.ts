import {Component} from "../di/Component";

@Component
export class SettingsStub {
    initialRowCount = 24;
    initialColumnCount = 24;
    bigTextureSize = 512;
    planeSideSize = 10;
    shiftMultiplier = 10;
}