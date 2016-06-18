import {
    Component,
    Input,
    ComponentFactory,
    ComponentResolver,
    ElementRef,
    OnInit,
    ViewContainerRef
} from '@angular/core';

import {
    Type,
    isPresent,
    isArray
} from '@angular/core/src/facade/lang';

import {InputMetadata} from '@angular/core/src/metadata/directives';
import {Reflector} from '@angular/core/src/reflection/reflection';

import {BrowserDomAdapter}  from '@angular/platform-browser/src/browser/browser_adapter';

export class DynamicComponent {
    template:string = '';
    selector:string = 'DynamicComponent'
}

@Component(new DynamicComponent())
export class DynamicComponentFactory<C> implements OnInit {

    @Input() componentType:{new ():C};

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentResolver:ComponentResolver,
                protected reflector:Reflector) {
    }

    public ngOnInit() {
        this.componentResolver.resolveComponent(this.componentType)
            .then((componentFactory:ComponentFactory<C>) => {

                this.applyPropertiesToDynamicComponent(
                    this.viewContainer.createComponent<C>(componentFactory).instance
                );

                // Remove wrapper after render the component
                new BrowserDomAdapter().remove(this.element.nativeElement);
            });
    }

    private applyPropertiesToDynamicComponent(instance:C) {
        const placeholderComponentMetaData:{[key: string]: Type[];} = this.reflector.propMetadata(this.constructor),
            dynamicComponentMetaData:{[key: string]: Type[];} = this.reflector.propMetadata(instance.constructor);

        for (let prop of Object.keys(this)) {
            if (this.hasInputMetadataAnnotation(placeholderComponentMetaData[prop])
                && this.hasInputMetadataAnnotation(dynamicComponentMetaData[prop])) {

                if (isPresent(instance[prop])) {
                    console.warn('[$DynamicComponentFactory] The property', prop, 'will be overwritten for the component', instance);
                }
                instance[prop] = this[prop];
            }
        }
    }

    private hasInputMetadataAnnotation(metaDataByProperty:Array<Type>):boolean {
        if (!isArray(metaDataByProperty)) {
            return false;
        }

        for (let decorator of metaDataByProperty) {
            if (decorator instanceof InputMetadata) {
                return true;
            }
        }
        return false;
    }
}
