export * from "@minecraft/server-ui";

import * as mc from "@minecraft/server";
import * as ui from "@minecraft/server-ui";
import { EventEmitter } from "eventemitter3";

export class Menu <
    T extends FormTypes,
    Events extends Record<string | symbol, (...args: any[]) => any>
> extends EventEmitter<Events> {
    protected form: FormDataTypes[T];
    options: MenuOptions;
    
    constructor(form: FormDataTypes[T], options: MenuOptions = {}) {
        super();
        this.form = form;
        this.options = options;
    }
    
    title(text: TextTypes): this {
        this.form.title(text);
        return this;
    }
    
    open(player: mc.Player): Promise<FormResponseTypes[T]> {
        if(!this.options.openingSoundOptions) this.options.openingSoundOptions = {}
        if(!this.options.openingSoundOptions.sound) this.options.openingSoundOptions.sound = "random.pop2";
        
        player.playSound(this.options.openingSoundOptions.sound, {
            volume: this.options.openingSoundOptions.volume,
            pitch: this.options.openingSoundOptions.pitch
        })
        
        return this.show(player);
    }
    
    show(player: mc.Player): Promise<FormResponseTypes[T]> {
        return this.form.show(player);
    }
}

export class ActionMenu extends Menu<FormTypes.ActionForm, ActionFormEventTypes> {
    buttons: ActionFormButton[];
    
    constructor(options: MenuOptions = {}) {
        super(new ui.ActionFormData());
        this.buttons = [];
        this.on("click", (player, buttonIndex) => {
            const handler = this.buttons.find((b,i) => i === buttonIndex);
            if(!handler || !handler.onClick) return;
            
            if(typeof handler.onClick == "function") {
                const res = handler.onClick(player);
                if(typeof res == "object" && res instanceof Menu) {
                    res.open(player);
                }
                else if(typeof res == "string") {
                    menuManager.open(player, res);
                }
            }
            else if(typeof handler.onClick == "string") {
                menuManager.open(player, handler.onClick);
            }
        })
    }
    
    header(text: TextTypes): this {
        this.form.header(text);
        return this;
    }
    
    body(text: TextTypes): this {
        this.form.body(text);
        return this;
    }
    
    button(text: TextTypes, texture?: string | undefined, onClick?: ((player: mc.Player) => void) | string): this {
        this.form.button(text, texture);
        this.buttons.push({ buttonText: text, onClick: onClick });
        return this;
    }
    
    label(text: TextTypes): this {
        this.form.label(text);
        return this;
    }
    
    divider(): this {
        this.form.divider();
        return this;
    }
    
    show(player: mc.Player): Promise<ui.ActionFormResponse> {
        const res = this.form.show(player);
        res.then((data) => {
            this.emit("response", player, data);
            if(data.selection != undefined) {
                this.emit("click", player, data.selection);
            }
        })
        return res;
    }
}

export class MessageMenu extends Menu<FormTypes.MessageForm, MessageFormEventTypes> {
    button1Handler: MessageFormButton | undefined;
    button2Handler: MessageFormButton | undefined;
    
    constructor() {
        super(new ui.MessageFormData());
    }
    
    body(text: TextTypes): this {
        this.form.body(text);
        return this;
    }
    
    button1(text: TextTypes, onClick?: () => void): this {
        this.form.button2(text);
        this.button1Handler = { buttonText: text, onClick: onClick }
        return this;
    }
    
    button2(text: TextTypes, onClick?: () => void): this {
        this.form.button1(text);
        this.button2Handler = { buttonText: text, onClick: onClick }
        return this;
    }
    
    show(player: mc.Player): Promise<ui.ActionFormResponse> {
        const res = this.form.show(player);
        res.then((data) => {
            this.emit("response", player, data);
            if(data.selection != undefined) {
                this.emit("click", player, data.selection === 1 ? 0 : 1);
            }
        })
        return res;
    }
}

export class ModalMenu extends Menu<FormTypes.ModalForm, ModalFormEventTypes> {
    constructor() {
        super(new ui.ModalFormData());
    }
    
    header(text: TextTypes): this {
        this.form.header(text);
        return this;
    }
    
    label(text: TextTypes): this {
        this.form.label(text);
        return this;
    }
    
    divider(): this {
        this.form.divider();
        return this;
    }
    
