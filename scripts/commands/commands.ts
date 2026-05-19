import * as mc from "@minecraft/server";
import {
    type CommandParameter,
    CommandRegister,
    getDimensionFromOrigin,
    getViewDirectionFromTo,
    getSourceFromOrigin,
    getBlockClusterLocations,
    euclideanDistance,

    isEntity,
    isPlayer,
    isVector3,
    
    error
} from ".";
import {
    locationParam,
    entitySelectorParam,
    playerSelectorParam
} from "./params";

export const commandRegister = new CommandRegister("cmdutils", true, mc.CommandPermissionLevel.GameDirectors);

// command /explode
commandRegister.registerCommand("explode", {
    description: "Cria uma explosão.",
    parameters: [
        locationParam,
        { name: "radius", type: "Integer" },
        { name: "breaks_blocks", type: "Boolean" },
        { name: "causes_fire", type: "Boolean", }
    ]
}, (origin, location: mc.Vector3, radius?: number, breaksBlocks?: boolean, causesFire?: boolean) => {
    if(!isVector3(location)) return error("Invalid 'location' param.");
    if(radius != undefined && typeof radius !== "number") return error("Invalid 'radius' param.");
    
    radius = radius ?? 1;
    if(radius < 0 || radius > 1000) {
        return error("Raio deve ser ou estar entre 0 e 1000.");
    }
    const dimension = getDimensionFromOrigin(origin);
    
    if(!dimension.isChunkLoaded(location)) {
        return error("Impossível criar explosão fora do mundo.");
    }
    
    mc.system.run(() => {
        dimension.createExplosion(location, radius ?? 1, { breaksBlocks, causesFire });
    })
    
    return "Explosão criada com êxito.";
})

// command /spreadentities
commandRegister.registerCommand("spreadentities", {
    description: "Espalha entidades em uma área.",
    parameters: [
        entitySelectorParam,
        locationParam,
        { name: "horizontal_radius", type: "Integer", mandatory: true },
        { name: "vertical_radius", type: "Integer" }
    ]
}, (origin, entities: mc.Entity[], location: mc.Vector3, horizontalRadius: number, verticalRadius?: number) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    if(!isVector3(location)) return error("Invalid 'location' param.");
    if(typeof horizontalRadius !== "number") return error("Invalid 'horizontalRadius' param.");
    if(verticalRadius != undefined && typeof verticalRadius !== "number") return error("Invalid 'verticalRadius' param.");

    const dimension = getDimensionFromOrigin(origin);
    
    mc.system.run(() => {
        for(const entity of entities) {
            if(!isEntity(entity)) continue;

            const rloc = {
                x: location.x + Math.random() * (horizontalRadius * 2) - horizontalRadius,
                y: location.y + Math.random() * (verticalRadius ?? 1),
                z: location.z + Math.random() * (horizontalRadius * 2) - horizontalRadius,
            }

            entity.teleport(rloc, { dimension });
        }
    })
    
    return "Entidades espalhadas com êxito.";
})

// command /setnametag
commandRegister.registerCommand("setnametag", {
    description: "Define uma name tag para entidades.",
    parameters: [
        entitySelectorParam,
        { name: "name_tag", type: "String", mandatory: true }
    ]
}, (_, entities: mc.Entity[], nameTag?: string) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    if(nameTag != undefined && typeof nameTag !== "string") return error("Invalid 'nameTag' param.");
    
    mc.system.run(() => {
        for(const entity of entities) {
            if(!isEntity(entity)) continue;

            let name = nameTag
             ?? (isPlayer(entity) ? entity.name : "")
            
            try { entity.nameTag = name  }
            catch {}
        }
    })
    
    return "Name tag definida com êxito.";
})

