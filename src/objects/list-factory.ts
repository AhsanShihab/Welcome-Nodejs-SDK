import { APICaller } from "../modules/api-caller";
import { ListData } from "./base-list-data";
import { PaginatedResponse } from "./common/types";
import { ResourceCtor } from "./resource";

// Factory that produces a `ListData` subclass whose `data` array holds
// instances of `ItemCtor`. Replaces the boilerplate per-list file
// (folder-list.ts, custom-field-list.ts, task-asset-list.ts, etc.):
//
//     class FooList extends ListData { data: Foo[]; constructor(...) {...} }
//
// with a single line:
//
//     export const FooList = createListClass(Foo);
//
// Each item is instantiated with `(data, apiCaller, tokenGetParam)` — the
// standardized Resource constructor signature.
export interface ListClass<Item> {
  new (
    data: PaginatedResponse & { data: unknown[] },
    apiCaller: APICaller,
    tokenGetParam?: unknown
  ): ListData & { data: Item[] };
}

export function createListClass<Item>(
  ItemCtor: ResourceCtor<Item>
): ListClass<Item> {
  return class extends ListData {
    data: Item[];
    constructor(
      data: PaginatedResponse & { data: unknown[] },
      apiCaller: APICaller,
      tokenGetParam?: unknown
    ) {
      super(data, apiCaller, tokenGetParam);
      this.data = data.data.map(
        (item) => new ItemCtor(item, apiCaller, tokenGetParam)
      );
    }
  };
}
