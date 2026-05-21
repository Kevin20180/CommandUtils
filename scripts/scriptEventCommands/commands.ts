import * as mc from "@minecraft/server";
import { scriptEventManager } from ".";
import { toString } from "../utils";

scriptEventManager.register('cmdutils:help', (event) => {
    const { sourcePlayer: player } = event;
    if(!player) return;
    
    let message = "Script event disponíveis:\n";

    for(let cmd of scriptEventManager.getScriptEvents()) {
        message += "§a" + cmd.id + "\n";
    }

    player.sendMessage(message);
})

scriptEventManager.register("cmdutils:run_script", (event) => {
    const { sourcePlayer: player, message } = event;
    
    try {
        let res = toString(eval(message));
        player?.sendMessage(res);
    } catch(e) {
        player?.sendMessage("§c" + e);
    }
})