// command /setselectedslot
commandRegister.registerCommand("setselectedslot", {
    description: "Define o slot selecionado na hotbar de jogadores.",
    parameters: [
        playerSelectorParam,
        { name: "slot_index", type: "Integer" }
    ]
}, (_, players: mc.Player[], slotIndex: number) => {
    if(!Array.isArray(players)) return error("Invalid 'players' param.");
    if(typeof slotIndex !== "number") return error("Invalid 'slotIndex' param.");
    
    if(slotIndex < 0 || slotIndex > 8) {
        return { status: "Failure", message: "Índice do slot deve ser ou estar entre 0 e 8." }
    }
    
    mc.system.run(() => {
        for(const player of players) {
            if(!isPlayer(player)) continue;
            player.selectedSlotIndex = slotIndex;
        }
    })
    
    return "Índice do slot selecionado atualizado com sucesso.";
})

// command /knockback
commandRegister.registerCommand("knockback", {
    description: "Aplica uma repulsão em entidades.",
    parameters: [
        entitySelectorParam,
        { ...locationParam, name: "force" },
        { ...locationParam, mandatory: false }
    ]
}, (_, entities: mc.Entity[], force: mc.Vector3, location?: mc.Vector3) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    if(!isVector3(force)) return error("Invalid 'force' param.");
    if(location != undefined && !isVector3(location)) return error("Invalid 'location' param.");
    
    mc.system.run(() => {
        for(const entity of entities) {
            if(!isEntity(entity)) continue;
            
            if(!location) {
                entity.applyImpulse(force);
            } else {
                const vd = getViewDirectionFromTo(entity.location, location);
                entity.applyImpulse({
                    x: vd.x * force.x,
                    y: vd.y * force.y,
                    z: vd.z * force.z
                })
            }
        }
    })
    
    return "Repulsão aplicada com sucesso.";
})

// command /setonfire
commandRegister.registerCommand("setonfire", {
    description: "Incendiar entidades.",
    parameters: [
        entitySelectorParam,
        { name: "seconds", type: "Integer", mandatory: true },
        { name: "use_effects", type: "Boolean" }
    ]
}, (_, entities: mc.Entity[], seconds: number, useEffects?: boolean) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    if(typeof seconds !== "number") return error("Invalid 'seconds' param.");
    
    mc.system.run(() => {
        for(const entity of entities) {
            if(!isEntity(entity)) continue;
            entity.setOnFire(seconds, useEffects);
        }
    })
    
    return "Entidades incendiadas com sucesso."
})

// command /extinguishfire
commandRegister.registerCommand("extinguishfire", {
    description: "Apaga fogo de entidades.",
    parameters: [
        entitySelectorParam,
        { name: "use_effects", type: "Boolean" }
    ]
}, (_, entities: mc.Entity[], useEffects?: boolean) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    
    mc.system.run(() => {
        for(const entity of entities) {
            if(!isEntity(entity)) continue;
            entity.extinguishFire(useEffects);
        }
    })
    
    if(entities.length > 1) {
        return "Fogo apagado com sucesso para " + entities.length + " entidades.";
    }
    return "Fogo apagado com sucesso.";
})

// command /showparticle
commandRegister.registerCommand("spawnparticle", {
    description: "Gera partículas vistas apenas aos jogadores especificados.",
    parameters: [
        playerSelectorParam,
        { name: "particle_id", type: "String", mandatory: true },
        { ...locationParam, mandatory: false }
    ]
}, (origin, players: mc.Player[], particleId: string, location?: mc.Vector3) => {
    if(!Array.isArray(players)) return error("Invalid 'players' param.");
    if(typeof particleId !== "string") return error("Invalid 'particle_id' param.");
    if(location != undefined && !isVector3(location)) return error("Invalid 'location' param.");
    
    if(!location) {
        const source = getSourceFromOrigin(origin);
        location = source ? source.location : { x: 0, y: 0, z: 0 }
    }
    
    mc.system.run(() => {
        for(const player of players) {
            if(!isPlayer(player)) continue;
            player.spawnParticle(particleId, location);
        }
    })
    
    if(players.length > 1) {
        return "Partícula gerada com sucesso para " + players.length + " jogadores.";
    }
    return "Partícula gerada com sucesso.";
})

