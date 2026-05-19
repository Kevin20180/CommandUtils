import * as mc from "@minecraft/server";
import {
    CommandRegister,
    type CommandParameter, 
    getDimensionFromOrigin,
    isPlayer,
    getViewDirectionFromTo,
    getSourceFromOrigin,
    getBlockClusterLocations,
    euclideanDistance
} from ".";

export const commandRegister = new CommandRegister("cmdutils", true, mc.CommandPermissionLevel.GameDirectors);

// Parametros
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

// Comandos

// comando /explode
commandRegister.registerCommand("explode", {
    description: "Cria uma explosão.",
    parameters: [
        locationParam,
        { name: "radius", type: "Integer" },
        { name: "breaks_blocks", type: "Boolean" },
        { name: "causes_fire", type: "Boolean", }
    ]
}, (origin, location: mc.Vector3, radius?: number, breaksBlocks?: boolean, causesFire?: boolean) => {
    radius = radius ?? 1;
    if(radius < 0 || radius > 1000) {
        return { status: "Failure", message: "Raio deve ser ou estar entre 0 e 1000." }
    }
    const dimension = getDimensionFromOrigin(origin);
    
    if(!dimension.isChunkLoaded(location)) {
        return { status: "Failure", message: "Impossível explodir fora do mundo." }
    }
    
    mc.system.run(() => {
        dimension.createExplosion(location, radius ?? 1, { breaksBlocks, causesFire });
    })
    
    return "Explosão criada com êxito.";
})

