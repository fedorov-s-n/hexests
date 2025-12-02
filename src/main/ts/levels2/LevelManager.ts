import {Component} from "../di/Component";
import {LazyGeneratedArray} from "./LazyGeneratedArray";
import {RectangularCellField} from "../fieldmodel/RectangularCellField";
import {FinitePlaneAbstraction} from "../fieldmodel/FinitePlaneAbstraction";
import {Level2} from "./Level2";
import {CellData} from "./CellData";
import {DataManager} from "../data2/DataManager";
import {CellField} from "../fieldmodel/CellField";
import {CircularQueue} from "./CircularQueue";

@Component
export class LevelManager {
    readonly cellFields: LazyGeneratedArray<CellField>;
    readonly finitePlainAbstractions: LazyGeneratedArray<FinitePlaneAbstraction>;
    readonly data: LazyGeneratedArray<CellData>;
    readonly levels: LazyGeneratedArray<Level2>;
    readonly levelHistory: CircularQueue<Level2>;

    constructor(dataManager: DataManager) {
        this.cellFields = new LazyGeneratedArray(
            new RectangularCellField(60, 60, 0) as CellField,
            cellField => cellField.lower);
        this.finitePlainAbstractions = new LazyGeneratedArray(
            new FinitePlaneAbstraction(this.cellFields.initial as RectangularCellField),
            fpa => fpa.lower);
        this.data = new LazyGeneratedArray(
            new CellData(dataManager, this.cellFields.initial, 0, 0),
            data => data.lower
        )
        this.levels = new LazyGeneratedArray(
            new Level2(this.finitePlainAbstractions.initial, this.cellFields.initial, this.data.initial),
            level => level.lower);
        this.levelHistory = new CircularQueue<Level2>(5);
        this.levelHistory.put(this.levels.initial);
    }

    get visible(): Level2 {
        return this.levelHistory.get(0);
    }

    set visible(level: Level2) {
        if (!this.visible.equals(level)) {
            this.levelHistory.put(level);
        }
    }
}

export class LevelState {
    readonly zoom: number;
    readonly depth: number;

    constructor(zoom: number, depth: number) {
        this.zoom = zoom;
        this.depth = depth;
    }
}