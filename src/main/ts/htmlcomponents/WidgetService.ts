import {Component} from "../di/Component";
import {ListComponent} from "./ListComponent";
import {NumberInput} from "./NumberInput";
import {SingleElementComponent} from "./SingleElementComponent";

@Component
export class WidgetService {
    private readonly header: ListComponent;
    private readonly footer: ListComponent;
    private readonly document: Document;

    constructor(header: ListComponent, footer: ListComponent, document: Document) {
        this.header = header;
        this.footer = footer;
        this.document = document;
    }

    addNumberFieldEditors(object: any) {
        for (let name in object) {
            if (object.hasOwnProperty(name)) {
                if (Number.isFinite(object[name])) {
                    this.header.addComponent(new NumberInput(object, name));
                }
            }
        }
    }

    addButton(label: string, action: () => void) {
        this.footer.addComponent(new SingleElementComponent(this.document.createElement('button')).setup(button => {
            button.textContent = label;
            button.addEventListener('click', action);
        }));
    }

    addIndicator(label: string): (value: any) => void {
        const component = new SingleElementComponent(this.document.createElement('dic'));
        this.footer.addComponent(component);
        component.element.innerText = label + ': unset';
        return (value: any) => component.element.innerText = label + ': ' + value;
    }
}