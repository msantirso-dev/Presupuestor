import { SourceKind } from "@prisma/client";
import type { CatalogSourceAdapter, RawGrid } from "./types";

/** Placeholder para futuras APIs REST por proveedor. */
export class ApiStubAdapter implements CatalogSourceAdapter {
  readonly kind = SourceKind.API_STUB;

  async loadGrid(): Promise<RawGrid> {
    return { headers: [], rows: [] };
  }
}
