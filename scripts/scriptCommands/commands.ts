import * as mc from "@minecraft/server";
import { scriptCommandManager } from ".";
import { toString } from "../utils";
import { ActionMenu } from "../menus";

export interface ActionMenuData {
    title?: string,
    body?: string,
    buttons?: string[],
    on_open?: string[]
}

scriptCommandManager.register('cmdutils:help', (event) => {
    const { sourcePlayer: player } = event;
    if(!player) return;
    
    let message = 'Script event disponíveis:\n\n';

    for(let cmd of scriptCommandManager.getScriptEvents()) {
        message += `§a${cmd.id}§f - ${cmd.description || '?'}§r\n`;
    }

    message += '\nExecute um comando com: §o/scriptevent <id do comando> [mensagem]§r\n';
    message += 'Exemplo: §o/scriptevent cmdutils:help§f\n ';

    player.sendMessage(message);
}, 'Mostra mensagem de ajuda e lista de comandos.')

scriptCommandManager.register('cmdutils:run_script', (event) => {
    const { sourcePlayer: player, message } = event;
    
    try {
        let res = toString(eval(message));
        player?.sendMessage(res);
    } catch(e) {
        player?.sendMessage("§c" + e);
    }
}, 'Executa um script com eval().')

scriptCommandManager.register('cmdutils:open_action_menu', (event) => {
    const { sourcePlayer: player, message } = event;
    if(!player) return;

    let data: ActionMenuData | undefined;
    try {
        data = JSON.parse(message);
    } catch(e) {
        return player.sendMessage("§c" + e);
    }
    
    if(!data) return player.sendMessage("§cNenhum dado fornecido.");

    if(data.title != undefined && typeof data.title !== "string") return player.sendMessage("§cPropriedade 'title' deve ser string.");
    if(data.body != undefined && typeof data.body !== "string") return player.sendMessage("§cPropriedade 'body' deve ser string.");
    if(data.buttons != undefined && !Array.isArray(data.buttons)) return player.sendMessage("§cPropriedade 'buttons' deve ser string[].");
    if(data.on_open != undefined && !Array.isArray(data.on_open)) return player.sendMessage("§cPropriedade 'on_open' deve ser string[].");

    const menu = new ActionMenu();
    if(data.title) menu.title(data.title);
    if(data.body) menu.body(data.body);
    
    if(data.on_open) {
        for(let i in data.on_open) {
            let cmd = data.on_open[i]!;
            if(typeof cmd !== "string") return player.sendMessage(`§cPropriedade 'on_open[${i}]' deve ser string.`);
        }
    }
    
    if(data.buttons) {
        for(let i in data.buttons) {
            let button = data.buttons[i]!;
            if(typeof button !== "string") return player.sendMessage(`§cPropriedade 'buttons[${i}]' deve ser string.`);
            
            menu.button(button, undefined, () => {
                if(!data.on_open) return;
                
                let cmd = data.on_open[i];
                if(!cmd || !player.isValid) return;
                
                try {
                    player.runCommand(cmd);
                } catch(e) {
                    player.sendMessage("§c" + e);
                }
            })
        }
    }
    
    menu.open(player);
}, 'Abre um ActionMenu construído por dados JSON.')
