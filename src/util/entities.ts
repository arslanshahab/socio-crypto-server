import { Property, Required, Generics, CollectionOf } from "@tsed/schema";

@Generics("T")
export class SuccessResult<T> {
    @Required() @Property() public success: boolean;
    @Property("T") public data: T;
    public constructor(data: T) {
        this.success = true;
        this.data = data;
    }
}

@Generics("T")
export class Pagination<T> {
    @CollectionOf("T") public items: T[];
    @Property() public total: number;
    public constructor(items: T[], total: number) {
        this.items = items;
        this.total = total;
    }
}
