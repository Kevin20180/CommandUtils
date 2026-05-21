import * as mc from "@minecraft/server";
import EventEmitter from "eventemitter3";
import { getSourceFromOrigin, isPlayer } from "../utils";

export class ScriptEventManager extends EventEmitter {
    _scriptEventsById: Map<string, ScriptEventCommand>;
    
    constructor() {
        super();
        this._scriptEventsById = new Map();
    }

    register(id: string, onRun?: (event: ScriptCommandEvent) => void): ScriptEventCommand {
        let scriptEvent = this._scriptEventsById.get(id);
        if(scriptEvent) return scriptEvent;

        scriptEvent = new ScriptEventCommand(id);
        this._scriptEventsById.set(id, scriptEvent);

        if(onRun) scriptEvent.on('run', onRun);

        return scriptEvent;
    }

    getScriptEvent(id: string): ScriptEventCommand | undefined {
        return this._scriptEventsById.get(id);
    }

    getScriptEvents(): ScriptEventCommand[] {
        return [...this._scriptEventsById.values()];
    }
}

export class ScriptEventCommand extends EventEmitter<ScriptEventEvents> {
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

export type ScriptEventEvents = {
    run: (event: ScriptCommandEvent) => void
}

export const scriptEventManager = new ScriptEventManager();

mc.system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, message, sourceEntity, sourceBlock, initiator, sourceType } = event;

    const source = getSourceFromOrigin(event);

    const scriptEvent = scriptEventManager.getScriptEvent(id);
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
