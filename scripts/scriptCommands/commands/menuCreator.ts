import * as mc from "@minecraft/server";
import { scriptCommandManager, ActionMenu, cacheManager } from ".";
import { JsonParser } from "../../jsonParser";

export const actionMenuCreator = new JsonParser<ActionMenu>('action_menu_parser', (data) => {
	if(typeof data !== "object" || data === null) throw TypeError("Os dados do menu devem ser um objeto.");

	if(data.title != undefined && typeof data.title !== "string") throw TypeError("Propriedade 'title' deve ser string.");
	if(data.body != undefined && typeof data.body !== "string") throw TypeError("Propriedade 'body' deve ser string.");
	if(data.buttons != undefined && !Array.isArray(data.buttons)) throw TypeError("Propriedade 'buttons' deve ser string[].");
	if(data.on_open != undefined && !Array.isArray(data.on_open)) throw TypeError("Propriedade 'on_open' deve ser string[].");

	const menu = new ActionMenu();
	if(data.title) menu.title(data.title);
	if(data.body) menu.body(data.body);
    
	if(data.on_open) {
		for (let i in data.on_open) {
			let cmd = data.on_open[i]!;
			if(typeof cmd !== "string") throw TypeError(`Propriedade 'on_open[${i}]' deve ser string.`);
		}
	}
    
	if(data.buttons) {
		for(let i in data.buttons) {
			let button = data.buttons[i]!;
			if(typeof button !== "string") throw TypeError(`Propriedade 'buttons[${i}]' deve ser string.`);

			menu.button(button, undefined, (player) => {
				if(!data.on_open) return;

				let cmd = data.on_open[i];
				if(!cmd || !player.isValid) return;

				try {
					player.runCommand(cmd);
				} catch (e) {
					player.sendMessage("§c" + e);
				}
			})
		}
	}

	return menu;
})

export interface ActionMenuData {
	title?: string,
	body?: string,
	buttons?: string[],
	on_open?: string[]
}

export interface CachedMenu {
	error?: Error,
	menu?: ActionMenu
}

scriptCommandManager.register('cmdutils:open_action_menu', (event) => {
	const { sourcePlayer: player, message } = event;
	if(!player) return;

    try {
    	const menu = actionMenuCreator.parse(message);
    	menu.open(player);
    } catch(e) {
    	player.sendMessage("§c" + (e as Error).message);
    }
}, 'Abre um action menu construído por dados JSON.')