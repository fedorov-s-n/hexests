import {DIContainer} from "./di/DIContainer";
import {HexesFieldStartPoint} from "./HexesFieldStartPoint";

const container = new DIContainer();
const startPoint = container.get(HexesFieldStartPoint);
startPoint.gogogo(window);