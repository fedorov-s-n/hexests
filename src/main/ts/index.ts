import {DIContainer} from "./di/DIContainer";
import {HexesFieldStartPoint} from "./HexesFieldStartPoint";
import {Random} from "./util/Random";
import {createElement} from "react";
import {createRoot} from "react-dom/client";
import {Application} from "./panel/Application";
import {PanelModel} from "./panel/PanelModel";

const document = window.document;
const container = new DIContainer();
container.put(DIContainer, container);
container.put(Random, new Random(0.5772156649015329));
container.put(Document, document);

// a handle for the javascript console: window.di.getIfExists('LevelManager') and the like
(window as any).di = container;

const startPoint = container.get(HexesFieldStartPoint);
const model = container.get(PanelModel);

const root = document.createElement('div');
root.className = 'ht-root';
document.body.appendChild(root);
createRoot(root).render(createElement(Application, {
    model,
    start: (element: HTMLElement) => setTimeout(() => startPoint.gogogo(element))
}));
