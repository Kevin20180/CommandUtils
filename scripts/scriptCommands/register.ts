import * as mc from "@minecraft/server";
import EventEmitter from "eventemitter3";
import { getSourceFromOrigin, isPlayer } from "../utils";

export class ScriptCommandManager extends EventEmitter {
    _scriptCommandsById: Map<string, ScriptCommand>;
    
    constructor() {
        super();
        this._scriptCommandsById = new Map();
    }

    register(id: string, onRun?: (event: ScriptCommandEvent) => void): ScriptCommand {
        let scriptCommand = this._scriptCommandsById.get(id);
        if(scriptCommand) return scriptCommand;

        scriptCommand = new ScriptCommand(id);
        this._scriptCommandsById.set(id, scriptCommand);

        if(onRun) scriptCommand.on('run', onRun);

        return scriptCommand;
    }

    getScriptEvent(id: string): ScriptCommand | undefined {
        return this._scriptCommandsById.get(id);
    }

    getScriptEvents(): ScriptCommand[] {
        return [...this._scriptCommandsById.values()];
    }
}

export class ScriptCommand extends EventEmitter<ScriptCommandEvents> {
    readonly id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }
}

export interface ScriptCommandEvent {
    message: string,
    source?: mc.Entity | mc.Block,
    sourcePlayer?: mc.Player,
    sourceEntity?: mc.Entity,
    sourceBlock?: mc.Block,
    initiator?: mc.Entity,
    sourceType: mc.ScriptEventSource,
}

export type ScriptCommandEvents = {
    run: (event: ScriptCommandEvent) => void
}

export const scriptCommandManager = new ScriptCommandManager();

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, message, sourceEntity, sourceBlock, initiator, sourceType } = event;

    const source = getSourceFromOrigin(event);

    const scriptEvent = scriptCommandManager.getScriptEvent(id);
    if(!scriptEvent) {
        if(!isPlayer(source)) return;
        return source.sendMessage(`§cScript event '${id}' inexistente.`);
    }

    scriptEvent.emit("run", {
        message,
        source,
        sourcePlayer: isPlayer(source) ? source : undefined,
        sourceEntity,
        sourceBlock,
        initiator,
        sourceType
    })
})
