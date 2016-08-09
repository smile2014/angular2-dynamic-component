import {
    Component,
    Input,
    ComponentFactory,
    ComponentResolver,
    ElementRef,
    OnChanges,
    ViewContainerRef,
    ComponentRef
} from '@angular/core';

import {
    Type,
    isPresent,
    isBlank,
    isArray
} from '@angular/core/src/facade/lang';

import {InputMetadata} from '@angular/core/src/metadata/directives';
import {Reflector} from '@angular/core/src/reflection/reflection';

import {BrowserDomAdapter}  from '@angular/platform-browser/src/browser/browser_adapter';

export class DynamicComponent implements IComponentMetadata {
    constructor(public selector:string = 'DynamicComponent', public template:string = '') {
    }
}

export interface IComponentMetadata {
    template:string;
    selector:string;
    pipes?:Array<Type | any[]>;
}

@Component(new DynamicComponent())
export class DynamicComponentFactory<TDynamicComponentType> implements OnChanges {

    @Input() componentType:{new ():TDynamicComponentType};
    @Input() componentMetaData:IComponentMetadata;
    @Input() componentTemplate:string;

    private componentInstance:ComponentRef<TDynamicComponentType>;

    protected destroyWrapper:boolean = false;

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentResolver:ComponentResolver,
                protected reflector:Reflector) {
    }

    /**
     * @override
     */
    public ngOnChanges() {
        let componentType:Type;

        const componentTemplate:string = this.componentTemplate;
        const componentMetaData:IComponentMetadata = this.componentMetaData;

        if (!isBlank(componentMetaData)) {
            componentType = Component(componentMetaData)(() => {
            });
        } else if (!isBlank(componentTemplate)) {
            componentType = Component({template: componentTemplate})(() => {
            });
        } else {
            componentType = this.componentType;
        }

        this.componentResolver.resolveComponent(componentType)
            .then((componentFactory:ComponentFactory<TDynamicComponentType>) => {

                if (this.componentInstance) {
                    this.componentInstance.destroy();
                }
                this.componentInstance = this.viewContainer.createComponent<TDynamicComponentType>(componentFactory);

                this.applyPropertiesToDynamicComponent(
                    this.componentInstance.instance
                );

                // Remove wrapper after render the component
                if (this.destroyWrapper) {
                    new BrowserDomAdapter().remove(this.element.nativeElement);
                }
            });
    }

    private applyPropertiesToDynamicComponent(instance:TDynamicComponentType) {
        const placeholderComponentMetaData:{[key:string]:Type[];} = this.reflector.propMetadata(this.constructor),
            dynamicComponentMetaData:{[key:string]:Type[];} = this.reflector.propMetadata(instance.constructor);

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
        return isArray(metaDataByProperty) && !!metaDataByProperty.find((decorator:Type) => decorator instanceof InputMetadata);
    }
}
