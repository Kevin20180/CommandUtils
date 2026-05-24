import { system } from "@minecraft/server";

export class CacheManager {
	readonly options: CacheManagerOptions;
	readonly _cachedDataById: Map<string, CachedData>;

	constructor(options: CacheManagerOptions) {
		this.options = options;
		this._cachedDataById = new Map();
	}

	get(id: string): CachedData | undefined {
		let cachedData = this._cachedDataById.get(id);
		if(cachedData) cachedData.duration = this.options.defaultDataDuration;
		return cachedData;
	}

	set<T = any>(id: string, data: T, duration?: number): CachedData {
		let cachedData = this._cachedDataById.get(id);
		if(!cachedData) {
			cachedData = new CachedData(this, id, data, duration ?? this.options.defaultDataDuration);
			this._cachedDataById.set(id, cachedData);
		}

		cachedData.data = data;
		return cachedData;
	}
}

export class CachedData<T = any> {
	readonly manager: CacheManager;
	readonly id: string;
	data: T;
	duration: number;

	constructor(manager: CacheManager, id: string, data: T, duration: number) {
		this.manager = manager;
		this.id = id;
		this.data = data;
		this.duration = duration;
	}

	keep() {
		this.duration = this.manager.options.defaultDataDuration;
	}
}

export interface CacheManagerOptions {
	defaultDataDuration: number
}

export const cacheManager = new CacheManager({ defaultDataDuration: 10 });

system.runInterval(() => {
	for(const cachedData of cacheManager._cachedDataById.values()) {
		cachedData.duration--;
		if(cachedData.duration < 0) {
			cacheManager._cachedDataById.delete(cachedData.id);
		}
	}
}, 20)