// command /tame
commandRegister.registerCommand("tame", {
    description: "Domar entidades.",
    parameters: [ entitySelectorParam ]
}, (origin, entities: mc.Entity[]) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    
    const source = getSourceFromOrigin(origin);
    if(!(source instanceof mc.Player)) {
        return { status: "Failure", message: "Este comando só pode ser executado por um jogador." }
    }
    
    let availableTameComps: (mc.EntityTameMountComponent | mc.EntityTameableComponent)[] = [];
    for(const entity of entities) {
        if(!isEntity(entity)) continue;
        
        const tameableComp =
            entity.getComponent("minecraft:tamemount") ??
            entity.getComponent("minecraft:tameable");
        
        if(!tameableComp) continue;
        // não incluir no array se caso a entidade já foi domada, para funcionar em read-only mode
        if(tameableComp.isTamed) continue;
        
        availableTameComps.push(tameableComp);
    }
    
    mc.system.run(() => {
        for(const tameableComp of availableTameComps) {
            // domar entidade
            if(tameableComp instanceof mc.EntityTameMountComponent) {
                tameableComp.tameToPlayer(true, source);
            }
            else tameableComp.tame(source);
        }
    })
    
    // se caso mais de 1 entidade não poder ser domada
    if(entities.length - availableTameComps.length > 0) {
        return `${availableTameComps.length} entidades domadas e ${entities.length - availableTameComps.length} não puderam ser domadas.`;
    }
    
    return "Entidades domadas com sucesso.";
})

// command /removeentity
commandRegister.registerCommand("removeentity", {
    description: "Remove entidades.",
    parameters: [ entitySelectorParam ]
}, (origin, entities: mc.Entity[]) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    
    const source = getSourceFromOrigin(origin);
    if(source instanceof mc.Player) {
        let message = "";
        
        for(const entity of entities) {
            if(!isEntity(entity)) continue;
            message += `%${entity.localizationKey}§r, `;
        }
        
        message = message.slice(0, -2);
        message += " removido(a).";
        
        source.sendMessage(message);
    }
    
    mc.system.run(() => {
        for(const entity of entities) {
            if(!isEntity(entity)) continue;
            
            try {
                entity.typeId != "minecraft:player"
                  ? entity.remove()
                  : entity.kill();
            }
            catch {}
        }
    })
    
    return entities.length + " entidades removidas.";
})

// commandd /fillcluster
commandRegister.registerCommand("fillcluster", {
    description: "Preenche um aglomerado de blocos por um bloco específico.",
    parameters: [
        locationParam,
        { name: "block", type: "BlockType", mandatory: true }
    ]
}, (origin, location: mc.Vector3, blockType: mc.BlockType) => {
    if(!isVector3(location)) return error("Invalid 'location' param.");
    if(!(blockType instanceof mc.BlockType)) return error("Invalid 'block' param.");
    
    const dimension = getDimensionFromOrigin(origin);
    const block: mc.Block | undefined = (() => {
        try { return dimension.getBlock(location) }
        catch {}
    })()
    
    if(block == undefined) {
        return { status: "Failure", message: "%commands.fill.outOfWorld" }
    }
    if(block.typeId == "minecraft:air") {
        return { status: "Failure", message: "Blocos alvos não podem ser ar." }
    }
    
    const blockLocations = getBlockClusterLocations([block.typeId], dimension, location);
    
    for(const loc of blockLocations) {
        if(!dimension.isChunkLoaded(loc)) {
            return { status: "Failure", message: "%commands.fill.outOfWorld" }
        }
    }
    
    mc.system.run(() => {
        const blockPermutation = mc.BlockPermutation.resolve(blockType.id);
        for(const loc of blockLocations) {
            dimension.setBlockPermutation(loc, blockPermutation);
        }
    })
    
    return blockLocations.size + " blocos preenchidos.";
})

