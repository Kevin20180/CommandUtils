import * as mc from "@minecraft/server";
import { cacheManager } from "./cacheManager";

export class JsonParser<T = any> {
	readonly id: string;
	readonly parserFn: (data: JsonDataTypes) => T;

	constructor(id: string, parserFn: (data: JsonDataTypes) => T) {
		this.id = id;
		this.parserFn = parserFn;
	}

	parse(rawData: string): T {
		let id = this.id + rawData;

		let cachedData = cacheManager.get(id);
		if(cachedData) {
			if(cachedData.data instanceof Error) throw cachedData.data
			else return cachedData.data;
		}

		let data: JsonDataTypes;
		try {
			data = JSON.parse(rawData);
		} catch(e) {
			cacheManager.set(id, e);
			throw e;
		}

		try {
			let res = this.parserFn(data);
			cacheManager.set(id, res);
			return res;
		} catch(e) {
			cacheManager.set(id, e);
			throw e;
		}
	}
}

export type JsonDataTypes =
  | string
  | number
  | boolean
  | null
  | Record<string, any>