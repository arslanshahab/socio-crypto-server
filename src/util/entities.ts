import { OnSerialize, serialize } from "@tsed/json-mapper";
import { Property, Required, Generics, CollectionOf } from "@tsed/schema";

// @tsed/json-mapper isn't able to process generics for serialization
// so this hack keeps generics data for serialization
const serializationMap = new WeakMap<any, any>();

@Generics("T")
export class SuccessResult<T> {
    @Required() @Property() public success: boolean;
    @OnSerialize((v) => serialize(v, { type: serializationMap.get(v) }))
    @Property("T")
    public data: T;

    public constructor(data: T, clazz: { new (...args: any[]): T }) {
        this.success = true;
        this.data = data;
        serializationMap.set(data, clazz);
    }
}

@Generics("T")
export class SuccessArrayResult<T> {
    @Required() @Property() public success: boolean;
    @OnSerialize((v) => serialize(v, { type: serializationMap.get(v) }))
    @Property("T")
    public data: T[];

    public constructor(data: T[], clazz: { new (...args: any[]): T }) {
        this.success = true;
        this.data = data;
        serializationMap.set(data, clazz);
    }
}

@Generics("T")
export class Pagination<T> {
    @OnSerialize((v) => serialize(v, { type: serializationMap.get(v) }))
    @CollectionOf("T")
    public items: T[];
    @Property() public total: number;

    public constructor(items: T[], total: number, clazz: { new (...args: any[]): T }) {
        this.items = items;
        this.total = total;
        serializationMap.set(items, clazz);
    }
}

export class PaginatedVariablesModel {
    @Required() public readonly skip: number;
    @Required() public readonly take: number;
    @Property() public readonly filter: string;
}
