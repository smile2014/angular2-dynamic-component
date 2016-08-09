import {
    Response,
    RequestOptionsArgs
} from '@angular/http';

export interface IComponentRemoteTemplateFactory {
    buildRequestOptions():RequestOptionsArgs;
    parseResponse(response:Response):string;
}
