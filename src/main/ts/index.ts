import {DIContainer} from "./di/DIContainer";
import {HexesFieldStartPoint} from "./HexesFieldStartPoint";

const container = new DIContainer();
container.put(DIContainer, container);
const startPoint = container.get(HexesFieldStartPoint);
startPoint.gogogo(window);