/**
 * Placeholder hasta correr `supabase gen types typescript`.
 * Tras aplicar la migración, reemplazar este archivo con la salida real.
 *
 * Mientras tanto, definimos `Tables` como un mapping genérico para que las
 * queries no exploten a nivel de tipos.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type GenericTableMap = {
  [key: string]: GenericTable;
};

export interface Database {
  public: {
    Tables: GenericTableMap;
    Views: GenericTableMap;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