    slider(
        label: TextTypes,
        minValue: number,
        maxValue?: number,
        sliderOptions?: ui.ModalFormDataSliderOptions
    ): this {
        this.form.slider(label, minValue, maxValue ?? minValue, sliderOptions);
        return this;
    }
    
    dropdown(
        label: TextTypes,
        items?: TextTypes[],
        dropdownOptions?: ui.ModalFormDataDropdownOptions,
    ): this {
        this.form.dropdown(label, items ?? [], dropdownOptions);
        return this;
    }
    
    input(
        label: TextTypes,
        placeholderText?: TextTypes,
        textFieldOptions?: ui.ModalFormDataTextFieldOptions,
    ): this {
        this.form.textField(label, placeholderText ?? "", textFieldOptions);
        return this;
    }
    
    toggle(label: TextTypes, toggleOptions?: ui.ModalFormDataToggleOptions): this {
        this.form.toggle(label, toggleOptions);
        return this;
    }
    
    submitButton(text: TextTypes): this {
        this.form.submitButton(text);
        return this;
    }
    
    show(player: mc.Player): Promise<ui.ModalFormResponse> {
        const res = this.form.show(player);
        res.then((data) => {
            this.emit("response", player, data.formValues, data);
        })
        return res;
    }
}

export class MenuManager {
    constructor() {}
    
    register(menuId: string, menu: MenuTypes | ((player: mc.Player, ...args: any[]) => Promise<FormResponseUnion>)) {
        if(typeof menuId != "string") throw new TypeError("Argument 'menuId' must be of type string.");
        if(!(menu instanceof Menu || typeof menu == "function")) throw new TypeError("Argument 'menu' must be of type MenuTypes | (() => Promise<FormResponseUnion>)");
        registeredMenus.set(menuId, menu);
    }
    
    open(player: mc.Player, menuId: string, ...args: any[]): Promise<FormResponseUnion | undefined> {
        if(!(player instanceof mc.Player)) throw new TypeError("Argument 'player' must be of type Player.");
        if(typeof menuId != "string") throw new TypeError("Argument 'menuId' must be of type string.");
        
        return new Promise((resolve, reject) => {
            const menu = registeredMenus.get(menuId);
            if(!menu) return resolve(undefined);
            resolve(typeof menu == "object" ? menu.open(player) : menu(player, ...args));
        })
    }
}

export type TextTypes = mc.RawMessage | string;

export type MenuTypes = ActionMenu | MessageMenu | ModalMenu;

export type FormDataTypes = {
    0: ui.ActionFormData,
    1: ui.MessageFormData,
    2: ui.ModalFormData
}

export enum FormTypes {
    ActionForm,
    MessageForm,
    ModalForm
}

export type FormResponseTypes = {
    0: ui.ActionFormResponse
    1: ui.MessageFormResponse,
    2: ui.ModalFormResponse
}

export type FormResponseUnion = FormResponseTypes[keyof FormResponseTypes];

export type ActionFormEventTypes = {
    response: (player: mc.Player, response: ui.ActionFormResponse) => void,
    click: (player: mc.Player, buttonIndex: number) => void
}

export type MessageFormEventTypes = {
    response: (player: mc.Player, response: ui.MessageFormResponse) => void,
    click: (player: mc.Player, buttonIndex: number) => void
}

export type ModalFormEventTypes = {
    response: (
        player: mc.Player,
        values: (boolean | number | string | undefined)[] | undefined,
        response: ui.ModalFormResponse
    ) => void
}

export interface MenuOptions {
    openingSoundOptions?: {
        sound?: string,
        volume?: number,
        pitch?: number
    }
}

export interface ActionFormButton {
    buttonText: TextTypes,
    onClick: (
        (player: mc.Player) =>
          | Menu<FormTypes.ActionForm, ActionFormEventTypes>
          | string
          | void
    ) | string
      | undefined
}

export interface MessageFormButton {
    buttonText: TextTypes,
    onClick: (() => Menu<FormTypes.MessageForm, MessageFormEventTypes> | void) | undefined
}

let registeredMenus = new Map<string, MenuTypes | ((player: mc.Player, ...args: any[]) => Promise<FormResponseUnion>)>();

export const menuManager: MenuManager = new MenuManager();
