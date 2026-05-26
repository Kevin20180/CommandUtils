import * as mc from "@minecraft/server";
import { giveItem, scriptCommandManager } from ".";
import { JsonParser } from "../../jsonParser";

export interface GiveCommandData {
	id: string,
	amount?: number,
	name?: string,
	lock_mode?: "inventory" | "slot",
	can_place_on?: string[],
	can_destroy?: string[],
	lore?: string[],
	enchantments?: EnchantmentData[]
}

export interface EnchantmentData {
    id: string,
    level?: number
}

export const giveCommandParser = new JsonParser<mc.ItemStack>('give_command_parser', (data) => {
	if(typeof data !== "object" || data === null) throw TypeError('Os dados do item devem ser um objeto.');
	data = data as GiveCommandData;

	if(typeof data.id !== 'string') throw TypeError("Propriedade 'id' deve ser string.");
	if(data.amount != undefined && typeof data.amount !== 'number') throw TypeError("Propriedade 'amount' deve ser number?.");
	if(data.name != undefined && typeof data.name !== 'string') throw TypeError("Propriedade 'name' deve ser string?.");
	if(data.lock_mode != undefined && !['inventory', 'slot'].includes(data.lock_mode)) throw TypeError("Propriedade 'lock_mode' deve ser ('inventory' | 'slot')?.");
	if(data.can_place_on != undefined && !Array.isArray(data.can_place_on)) throw TypeError("Propriedade 'can_place_on' deve ser string[]?.");
	if(data.can_destroy != undefined && !Array.isArray(data.can_destroy)) throw TypeError("Propriedade 'can_destroy' deve ser string[]?.");
	if(data.lore != undefined && !Array.isArray(data.lore)) throw TypeError("Propriedade 'lore' deve ser string[]?.");
	if(data.enchantments != undefined && !Array.isArray(data.enchantments)) throw TypeError("Propriedade 'enchantments' deve ser um objeto EnchantmentData[].");

	if(data.can_place_on) {
		for(let i in data.can_place_on) {
			let id = data.can_place_on[i]!;
			if(typeof id !== 'string') throw TypeError(`Propriedade 'can_place_on[${i}]' deve ser string.`);
		}
	}

	if(data.can_destroy) {
		for(let i in data.can_destroy) {
			let id = data.can_destroy[i]!;
			if(typeof id !== 'string') throw TypeError(`Propriedade 'can_destroy[${i}]' deve ser string.`);
		}
	}

	if(data.lore) {
		if(data.lore.length > 20) throw Error("Propriedade 'lore' deve ter até 20 linhas.");
		for(let i in data.lore) {
			let loreText = data.lore[i]!;
			if(typeof loreText !== 'string') throw TypeError(`Propriedade 'lore[${i}]' deve ser string.`);
			if(loreText.length > 50) throw Error(`Propriedade 'lore[${i}]' deve ter até 50 caracteres.`);
		}
	}

	const item = new mc.ItemStack(data.id, data.amount || 1);

	if(data.enchantments) {
		const enchantComp = item.getComponent('enchantable');
		if(!enchantComp) throw Error('O item não pode ser encantado.');

		for(let i in data.enchantments) {
			const enc = data.enchantments[i]!;
			if(typeof enc !== 'object' || enc === null) throw TypeError(`Propriedade 'enchantments[${i}]' deve ser um objeto EnchantmentData.`);
			if(typeof enc.id !== "string") throw TypeError(`Propriedade 'enchantments[${i}].id' deve ser string.`);
			if(enc.level != undefined && typeof enc.level !== "number") throw TypeError(`Propriedade 'enchantments[${i}].level' deve ser number.`);
			
			let encType;
			try {
				encType = new mc.EnchantmentType(enc.id);
			} catch {
				throw Error(`Encantamento inexistente em 'enchantments[${i}].id'.`);
			}

			try {
				enchantComp.addEnchantment({
					type: encType,
					level: enc.level || 1
				})
			} catch {
				throw Error(`Não foi possível adicionar o encantamento 'enchantments[${i}]'.`);
			}
		}
	}

	if(data.name) item.nameTag = data.name;
	if(data.lock_mode) item.lockMode = data.lock_mode === "inventory" ? mc.ItemLockMode.inventory : mc.ItemLockMode.slot;

	if(data.can_place_on) {
		try { item.setCanPlaceOn(data.can_place_on) }
		catch { throw Error("Identificador inválido de um bloco de 'can_place_on'") }
	}

	if(data.can_destroy) {
		try { item.setCanDestroy(data.can_destroy) }
		catch { throw Error("Identificador inválido de um bloco de 'can_destroy'") }
	}

	if(data.lore) item.setLore(data.lore);

	return item;
})

scriptCommandManager.register('cmdutils:give', (event) => {
	const { sourcePlayer: player, message } = event;
	if(!player) return;

    try {
    	const item = giveCommandParser.parse(message);
    	giveItem(player, item);
    } catch(e) {
    	player.sendMessage("§c" + (e as Error).message);
    }
}, 'Dá um item à um jogador.')