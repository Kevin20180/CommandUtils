import * as mc from "@minecraft/server";
import { type CommandResult } from "./commands";

let overworld: mc.Dimension;
mc.world.afterEvents.worldLoad.subscribe(() => {
    overworld = mc.world.getDimension("overworld");
})

export function getSourceFromOrigin(
    origin?: {
        initiator?: mc.Entity,
        sourceEntity?: mc.Entity,
        sourceBlock?: mc.Block
    }
): mc.Entity | mc.Block | undefined {
    if(!origin) return;
    return origin.initiator ?? origin.sourceEntity ?? origin.sourceBlock;
}

export function getDimensionFromOrigin(origin: mc.CustomCommandOrigin): mc.Dimension {
    return getSourceFromOrigin(origin)?.dimension ?? overworld;
}

export function getViewDirectionFromTo(from: mc.Vector3, to: mc.Vector3) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    return { x: dx / len, y: dy / len, z: dz / len };
}

export function vector3ToKey(vector3: mc.Vector3): string {
    return `${vector3.x},${vector3.y},${vector3.z}`;
}

export function keyToVector3(key: string): mc.Vector3 | undefined {
    const data = key.split(",");
    let x = Number(data[0]);
    let y = Number(data[1]);
    let z = Number(data[2]);
    
    if(
        (x == undefined || Number.isNaN(x)) ||
        (y == undefined || Number.isNaN(y)) ||
        (z == undefined || Number.isNaN(z))
    ) return undefined;
    
    return { x, y, z }
}

const blockClusterRelativeLocations: mc.Vector3[] = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 }
]

export function getBlockClusterLocations(
    blockIds: string[],
    dimension: mc.Dimension,
    initialLocation: mc.Vector3,
    _excludeBlockLocations?: Set<string>
): Set<mc.Vector3> {
    if(!_excludeBlockLocations) _excludeBlockLocations = new Set<string>();
    
    let locations: Set<mc.Vector3> = new Set([ initialLocation ]);
    
    let locationsToCheck: Set<string> = new Set([ vector3ToKey(initialLocation) ]);
    
    while(locationsToCheck.size > 0) {
        for(const locKey of locationsToCheck) {
            locationsToCheck.delete(locKey);
            
            if(_excludeBlockLocations.has(locKey)) continue;
            
            _excludeBlockLocations.add(locKey);
            
            const loc = keyToVector3(locKey)!;
            const block = dimension.getBlock(loc);
            if(!block || !blockIds.includes(block.typeId)) continue;
            locations.add(loc);
            
            for(const relativeLoc of blockClusterRelativeLocations) {
                const loc1 = {
                    x: loc.x + relativeLoc.x,
                    y: loc.y + relativeLoc.y,
                    z: loc.z + relativeLoc.z
                }
                
                let key = vector3ToKey(loc1);
                if(_excludeBlockLocations.has(key)) continue;
                locationsToCheck.add(key);
            }
        }
    }
    
    return locations;
}

export function euclideanDistance(locationA: mc.Vector3, locationB: mc.Vector3): number {
    const dx = locationA.x - locationB.x;
    const dy = locationA.y - locationB.y;
    const dz = locationA.z - locationB.z;
    return Math.hypot(dx, dy, dz);
}

export function isEntity(object: any): object is mc.Entity {
    if(!object) return false;
    return object instanceof mc.Entity;
}

export function isPlayer(object: any): object is mc.Player {
    if(!object) return false;
    return object instanceof mc.Player;
}

export function isVector3(object: any): object is mc.Vector3 {
    if(!object) return false;
    return (
        "x" in object && typeof object.x === "number" &&
        "y" in object && typeof object.y === "number" &&
        "z" in object && typeof object.z === "number"
    );
}

export function error(message: string): CommandResult {
    return { status: "Failure", message }
}

export function formatedDateString(): string {
    const date = new Date();
    
    let h = date.getHours().toString();
    let m = date.getMinutes().toString();
    let s = date.getSeconds().toString();
    let ms = date.getMilliseconds().toString();
    
    if(h.length < 2) h = "0" + h;
    if(m.length < 2) m = "0" + m;
    if(s.length < 2) s = "0" + s;
    
    if(ms.length < 3) ms = "0" + ms;
    if(ms.length < 3) ms = "0" + ms;
    
    return `${h}:${m}:${s}.${ms}`;
}

export function toString(value: any): string {
    let msg = "";
    
    switch(typeof (value)) {
        case "boolean":
            msg = `§c${value}§r§f`;
            break;
        case "number":
            msg = `§9${value}§r§f`;
            break;
        case "string":
            msg = `§a"${value}§r§a"§r§f`
            break;
        case "object":
            if(value instanceof Error) {
                msg = `§c${value}§r§f`;
                break;
            }
            let txtOpen = !Array.isArray(value) ? "{" : "[";
            let txtClose = !Array.isArray(value) ? "}" : "]";
            msg = `§5${txtOpen}§f\n${propertiesToString(value, 4, 1)}§5${txtClose}§f`;
            break;
        case "undefined":
            msg = `§7undefined§r`;
            break;
        default:
            msg = `§f${value}§r§f`;
    }
    
    return msg;
}

export function propertiesToString(object: Record<string, any>, indent: number = 4, bracketColorType: number = 0, objects: Set<object> = new Set()): string {
    let msg = "";
    let spaces = "";
    for(let i=0; i<indent; i++) spaces += " ";
    
    let properties: string[] = Object.getOwnPropertyNames(object);
    if(Array.isArray(object)) properties = properties.filter((p) => !["length"].includes(p));
    
    for(let i=0; i < properties.length; i++) {
        const prop = properties[i] as any;
        const propData = object[prop];
        
        let comma = properties[i+1] ? "§r§f," : "";
        if(bracketColorType > 3) bracketColorType = 0;
        
        let propTxt = (typeof object == "object" && !Array.isArray(object))
          ? `§e${prop}§r§f: `
          : "";
        
        if(["boolean", "number", "string", "undefined"].includes(typeof propData) || typeof propData != "object") {
            msg += `${spaces}${propTxt}${toString(propData)}${comma}\n`;
        }
        else if(Array.isArray(propData)) {
            if(objects.has(propData)) {
                msg += `${spaces}${propTxt}§b<Circular []>\n`;
                continue;
            }
            
            if(prop != "length") {
                objects.add(propData);
                
                let bracketColor = ["§5", "§9", "§g", "§a"][bracketColorType];
                msg += `${spaces}${propTxt}${bracketColor}[§f\n${propertiesToString(propData, indent+4, bracketColorType+1, objects)}${spaces}${bracketColor}]${comma}\n`;
            }
        }
        else {
            if(objects.has(propData)) {
                msg += `${spaces}${propTxt}§b<Circular ${propData.constructor?.name || propData.name || "anonymous"}>\n`;
                continue;
            }
            
            objects.add(propData);
            
            let bracketColor = ["§5", "§9", "§g", "§a"][bracketColorType];
            msg += `${spaces}§e${propTxt}${bracketColor}{§f\n${propertiesToString(propData, indent+4, bracketColorType+1, objects)}${spaces}${bracketColor}}${comma}\n`;
        }
    }// catch {}
    return msg;
}