// command /sethealth
commandRegister.registerCommand("sethealth", {
    description: "Definir vida de entidades.",
    parameters: [
        entitySelectorParam,
        { name: "health", type: "Integer", mandatory: true }
    ]
}, (origin, entities: mc.Entity[], health: number) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    if(typeof health !== "number") return error("Invalid 'health' param.");
    
    let availableHealthComps: mc.EntityHealthComponent[] = [];
    
    for(const entity of entities) {
        const healthComp = entity.getComponent("minecraft:health");
        if(!healthComp) continue;
        
        availableHealthComps.push(healthComp);
    }
    
    mc.system.run(() => {
        for(const healthComp of availableHealthComps) {
            // definir vida
            if(health < healthComp.effectiveMin) health = healthComp.effectiveMin
            else if(health > healthComp.effectiveMax) health = healthComp.effectiveMax;
            
            try { healthComp.setCurrentValue(health) }
            catch {}
        }
    })
    
    // se caso mais de 1 entidade não poder definir vida
    if(entities.length - availableHealthComps.length > 0) {
        return `Vida definida para ${availableHealthComps.length} entidades e ${entities.length - availableHealthComps.length} não puderam ser afetadas.`;
    } else if(entities.length == 0) {
        return { status: "Failure", message: "%commands.generic.noTargetMatch" }
    }
    
    return "Vida definida.";
})

// command /leash
commandRegister.registerCommand("leash", {
    description: "Laça entidades em uma entidade.",
    parameters: [
        { ...entitySelectorParam, name: "targets" },
        { ...entitySelectorParam, name: "source" }
    ]
}, (_, targets: mc.Entity[], sources: mc.Entity[]) => {
    if(!Array.isArray(targets)) return error("Invalid 'targets' param.");
    if(!Array.isArray(sources)) return error("Invalid 'source' param.");
    
    if(sources.length > 1) {
        return error("Apenas uma entidade de origem deve ser selecionada.");
    }
    
    const source = sources[0];
    if(!source) {
        return error("Deve ter pelo menos uma entidade origem.");
    }
    if(sources.length > 1) {
        return error("Deve ter apenas uma entidade origem.");
    }
    
    const sourceLocation = source.location;
    const leashableComps: mc.EntityLeashableComponent[] = [];
    
    for(const entity of targets) {
        if(!isEntity(entity)) continue;
        
        const leashableComp = entity.getComponent("minecraft:leashable");
        if(!leashableComp) continue;
        
        const distance = euclideanDistance(sourceLocation, entity.location);
        if(distance + 1 > leashableComp.maxDistance) continue;
        
        leashableComps.push(leashableComp);
    }
    
    mc.system.run(() => {
        for(const leashableComp of leashableComps) {
            leashableComp.leashTo(source);
        }
    })
    
    if(targets.length - leashableComps.length > 0) {
        return `${leashableComps.length} entidades laçadas e ${targets.length - leashableComps.length} não puderam ser laçadas.`;
    }
    else if(targets.length == 0) {
        return error("Nenhuma entidade laçada.");
    }
    return "Entidades laçadas.";
})

// command /unleash
commandRegister.registerCommand("unleash", {
    description: "Remove laço de entidades.",
    parameters: [ entitySelectorParam ]
}, (_, entities: mc.Entity[]) => {
    if(!Array.isArray(entities)) return error("Invalid 'entities' param.");
    
    const leashableComps: mc.EntityLeashableComponent[] = [];
    
    for(const entity of entities) {
        if(!isEntity(entity)) continue;
        
        const leashableComp = entity.getComponent("minecraft:leashable");
        if(!leashableComp) continue;
        
        leashableComps.push(leashableComp);
    }
    
    mc.system.run(() => {
        for(const leashableComp of leashableComps) {
            leashableComp.unleash();
        }
    })
    
    if(entities.length - leashableComps.length > 0) {
        return `${leashableComps.length} entidades deslaçadas e ${entities.length - leashableComps.length} não puderam ser deslaçadas.`;
    }
    else if(entities.length == 0) {
        return error("Nenhuma entidade deslaçada.");
    }
    return "Laço removido.";
})