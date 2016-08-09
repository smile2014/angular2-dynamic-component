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

import {
    Http,
    Response,
    RequestOptionsArgs
} from '@angular/http';

import {ObservableWrapper} from '@angular/common/src/facade/async';

import {InputMetadata} from '@angular/core/src/metadata/directives';
import {Reflector} from '@angular/core/src/reflection/reflection';

import {BrowserDomAdapter}  from '@angular/platform-browser/src/browser/browser_adapter';
import {IComponentRemoteTemplateFactory} from './IComponentRemoteTemplateFactory';

const DYNAMIC_SELECTOR:string = 'DynamicComponent';

export class DynamicComponent implements IComponentMetadata {
    constructor(public selector:string = DYNAMIC_SELECTOR, public template:string = '') {
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
    @Input() componentTemplateUrl:string;
    @Input() componentRemoteTemplateFactory:IComponentRemoteTemplateFactory;

    private componentInstance:ComponentRef<TDynamicComponentType>;

    protected destroyWrapper:boolean = false;

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentResolver:ComponentResolver,
                protected reflector:Reflector,
                protected http:Http) {
    }

    /**
     * @override
     */
    public ngOnChanges() {
        this.getComponentTypePromise().then((componentType:Type) => {
            this.componentResolver.resolveComponent(componentType)
                .then((componentFactory:ComponentFactory<TDynamicComponentType>) => {
                    if (this.componentInstance) {
                        this.componentInstance.destroy();
                    }
                    this.componentInstance = this.viewContainer.createComponent<TDynamicComponentType>(componentFactory);

                    this.applyPropertiesToDynamicComponent(this.componentInstance.instance);

                    // Remove wrapper after render the component
                    if (this.destroyWrapper) {
                        new BrowserDomAdapter().remove(this.element.nativeElement);
                    }
                });
        });
    }

    protected getComponentTypePromise():Promise<Type> {
        return new Promise((resolve:(value:Type) => void) => {
            if (!isBlank(this.componentMetaData)) {
                resolve(
                    Component(this.componentMetaData)(() => {
                    })
                );
            } else if (!isBlank(this.componentTemplate)) {
                resolve(
                    this.makeComponentClass(this.componentTemplate)
                );
            } else if (!isBlank(this.componentTemplateUrl)) {
                this.loadRemoteTemplate(resolve);
            } else {
                resolve(this.componentType);
            }
        });
    }

    private loadRemoteTemplate(resolve:(value:Type) => void) {
        let requestArgs:RequestOptionsArgs = {withCredentials: true};
        if (!isBlank(this.componentRemoteTemplateFactory)) {
            requestArgs = this.componentRemoteTemplateFactory.buildRequestOptions();
        }

        ObservableWrapper.toPromise(this.http.get(this.componentTemplateUrl, requestArgs))
            .then((response:Response) => {
                resolve(
                    this.makeComponentClass(!isBlank(this.componentRemoteTemplateFactory)
                        ? this.componentRemoteTemplateFactory.parseResponse(response)
                        : response.text())
                );
            }, (reason:any) => {
                resolve(reason);
            });
    }

    private makeComponentClass(template:string) {
        return Component({selector: DYNAMIC_SELECTOR, template: template})(() => {
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
