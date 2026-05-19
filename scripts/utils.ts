import * as mc from "@minecraft/server";

let overworld: mc.Dimension;
mc.world.afterEvents.worldLoad.subscribe(() => {
    overworld = mc.world.getDimension("overworld");
})

export function getSourceFromOrigin(origin: mc.CustomCommandOrigin): mc.Entity | mc.Block | undefined {
    return origin.initiator ?? origin.sourceEntity ?? origin.sourceBlock;
}

export function getDimensionFromOrigin(origin: mc.CustomCommandOrigin): mc.Dimension {
    return getSourceFromOrigin(origin)?.dimension ?? overworld;
}

export function isPlayer(entity: mc.Entity): entity is mc.Player {
    return entity instanceof mc.Player;
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

/*export function getBlockClusterLocations(
    blockIds: string[],
    dimension: mc.Dimension,
    location: mc.Vector3,
    _excludeBlockLocations?: Set<string>
): Set<mc.Vector3> {
    if(!_excludeBlockLocations) _excludeBlockLocations = new Set<string>();
    
    let locations: Set<mc.Vector3> = new Set([ location ]);
    
    _excludeBlockLocations.add(vector3ToKey(location));
    
    for(const relativeLoc of blockClusterRelativeLocations) {
        const loc = {
            x: location.x + relativeLoc.x,
            y: location.y + relativeLoc.y,
            z: location.z + relativeLoc.z
        }
        
        if(_excludeBlockLocations.has(vector3ToKey(loc))) continue;
        
        _excludeBlockLocations.add(vector3ToKey(loc));
        
        const block = dimension.getBlock(loc);
        if(block && blockIds.includes(block.typeId)) {
            locations.add(loc);
            for(const loc1 of getBlockClusterLocations(blockIds, dimension, loc, _excludeBlockLocations)) {
                locations.add(loc1);
            }
        }
    }
    
    return locations;
}*/

/*export function _getBlockClusterLocations(
    blockIds: string[],
    dimension: mc.Dimension,
    location: mc.Vector3,
    _excludeBlockLocations?: Set<string>,
    _data?: { blockCount: number }
): { locations: mc.Vector3[], lastLocation: mc. } {
    if(!_data) _data = { blockCount: 0 };
    
    if(!_excludeBlockLocations) _excludeBlockLocations = new Set<string>();
    
    let locations: Set<mc.Vector3> = new Set([ location ]);
    
    _excludeBlockLocations.add(vector3ToKey(location));
    
    for(const relativeLoc of blockClusterRelativeLocations) {
        const loc = {
            x: location.x + relativeLoc.x,
            y: location.y + relativeLoc.y,
            z: location.z + relativeLoc.z
        }
        
        if(_excludeBlockLocations.has(vector3ToKey(loc))) continue;
        
        _excludeBlockLocations.add(vector3ToKey(loc));
        
        const block = dimension.getBlock(loc);
        if(block && blockIds.includes(block.typeId)) {
            locations.add(loc);
            for(const loc1 of getBlockClusterLocations.(blockIds, dimension, loc, _excludeBlockLocations)) {
                locations.add(loc1);
            }
        }
    }
    
    return locations;
}*/

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

/*export function getBlockClusterLocations(
  blockIds: string[],
  dimension: mc.Dimension,
  start: mc.Vector3,
  _excludeBlockLocations?: Set<string>
): Set<mc.Vector3> {
  // visited: set de chaves "x,y,z"
  const visited = _excludeBlockLocations ?? new Set<string>();

  // chave util
  const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;

  // resultado em chaves (evita criar objetos repetidos)
  const resultKeys = new Set<string>();

  // pilha/stack para DFS (poderia usar queue para BFS)
  const stack: Array<[number, number, number]> = [];
  stack.push([start.x, start.y, start.z]);

  const startKey = keyOf(start.x, start.y, start.z);
  visited.add(startKey);
  resultKeys.add(startKey);

  // pré-converte offsets para uma lista de tuplas [dx,dy,dz] (melhora perf.)
  const rel = blockClusterRelativeLocations.map(r => [r.x, r.y, r.z] as [number, number, number]);

  // proteção contra buscas gigantescas (opcional)
  const MAX_NODES = 10000; // ajuste conforme necessário

  while (stack.length) {
    const [x, y, z] = stack.pop()!;

    // se quiser limite:
    if (resultKeys.size >= MAX_NODES) break;

    for (let i = 0; i < rel.length; i++) {
      const dx = rel[i][0], dy = rel[i][1], dz = rel[i][2];
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const k = keyOf(nx, ny, nz);
      if (visited.has(k)) continue;
      visited.add(k);

      // --- CHECAGEM DO BLOCO ---
      // Opção A (mais rápida, se disponível na sua API): checar o bloco diretamente
      // (muitos servidores/api têm dimension.getBlock, dimension.getBlockType, etc.)
      // Se a sua API expõe algo assim, prefira isso porque evita criar BlockVolume.
      // Exemplo genérico (teste se getBlock existe):
      let isMatch = false;
      const anyGetBlock = (dimension as any).getBlock;
      if (typeof anyGetBlock === "function") {
        try {
          // NOTE: adaptar se a assinatura for diferente na sua API
          const blk = anyGetBlock.call(dimension, { x: nx, y: ny, z: nz });
          // verifique a propriedade correta do bloco (identifier, id, type, etc.)
          const id = blk?.id ?? blk?.type?.id ?? blk?.__identifier__;
          if (id && blockIds.indexOf(id) !== -1) isMatch = true;
        } catch (e) {
          // fallback para containsBlock se getBlock não funcionar (silencioso)
          isMatch = false;
        }
      }

      // Opção B (fallback robusto): usar containsBlock para volume 1x1x1
      if (!isMatch) {
        const vol = new mc.BlockVolume({ x: nx, y: ny, z: nz }, { x: nx, y: ny, z: nz });
        if (dimension.containsBlock(vol, { includeTypes: blockIds })) isMatch = true;
      }

      if (isMatch) {
        resultKeys.add(k);
        stack.push([nx, ny, nz]);
      }
    }
  }

  // converter chaves para Set<mc.Vector3> só no fim
  const result = new Set<mc.Vector3>();
  for (const k of resultKeys) {
    const parts = k.split(",");
    result.add({ x: Number(parts[0]), y: Number(parts[1]), z: Number(parts[2]) });
  }

  return result;
}*/

export function euclideanDistance(locationA: mc.Vector3, locationB: mc.Vector3): number {
    const dx = locationA.x - locationB.x;
    const dy = locationA.y - locationB.y;
    const dz = locationA.z - locationB.z;
    return Math.hypot(dx, dy, dz);
}