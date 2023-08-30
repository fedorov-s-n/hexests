import {DIContainer} from "./di/DIContainer";
import {HexesFieldStartPoint} from "./HexesFieldStartPoint";
import {Random} from "./algorithms/Random";
import {CircusComponent} from "./htmlcomponents/CircusComponent";
import {SingleElementComponent} from "./htmlcomponents/SingleElementComponent";
import {SingleLineComponent} from "./htmlcomponents/SingleLineComponent";
import {CommandCentre} from "./command/CommandCentre";

const document = window.document;
const container = new DIContainer();
container.put(DIContainer, container);
container.put(Random, new Random());
container.put(Document, document);

const startPoint = container.get(HexesFieldStartPoint);
const commandCentre = container.get(CommandCentre);

const circus = new CircusComponent();
circus.attach(document.body);

circus.right = new SingleElementComponent(document.createElement('div')).setup(right => {
    right.className = 'ht-help-panel';

    let historyIndex = -1;
    const onCommand = (command: string) => {
        historyIndex = -1;
        right.innerText += '\n' + commandCentre.execute(command);
    }
    circus.footer = new SingleLineComponent(document.createElement('input'), onCommand).setup(input => {
        input.className = 'ht-command-line';
        input.placeholder = 'Enter command...';
        input.addEventListener("keydown", event => {
            event.stopPropagation();
            const lastHistoryIndex = historyIndex;
            if (event.key === "ArrowUp") {
                historyIndex = Math.min(historyIndex + 1, commandCentre.getRecentCommands().length - 1);
            } else if (event.key === "ArrowDown") {
                historyIndex = Math.max(historyIndex - 1, -1);
            } else {
                return;
            }
            if (historyIndex == lastHistoryIndex) return;
            input.value = historyIndex === -1 ? '' : commandCentre.getRecentCommands()[historyIndex];
            input.selectionStart = input.selectionEnd = input.value.length;
        });
    });
});

circus.center = new SingleElementComponent(document.createElement('div')).setup(div => {
    div.className = 'ht-three-js-panel';
    setTimeout(() => startPoint.gogogo(div));
});