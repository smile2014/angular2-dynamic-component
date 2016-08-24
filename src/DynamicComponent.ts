import {
    Component,
    Input,
    ComponentFactoryResolver,
    ComponentMetadataType,
    ElementRef,
    OnChanges,
    ViewContainerRef,
    ComponentRef
} from '@angular/core';

import {
    Type,
    ConcreteType,
    isPresent,
    isBlank,
    isArray
} from '@angular/core/src/facade/lang';

import {
    Http,
    Response,
    RequestOptionsArgs
} from '@angular/http';

import {InputMetadata} from '@angular/core/src/metadata/directives';
import {Reflector} from '@angular/core/src/reflection/reflection';

import {BrowserDomAdapter}  from '@angular/platform-browser/src/browser/browser_adapter';
import {IComponentRemoteTemplateFactory} from './IComponentRemoteTemplateFactory';

const DYNAMIC_SELECTOR:string = 'DynamicComponent';

export class DynamicComponentMetadata implements ComponentMetadataType {
    constructor(public selector:string = DYNAMIC_SELECTOR, public template:string = '') {
    }
}

@Component(new DynamicComponentMetadata())
export class DynamicComponent<TDynamicComponentType> implements OnChanges {

    @Input() componentType:{new ():TDynamicComponentType};
    @Input() componentMetaData:ComponentMetadataType;
    @Input() componentTemplate:string;
    @Input() componentTemplateUrl:string;
    @Input() componentRemoteTemplateFactory:IComponentRemoteTemplateFactory;

    private componentInstance:ComponentRef<TDynamicComponentType>;

    protected destroyWrapper:boolean = false;

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentFactoryResolver:ComponentFactoryResolver,
                protected reflector:Reflector,
                protected http:Http) {
    }

    /**
     * @override
     */
    public ngOnChanges() {
        this.getComponentTypePromise().then((componentType:ConcreteType<TDynamicComponentType>) => {
            if (this.componentInstance) {
                this.componentInstance.destroy();
            }

            this.componentInstance = this.viewContainer.createComponent<TDynamicComponentType>(
                this.componentFactoryResolver.resolveComponentFactory(componentType)
            );

            this.applyPropertiesToDynamicComponent(this.componentInstance.instance);

            // Remove wrapper after render the component
            if (this.destroyWrapper) {
                new BrowserDomAdapter().remove(this.element.nativeElement);
            }
        });
    }

    protected getComponentTypePromise():Promise<ConcreteType<TDynamicComponentType>> {
        return new Promise((resolve:(value:ConcreteType<TDynamicComponentType>) => void) => {
            if (!isBlank(this.componentMetaData)) {
                resolve(
                    Component(this.componentMetaData).Class({})
                );
            } else if (!isBlank(this.componentTemplate)) {
                resolve(
                    this.makeComponentClass(this.componentTemplate)
                );
            } else if (!isBlank(this.componentTemplateUrl)) {
                this.loadRemoteTemplate(this.componentTemplateUrl, resolve);
            } else {
                resolve(this.componentType);
            }
        });
    }

    private loadRemoteTemplate(url:string, resolve:(value:ConcreteType<TDynamicComponentType>) => void) {
        let requestArgs:RequestOptionsArgs = {withCredentials: true};
        if (!isBlank(this.componentRemoteTemplateFactory)) {
            requestArgs = this.componentRemoteTemplateFactory.buildRequestOptions();
        }

        this.http.get(url, requestArgs)
            .subscribe((response:Response) => {
                if (response.status === 301 || response.status === 302) {
                    const chainedUrl:string = response.headers.get('Location');
                    if (!isBlank(chainedUrl)) {
                        this.loadRemoteTemplate(chainedUrl, resolve);
                    }
                } else {
                    resolve(
                        this.makeComponentClass(!isBlank(this.componentRemoteTemplateFactory)
                            ? this.componentRemoteTemplateFactory.parseResponse(response)
                            : response.text())
                    );
                }
            }, (response:Response) => {
                console.error('[$DynamicComponent] loadRemoteTemplate error response:', response);

                resolve(
                    this.makeComponentClass([
                        response.status, ':', response.statusText || response.text()
                    ].join(''))
                );
            });
    }

    private makeComponentClass(template:string):ConcreteType<TDynamicComponentType> {
        return Component({selector: DYNAMIC_SELECTOR, template: template}).Class({});
    }

    private applyPropertiesToDynamicComponent(instance:TDynamicComponentType) {
        const placeholderComponentMetaData:{[key:string]:Type[];} = this.reflector.propMetadata(this.constructor),
            dynamicComponentMetaData:{[key:string]:Type[];} = this.reflector.propMetadata(instance.constructor);

        for (let prop of Object.keys(this)) {
            if (this.hasInputMetadataAnnotation(placeholderComponentMetaData[prop])
                && this.hasInputMetadataAnnotation(dynamicComponentMetaData[prop])) {

                if (isPresent(instance[prop])) {
                    console.warn('[$DynamicComponent] The property', prop, 'will be overwritten for the component', instance);
                }
                instance[prop] = this[prop];
            }
        }
    }

    private hasInputMetadataAnnotation(metaDataByProperty:Array<Type>):boolean {
        return isArray(metaDataByProperty) && !!metaDataByProperty.find((decorator:Type) => decorator instanceof InputMetadata);
    }
}
