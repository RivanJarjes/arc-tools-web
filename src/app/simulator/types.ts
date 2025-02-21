export interface SymbolEntry {
    address: number;
    value?: number;
}

export type MemoryMap = Map<string, SymbolEntry>; 
