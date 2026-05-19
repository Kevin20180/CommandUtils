import * as mc from "@minecraft/server";

export class CommandRegister {
    readonly namespace: string;
    readonly cheatsRequired: boolean;
    readonly permissionLevel: mc.CommandPermissionLevel;
    _commands: Command[];
    _enums: CommandEnum[];
    
    constructor(
        namespace: string,
        cheatsRequired: boolean = false,
        permissionLevel: mc.CommandPermissionLevel = mc.CommandPermissionLevel.Any
    ) {
        if(typeof namespace != "string") throw TypeError("Argument 'namespace' must be of type string.");
        if(typeof cheatsRequired != "boolean") throw TypeError("Argument 'cheatsRequired' must be of type boolean.");
        if(typeof permissionLevel != "number") throw TypeError("Argument 'permissionLevel' must be of type CommandPermissionLevel.");
        
        this.namespace = namespace;
        this.cheatsRequired = cheatsRequired;
        this.permissionLevel = permissionLevel;
        this._commands = [];
        this._enums = [];
        
        commandRegisters.push(this);
    }
    
    registerCommand(
        name: string,
        options: CommandOptions,
        callback: CommandCallback
    ) {
        if(typeof name != "string") throw TypeError("Argument 'name' must be of type string.");
        
        if(typeof options != "object") throw TypeError("Argument 'options' must be of type CommandOptions.");
        if(options.description != undefined && typeof options.description != "string") throw TypeError("Argument 'options.description' must be of type string | undefined.");
        if(options.cheatsRequired != undefined && typeof options.cheatsRequired != "boolean") throw TypeError("Argument 'options.cheatsRequired' must be of type boolean | undefined.");
        if(options.permissionLevel != undefined && typeof options.permissionLevel != "number") throw TypeError("Argument 'options.permissionLevel' must be of type CommandPermissionLevel.");
        if(!Array.isArray(options.parameters)) throw TypeError("Argument 'options.parameters' must be of type CommandParameter[].");
        
        if(typeof callback != "function") throw TypeError("Argument 'callback' must be of type Function.");
        
        let parameters: CommandParameterBase[] = [];
        options.parameters = options.parameters ?? [];
        
        options.parameters.forEach((param) => {
            if(isParameterEnum(param)) {
                let name = param.enumName.includes(":")
                  ? param.enumName
                  : this.namespace + ":" + param.enumName;
                
                parameters.push({
                    name,
                    type: mc.CustomCommandParamType.Enum,
                    mandatory: param.mandatory
                })
            }
            else {
                parameters.push({
                    name: param.name,
                    type: param.type,
                    mandatory: param.mandatory
                })
            }
        })
        
        this._commands.push({
            name: this.namespace + ":" + name,
            description: options.description ?? "",
            cheatsRequired: options.cheatsRequired ?? this.cheatsRequired ?? false,
            permissionLevel: options.permissionLevel ?? this.permissionLevel ?? mc.CommandPermissionLevel.Any,
            mandatoryParameters: parameters.filter(p => p.mandatory) as mc.CustomCommandParameter[],
            optionalParameters: parameters.filter(p => !p.mandatory) as mc.CustomCommandParameter[],
            callback: callback as any
        })
    }
    
    registerEnum(name: string, values: string[]) {
        if(!name.includes(":")) name = this.namespace + ":" + name;
        this._enums.push({ name, values });
    }
}

export interface CommandOptions {
    description?: string,
    cheatsRequired?: boolean,
    permissionLevel?: mc.CommandPermissionLevel,
    parameters?: CommandParameter[]
}

export interface CommandParameterBase {
    name: string,
    type: CommandParameterType,
    mandatory?: boolean
}

export interface CommandParameterEnum {
    enumName: string,
    mandatory?: boolean
}

export interface CommandResult {
    status: CommandStatus,
    message?: string
}

export type CommandParameter = CommandParameterBase | CommandParameterEnum;

export type CommandCallback = (origin: mc.CustomCommandOrigin, ...args: any[]) => CommandResult | string | boolean | void;

export type CommandParameterType = `${mc.CustomCommandParamType}`;

export type CommandStatus = keyof typeof mc.CustomCommandStatus | mc.CustomCommandStatus;

interface Command extends mc.CustomCommand {
    callback: CommandCallback
}

export interface CommandEnum {
    name: string,
    values: string[]
}

function isParameterEnum(param: CommandParameter): param is CommandParameterEnum {
    if(typeof param !== "object") return false;
    return "enumName" in param;
}

let commandRegisters: CommandRegister[] = [];

mc.system.beforeEvents.startup.subscribe((ev) => {
    const commandRegistry = ev.customCommandRegistry;
    
    for(const commandRegister of commandRegisters) {
        for(const enumData of commandRegister._enums) {
            commandRegistry.registerEnum(enumData.name, enumData.values);
        }
    }
    
    for(const commandRegister of commandRegisters) {
        for(const command of commandRegister._commands) {
            commandRegistry.registerCommand(command, (origin, ...args) => {
                const res = command.callback(origin, ...args);
                switch(typeof res) {
                    case "object":
                        const res0: mc.CustomCommandResult = {
                            ...res,
                            status: typeof res.status == "string" ? (res.status == "Success" ? 0 : 1) : res.status
                        }
                        return res0;
                    case "string":
                        return { status: mc.CustomCommandStatus.Success, message: res }
                    case "boolean":
                        return { status: res ? mc.CustomCommandStatus.Success : mc.CustomCommandStatus.Failure }
                    case "undefined":
                        return { status: mc.CustomCommandStatus.Failure }
                    default:
                        return res;
                }
            })
        }
    }
})