export interface CellShiftSupplier {
    getShiftedCellIndex(index: number): number;
}