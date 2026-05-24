import * as mc from "@minecraft/server";
import { scriptCommandManager, toString, ActionMenu } from ".";

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
