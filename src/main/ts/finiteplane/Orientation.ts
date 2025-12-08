export function getOrientation(zoom: number): FinitePlaneOrientation {
    return zoom % 2 === 0 ? EVEN_ORIENTATION : ODD_ORIENTATION;
}

export interface FinitePlaneOrientation {
    getXPos(rowPos: number, columnPos: number): number;

    getYPos(rowPos: number, columnPos: number): number;

    getRowPos(xPos: number, yPos: number): number;

    getColumnPos(xPos: number, yPos: number): number;
}

class OddPlaneOrientation implements FinitePlaneOrientation {
    getXPos(rowPos: number, columnPos: number): number {
        return rowPos;
    }

    getYPos(rowPos: number, columnPos: number): number {
        return columnPos;
    }

    getRowPos(xPos: number, yPos: number): number {
        return xPos;
    }

    getColumnPos(xPos: number, yPos: number): number {
        return yPos;
    }
}

class EvenPlaneOrientation implements FinitePlaneOrientation {
    getXPos(rowPos: number, columnPos: number): number {
        return columnPos;
    }

    getYPos(rowPos: number, columnPos: number): number {
        return rowPos;
    }

    getRowPos(xPos: number, yPos: number): number {
        return yPos;
    }

    getColumnPos(xPos: number, yPos: number): number {
        return xPos;
    }
}

const ODD_ORIENTATION = new OddPlaneOrientation();
const EVEN_ORIENTATION = new EvenPlaneOrientation();