// comando /spreadentities
commandRegister.registerCommand("spreadentities", {
    description: "Espalha entidades em uma área.",
    parameters: [
        entitySelectorParam,
        locationParam,
        { name: "horizontal_radius", type: "Integer", mandatory: true },
        { name: "vertical_radius", type: "Integer" }
    ]
}, (origin, entities: mc.Entity[], location: mc.Vector3, horizontalRadius: number, verticalRadius?: number) => {
    const dimension = getDimensionFromOrigin(origin);
    
    mc.system.run(() => {
        for(const entity of entities) {
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

// comando /nametag
/*let nameTagOptions = ["query", "set"];
commandRegister.registerEnum("name_tag_option", nameTagOptions);

commandRegister.registerCommand("nametag", {
    description: "Gerencia name tag de entidades.",
    parameters: [
        { enumName: "name_tag_option", mandatory: true },
        entitySelectorParam,
        { name: "name_tag", type: mc.CustomCommandParamType.String }
    ]
}, (_, option: string, entities: mc.Entity[], nameTag?: string) => {
    switch(option) {
        case "query":
            let message = "";
            
            for(const entity of entities) {
                message += entity.nameTag + "§r§f, ";
            }
            
            message = message.slice(0, -2);
            return message;
            break;
        case "set":
            if(!nameTag) return true;
            
            mc.system.run(() => {
                for(const entity of entities) {
                    try { entity.nameTag = nameTag }
                    catch {}
                }
            })
            break;
        default:
            return { status: mc.CustomCommandStatus.Failure, message: "Opção inválida: " + option }
    }
})*/

// comando /setnametag
commandRegister.registerCommand("setnametag", {
    description: "Define uma name tag para entidades.",
    parameters: [
        entitySelectorParam,
        { name: "name_tag", type: "String", mandatory: true }
    ]
}, (_, entities: mc.Entity[], nameTag?: string) => {
    mc.system.run(() => {
        for(const entity of entities) {
            let name = nameTag
             ?? (isPlayer(entity) ? entity.name : "")
            
            try { entity.nameTag = name  }
            catch {}
        }
    })
    
    return "Name tag definida com êxito.";
})

// comando /setselectedslot
commandRegister.registerCommand("setselectedslot", {
    description: "Define o slot selecionado na hotbar de jogadores.",
    parameters: [
        playerSelectorParam,
        { name: "slot_index", type: "Integer" }
    ]
}, (_, players: mc.Player[], slotIndex: number) => {
    if(slotIndex < 0 || slotIndex > 8) {
        return { status: "Failure", message: "Índice do slot deve ser ou estar entre 0 e 8." }
    }
    
    mc.system.run(() => {
        for(const player of players) {
            player.selectedSlotIndex = slotIndex;
        }
    })
    
    return "Índice do slot selecionado atualizado com sucesso.";
})

// comando /knockback
commandRegister.registerCommand("knockback", {
    description: "Aplica uma repulsão em entidades.",
    parameters: [
        entitySelectorParam,
        { ...locationParam, name: "force" },
        { ...locationParam, mandatory: false }
    ]
}, (_, entities: mc.Entity[], force: mc.Vector3, location?: mc.Vector3) => {
    mc.system.run(() => {
        for(const entity of entities) {
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

// comando /setonfire
commandRegister.registerCommand("setonfire", {
    description: "Incendiar entidades.",
    parameters: [
        entitySelectorParam,
        { name: "seconds", type: "Integer", mandatory: true },
        { name: "use_effects", type: "Boolean" }
    ]
}, (_, entities: mc.Entity[], seconds: number, useEffects?: boolean) => {
    mc.system.run(() => {
        for(const entity of entities) {
            entity.setOnFire(seconds, useEffects);
        }
    })
    
    return "Entidades incendiadas com sucesso."
})

// comando /extinguishfire
commandRegister.registerCommand("extinguishfire", {
    description: "Apaga fogo de entidades.",
    parameters: [
        entitySelectorParam,
        { name: "use_effects", type: "Boolean" }
    ]
}, (_, entities: mc.Entity[], useEffects?: boolean) => {
    mc.system.run(() => {
        for(const entity of entities) {
            entity.extinguishFire(useEffects);
        }
    })
    
    if(entities.length > 1) {
        return "Fogo apagado com sucesso para " + entities.length + " entidades.";
    }
    return "Fogo apagado com sucesso.";
})

// comando /showparticle
commandRegister.registerCommand("spawnparticle", {
    description: "Gera partículas vistas apenas aos jogadores especificados.",
    parameters: [
        playerSelectorParam,
        { name: "particle_id", type: "String", mandatory: true },
        { ...locationParam, mandatory: false }
    ]
}, (origin, players: mc.Player[], particleId: string, location?: mc.Vector3) => {
    if(!location) {
        const source = getSourceFromOrigin(origin);
        location = source ? source.location : { x: 0, y: 0, z: 0 }
    }
    
    mc.system.run(() => {
        for(const player of players) {
            player.spawnParticle(particleId, location);
        }
    })
    
    if(players.length > 1) {
        return "Partícula gerada com sucesso para " + players.length + " jogadores.";
    }
    return "Partícula gerada com sucesso.";
})

// comando /tame
commandRegister.registerCommand("tame", {
    description: "Domar entidades.",
    parameters: [ entitySelectorParam ]
}, (origin, entities: mc.Entity[]) => {
    const source = getSourceFromOrigin(origin);
    if(!(source instanceof mc.Player)) {
        return { status: "Failure", message: "Este comando só pode ser executado por um jogador." }
    }
    
    let availableTameComps: (mc.EntityTameMountComponent | mc.EntityTameableComponent)[] = [];
    for(const entity of entities) {
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

// comando /removeentity
commandRegister.registerCommand("removeentity", {
    description: "Remove entidades.",
    parameters: [ entitySelectorParam ]
}, (origin, entities: mc.Entity[]) => {
    entities = entities.filter(e => e);
    const source = getSourceFromOrigin(origin);
    if(source instanceof mc.Player) {
        let message = "";
        
        for(const entity of entities) {
            message += `%${entity.localizationKey}§r, `;
        }
        message = message.slice(0, -2);
        message += " removido(a).";
        
        source.sendMessage(message);
    }
    
    mc.system.run(() => {
        for(const entity of entities) {
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

// comando /fillcluster
commandRegister.registerCommand("fillcluster", {
    description: "Preenche um aglomerado de blocos por um bloco específico.",
    parameters: [
        locationParam,
        { name: "block", type: "BlockType", mandatory: true }
    ]
}, (origin, location: mc.Vector3, blockType: mc.BlockType) => {
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
    
    let ms = Date.now();
    const blockLocations = getBlockClusterLocations([block.typeId], dimension, location);
    mc.world.sendMessage(`Blocos obtidos em ${Date.now() - ms} ms`);
    ms = Date.now();
    for(const loc of blockLocations) {
        if(!dimension.isChunkLoaded(loc)) {
            return { status: "Failure", message: "%commands.fill.outOfWorld" }
        }
    }
    mc.world.sendMessage(`Verificado em ${Date.now() - ms} ms`);
    
    mc.system.run(() => {
        ms = Date.now();
        const blockPermutation = mc.BlockPermutation.resolve(blockType.id);
        for(const loc of blockLocations) {
            dimension.setBlockPermutation(loc, blockPermutation);
        }
        mc.world.sendMessage(`Preenchido em ${Date.now() - ms} ms`);
    })
    
    return blockLocations.size + " blocos preenchidos.";
})

// comando /sethealth
commandRegister.registerCommand("sethealth", {
    description: "Definir vida de entidades.",
    parameters: [
        entitySelectorParam,
        { name: "health", type: "Integer", mandatory: true }
    ]
}, (origin, entities: mc.Entity[], health: number) => {
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

// comando /leash
commandRegister.registerCommand("leash", {
    description: "Laça entidades em uma entidade.",
    parameters: [
        { ...entitySelectorParam, name: "targets" },
        { ...entitySelectorParam, name: "source" }
    ]
}, (_, targets: mc.Entity[], sources: mc.Entity[]) => {
    if(sources.length > 1) {
        return { status: "Failure", message: "Apenas uma entidade de origem deve ser selecionada." }
    }
    
    const source = sources[0];
    if(!source) {
        return { status: "Failure", message: "Deve ter pelo menos uma entidade origem." }
    }
    
    const sourceLocation = source.location;
    const leashableComps: mc.EntityLeashableComponent[] = [];
    
    for(const entity of targets) {
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
        return { status: "Failure", message: "Nenhuma entidade laçada." }
    }
    return "Entidades laçadas.";
})

// comando /unleash
commandRegister.registerCommand("unleash", {
    description: "Remove laço de entidades.",
    parameters: [ entitySelectorParam ]
}, (_, entities: mc.Entity[]) => {
    const leashableComps: mc.EntityLeashableComponent[] = [];
    
    for(const entity of entities) {
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
        return { status: "Failure", message: "Nenhuma entidade deslaçada." }
    }
    return "Laço removido.";
})