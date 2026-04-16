import type { SourceKind } from "@prisma/client";

export type SourceConfig = Record<string, unknown>;

export type RawGrid = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Contrato común para traer una grilla tabular desde cualquier fuente.
 * Cada implementación encapsula detalles (Excel, CSV público, API, etc.).
 */
export interface CatalogSourceAdapter {
  readonly kind: SourceKind;
  /**
   * Devuelve encabezados + filas como strings planos para mapear a campos estándar.
   */
  loadGrid(input: {
    config: SourceConfig;
    file?: { buffer: Buffer; name: string; mime: string };
  }): Promise<RawGrid>;
}
