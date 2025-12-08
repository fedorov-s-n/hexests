import {Component} from "../di/Component";
import {LazyGeneratedArray} from "../util/LazyGeneratedArray";
import {RectangularCellField} from "../cell/RectangularCellField";
import {FinitePlaneAbstraction} from "../finiteplane/FinitePlaneAbstraction";
import {Level} from "./Level";
import {CellData} from "../cell/CellData";
import {DataManager} from "../data/DataManager";
import {CellField} from "../cell/CellField";
import {CircularBuffer} from "../util/CircularBuffer";
import {SettingsStub} from "../util/SettingsStub";

@Component
export class LevelManager {
    readonly cellFields: LazyGeneratedArray<CellField>;
    readonly finitePlainAbstractions: LazyGeneratedArray<FinitePlaneAbstraction>;
    readonly data: LazyGeneratedArray<CellData>;
    readonly levels: LazyGeneratedArray<Level>;
    readonly levelHistory: CircularBuffer<Level>;

    constructor(dataManager: DataManager, settingsStub: SettingsStub) {
        this.cellFields = new LazyGeneratedArray(
            new RectangularCellField(settingsStub.initialRowCount, settingsStub.initialColumnCount, 0) as CellField,
            cellField => cellField.lower);
        this.data = new LazyGeneratedArray(
            new CellData(dataManager, this.cellFields.initial, 0, 0),
            data => data.lower);
        this.finitePlainAbstractions = new LazyGeneratedArray(
            new FinitePlaneAbstraction(this.cellFields.initial as RectangularCellField),
            fpa => fpa.lower);
        this.levels = new LazyGeneratedArray(
            new Level(this.finitePlainAbstractions.initial, this.cellFields.initial, this.data.initial),
            level => level.lower);
        this.levelHistory = new CircularBuffer<Level>(5);
        this.levelHistory.put(this.levels.initial);
    }

    get visible(): Level {
        return this.levelHistory.get(0);
    }

    set visible(level: Level) {
        if (!this.visible.equals(level)) {
            this.levelHistory.put(level);
        }
    }
}