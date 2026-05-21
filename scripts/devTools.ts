import * as mc from "@minecraft/server";
import { formatedDateString, toString } from "./utils";

export const consoleInChat = {
    print(type: string, message: any) {
        if(!Array.isArray(message)) message = [message];
        
        let rawMsg = `[${formatedDateString()}] [${type}§r§f] `;
        for(let msg of message) {
            rawMsg += toString(msg) + " ";
        }
        
        rawMsg = rawMsg.slice(0, -1);
        
        mc.world.sendMessage(rawMsg);
    },
    
    log(message: any) {
        this.print("INFO", message);
    },
    info(message: any) {
        this.print("INFO", message);
    },
    warn(message: any) {
        this.print("§eWARN", message);
    },
    error(message: any) {
        this.print("§cERROR", message);
    },
}