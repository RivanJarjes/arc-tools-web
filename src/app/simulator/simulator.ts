import { CPU } from "./cpu";

export class Simulator {
    private cpu: CPU;
    private breakpoints: Set<number>;

    constructor() {
        this.cpu = new CPU();
        this.breakpoints = new Set();
    }

    public addBreakpoint(address: number): void {
        this.breakpoints.add(address);
        console.log('Breakpoints:', Array.from(this.breakpoints).sort((a, b) => a - b));
    }

    public removeBreakpoint(address: number): void {
        this.breakpoints.delete(address);
        console.log('Breakpoints:', Array.from(this.breakpoints).sort((a, b) => a - b));
    }

    public clearBreakpoints(): void {
        this.breakpoints.clear();
        console.log('Breakpoints:', Array.from(this.breakpoints).sort((a, b) => a - b));
    }

    public hasBreakpoint(address: number): boolean {
        return this.breakpoints.has(address);
    }

    public getBreakpoints(): Set<number> {
        return new Set(this.breakpoints);
    }

    public getCPU(): CPU {
        return this.cpu;
    }
}
