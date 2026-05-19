import * as mc from "@minecraft/server";
import { type CommandParameter } from ".";

export const locationParam: CommandParameter = {
    name: "location",
    type: mc.CustomCommandParamType.Location,
    mandatory: true
}

export const entitySelectorParam: CommandParameter = {
    name: "targets",
    type: mc.CustomCommandParamType.EntitySelector,
    mandatory: true
}

export const playerSelectorParam: CommandParameter = {
    name: "players",
    type: mc.CustomCommandParamType.PlayerSelector,
    mandatory: true
}