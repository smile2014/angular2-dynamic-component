# angular2-dynamic-component

The implementation of dynamic component wrapper at Angular2.

## Installation

First you need to install the npm module:
```sh
npm install angular2-dynamic-component --save
```

## Use case #1

**ButtonsToolbar.html**
```html
<template ngFor let-button [ngForOf]="buttons">
  <ButtonsToolbarPlaceholder [componentType]="button.type" [buttonName]="button.name">
  </ButtonsToolbarPlaceholder>
</template>
```

**ButtonsToolbar.ts**
```typescript
import {Component} from '@angular/core';

import {GreenButton} from './GreenButton';
import {RedButton} from './RedButton';
import {IButton} from './IButton';
import {ButtonsToolbarPlaceholder} from './ButtonsToolbarPlaceholder';

export interface ButtonType {
    name:string;
    type:{new ():IButton};
}

@Component({
    selector: 'ButtonsToolbar',
    template: require('./ButtonsToolbar.html'),
    directives: [
        ButtonsToolbarPlaceholder
    ],
})
export class ButtonsToolbar {

    buttons:Array<ButtonType> = [
        {
            name: 'GreenButtonName',
            type: GreenButton
        },
        {
            name: 'RedButtonName',
            type: RedButton
        }
    ];
}
```

**ButtonsToolbarPlaceholder.ts**
```typescript
import {
    Component,
    Input,
    ComponentResolver,
    ViewContainerRef,
    ElementRef
} from '@angular/core';

import {Reflector} from '@angular/core/src/reflection/reflection';

import {DynamicComponentFactory, DynamicComponent} from 'angular2-dynamic-component';

import {IButton} from './IButton';
import {ButtonType} from './ButtonsToolbar';

class ButtonsToolbarComponent extends DynamicComponent {

    constructor(public selector:string = 'ButtonsToolbarPlaceholder') {
        super();
    }
}

@Component(new ButtonsToolbarComponent())
export class ButtonsToolbarPlaceholder extends DynamicComponentFactory<IButton> implements IButton {

    @Input() buttonName:string;
    @Input() componentType:{new ():IButton};

    constructor(protected element:ElementRef,
                protected viewContainer:ViewContainerRef,
                protected componentResolver:ComponentResolver,
                protected reflector:Reflector) {
        super(element, viewContainer, componentResolver, reflector);
    }
}
```

**IButton.ts**
```typescript
import {ButtonType} from './ButtonsToolbar';

export interface IButton {

    buttonName:string;
}
```

**GreenButton.ts**
```typescript
import {
    Component,
    Input
} from '@angular/core';

import {IButton} from './IButton';

@Component({
    selector: 'GreenButton',
    template: '<span style="color: green; width: 50px; border: 1px solid black; padding: 6px; margin: 6px;">The first button with name: {{ buttonName }}</span>',
})
export class GreenButton implements IButton {

    @Input() public buttonName:string;
}
```

**RedButton.ts**
```typescript
import {
    Component,
    Input
} from '@angular/core';

import {IButton} from './IButton';

@Component({
    selector: 'RedButton',
    template: '<span style="color: red; width: 50px; border: 1px solid black; padding: 6px; margin: 6px;">The second button with name: {{ buttonName }}</span>',
})
export class RedButton implements IButton {

    @Input() public buttonName:string;
}
```

**Preview**
![Preview](demo/preview.png)

## Use case #2 **componentTemplate**

**Template**
```html
...
<td *ngFor="let column of columns">
    <DynamicComponent [componentTemplate]="column.getColumnTemplate()">
    </DynamicComponent>
</td>
...
```

**App.ts**
```typescript
@Component({
    ...
    directives: [DynamicComponentFactory]
    ...
})
class App {
...
}
```

**DynamicColumn.ts**
```typescript
export class DynamicColumn extends Column {
    ...
    public getColumnTemplate():string {
        return '<input type="text" style="color: green; width: 100px;" [(ngModel)]="model" (ngModelChange)="onChange($event)"/>';
    }
}
```

## Use case #3 **componentMetaData**

**Template**
```html
...
<td *ngFor="let column of columns">
    <DynamicComponent [componentMetaData]="column.getColumnMetaData()">
    </DynamicComponent>
</td>
...
```

**DynamicColumn.ts**
```typescript
export class DynamicColumn extends Column {
    ...
    public getColumnMetaData():IComponentMetadata {
        return {
           ...
        };
    }
}
```

## Use case #4 **componentTemplateUrl**

**Template**
```html
<DynamicComponent [componentTemplateUrl]="http://www.yandex.ru">
</DynamicComponent>
```

## Publish

```sh
npm run deploy
```

## License

Licensed under MIT.