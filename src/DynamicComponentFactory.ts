import {
    Component,
    ComponentFactory,
    ComponentResolver,
    ElementRef,
    OnInit,
    ViewContainerRef
} from '@angular/core';

import {InputMetadata} from '@angular/core/src/metadata/directives';
import {Reflector} from '@angular/core/src/reflection/reflection';

import {BrowserDomAdapter}  from '@angular/platform-browser/src/browser/browser_adapter';

export class DynamicComponent {
    template:string = '';
}

export abstract class DynamicComponentFactory<C> implements OnInit {

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentResolver:ComponentResolver,
                protected reflector:Reflector) {
    }

    public ngOnInit() {
        this.componentResolver.resolveComponent(this.getDynamicComponentType())
            .then((componentFactory:ComponentFactory<C>) => {

                this.applyPropertiesToDynamicComponent(
                    this.viewContainer.createComponent<C>(componentFactory).instance
                );

                // Remove wrapper after render the component
                new BrowserDomAdapter().remove(this.element.nativeElement);
            });
    }

    private applyPropertiesToDynamicComponent(instance:C) {
        this.processDecoratedInputFields((copiedProperties:string) => {
            instance[copiedProperties] = this[copiedProperties];
        });
    }

    private processDecoratedInputFields(callback:Function) {
        const metaData = this.reflector.propMetadata(this.constructor);

        for (let prop of Object.keys(this)) {
            const metaDataByProp:Array<any> = metaData[prop];

            if (!Array.isArray(metaDataByProp)) {
                continue;
            }

            for (let decorator of metaDataByProp) {
                if (decorator instanceof InputMetadata) {
                    callback(prop);
                }
            }
        }
    }

    abstract getDynamicComponentType():{new ():C};
}
