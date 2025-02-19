// First, define the SymbolEntry interface
export interface SymbolEntry {
    address: number;
    value?: number;
}

// Then update the MemoryMap type
export type MemoryMap = Map<string, SymbolEntry>; 
