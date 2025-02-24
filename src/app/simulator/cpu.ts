import { twosComplementHexToNumber, hexToBinary, 
    unsignedBinaryToNumber, twosComplementBinaryToNumber } from "../utils/helpers";

import { instructionSet } from "./instructions";

export class CPU {
    // 32 general purpose registers (r0-r31)
    private registers: Int32Array;
    
    // Program Counter
    private pc: number;

    // Current Binary Code
    private binaryCode: string[][] = [];
    
    // Condition Code Register
    private ccr: {
        n: boolean, // Negative
        z: boolean, // Zero
        v: boolean, // Overflow
        c: boolean  // Carry
    };
    
    // Main memory (using sparse pages)
    private readonly PAGE_SIZE = 4096; // 4KB pages
    private readonly TOTAL_MEMORY = Math.pow(2, 32); // 4GB address space
    private memoryPages: Map<number, Map<number, string>>;
    
    constructor() {
        // Initialize registers
        this.registers = new Int32Array(32);
        
        // Initialize PC to 0
        this.pc = 0;
        
        // Initialize condition codes
        this.ccr = {
            n: false,
            z: false,
            v: false,
            c: false
        };
        
        // Initialize sparse memory
        this.memoryPages = new Map();
        
        // Initialize special registers
        this.initializeSpecialRegisters();
    }
    
    public clearMemory(): void {
        // Reinitialize memory pages to empty
        this.memoryPages = new Map();
    }
    
    private initializeSpecialRegisters() {
        // r0 is always 0 in (SP)ARC
        this.registers[0] = 0;
    }
    
    private getPageNumber(address: number): number {
        return Math.floor(address / this.PAGE_SIZE);
    }
    
    private getPageOffset(address: number): number {
        return address % this.PAGE_SIZE;
    }
    
    private getOrCreatePage(pageNumber: number): Map<number, string> {
        let page = this.memoryPages.get(pageNumber);
        if (!page) {
            page = new Map();
            this.memoryPages.set(pageNumber, page);
        }
        return page;
    }
    
    // Getter for registers
    public getRegister(index: number): number {
        if (index < 0 || index > 31) {
            throw new Error(`Invalid register index: ${index}`);
        }
        // Convert to unsigned 32-bit integer for hex display
        return this.registers[index] >>> 0;
    }
    
    // Setter for registers
    public setRegister(index: number, value: number): void {
        if (index < 0 || index > 31) {
            throw new Error(`Invalid register index: ${index}`);
        }
        
        // r0 is always 0
        if (index === 0) {
            return; // Don't allow any changes to r0
        }
        
        // Ensure value is treated as a 32-bit integer
        this.registers[index] = value | 0;
    }
    
    // Getter for PC
    public getPC(): number {
        return this.pc;
    }

    public getCCR(): {
        n: boolean,
        z: boolean,
        v: boolean,
        c: boolean
    } {
        return this.ccr;
    }
    
    // Setter for PC
    public setPC(value: number): void {
        if (value % 4 !== 0) {
            throw new Error('PC must be word-aligned (multiple of 4)');
        }
        this.pc = value;
    }
    
    // Memory access methods
    public readMemory(address: number, size: 1 | 2 | 4 = 4): string {
        if (address < 0 || address >= this.TOTAL_MEMORY) {
            throw new Error(`Memory access out of bounds: ${address}`);
        }

        if (address % size !== 0) {
            throw new Error(`Memory access must be aligned to ${size} bytes: ${address}`);
        }
        
        const pageNumber = this.getPageNumber(address);
        const offset = this.getPageOffset(address);
        
        // Check if access crosses page boundary
        if (offset + size > this.PAGE_SIZE) {
            throw new Error(`Memory access crosses page boundary at address: ${address}`);
        }
        
        const page = this.getOrCreatePage(pageNumber);
        const value = page.get(offset) || '00000000';
        
        switch(size) {
            case 1:
                return value.slice(6, 8); // Last 2 chars for 1 byte
            case 2:
                return value.slice(4, 8); // Last 4 chars for 2 bytes
            case 4:
                return value; // All 8 chars for 4 bytes
            default:
                throw new Error(`Invalid memory access size: ${size}`);
        }
    }
    
    public writeMemory(address: number, value: string, size: 1 | 2 | 4 = 4): void {
        if (address < 0 || address >= this.TOTAL_MEMORY) {
            throw new Error(`Memory access out of bounds: ${address}`);
        }

        if (address % size !== 0) {
            throw new Error(`Memory access must be aligned to ${size} bytes: ${address}`);
        }
        
        const pageNumber = this.getPageNumber(address);
        const offset = this.getPageOffset(address);
        
        // Check if access crosses page boundary
        if (offset + size > this.PAGE_SIZE) {
            throw new Error(`Memory access crosses page boundary at address: ${address}`);
        }
        
        const page = this.getOrCreatePage(pageNumber);
        let paddedValue = value.padStart(8, '0');

        // For smaller sizes, we need to preserve the other bytes
        if (size < 4) {
            const existingValue = page.get(offset) || '00000000';
            if (size === 1) {
                // Replace last 2 chars
                paddedValue = existingValue.slice(0, 6) + value.padStart(2, '0');
            } else if (size === 2) {
                // Replace last 4 chars
                paddedValue = existingValue.slice(0, 4) + value.padStart(4, '0');
            }
        }

        page.set(offset, paddedValue);
    }

    public loadBinaryCode(binaryCode: string = ""): void {
        // If no parameter provided, use the last binary code
        if (binaryCode != "") {
            // Split the string by newlines and filter out empty lines
            const lines = binaryCode.split('\n').filter(line => line.trim() !== '');
            // Process each line into a string[][]
            this.binaryCode = lines.map(line => line.split('\t').filter(part => part.trim() !== ''));
        }
        
        // If first line is a single value, it's the PC
        if (this.binaryCode[0].length === 1) {
            this.pc = twosComplementHexToNumber(this.binaryCode[0][0], 32);
            this.binaryCode.shift();
        }

        // Process each instruction line
        for (const line of this.binaryCode) {
            if (line.length !== 2) throw new Error(`Invalid line format: ${line}`);
            const [address, instruction] = line;
            try {
                const addressNum = twosComplementHexToNumber(address, 32);
                this.writeMemory(addressNum, instruction, 4);
            } catch (e) {
                throw new Error(`Error writing memory at address ${address}: ${e}`);
            }
        }
    }

    public interpretInstruction(machWord: string): string[]{
        if (machWord.length !== 8) throw new Error(`Invalid machine word: ${machWord}`);
        if (machWord == "0".repeat(8)) return ["none"]

        const instruction = hexToBinary(machWord, 32);
        if (instruction.length !== 32) throw new Error(`Invalid instruction: ${machWord}`);
        const op_code = instruction.slice(0, 2);

        // halt case
        if (instruction == "1".repeat(32)) return ["halt"];

        switch (op_code) {
            case "00": {
                const op2_code = instruction.slice(7,10);
                if (op2_code == "010") { // BRANCH
                    const cc = instruction.slice(3, 7);
                    // Find the branch instruction that matches this condition code
                    const branch_type = Object.entries(instructionSet)
                        .find(([, instr]) => 
                            instr.op_code === "00" && 
                            instr.op2_code === "010" && 
                            instr.cond_code === cc
                        )?.[0];
                    
                    if (!branch_type) throw new Error(`Unknown branch condition code: ${cc}`);

                    // Get the displacement value (22 bits)
                    const disp_bin = instruction.slice(10, 32);
                    const disp = twosComplementBinaryToNumber(disp_bin);
                    
                    return [branch_type, disp.toString()];
                }else {
                    const dest_reg_binary = instruction.slice(2, 7);
                    const imm_bin = instruction.slice(10, 32);
                    const dest_reg = unsignedBinaryToNumber(dest_reg_binary);
                    const imm = unsignedBinaryToNumber(imm_bin);
                    return ["sethi", imm.toString(), "%r" + dest_reg];
                }
                break;
            }
            case "01": {
                const disp_bin = instruction.slice(2, 32);
                const disp = unsignedBinaryToNumber(disp_bin);
                return ["call", disp.toString()];
            }
            case "10": {
                const op3_code = instruction.slice(7,13);
                const source_reg_1_bin = instruction.slice(13,18);
                const dest_reg_bin = instruction.slice(2,7);  // Fixed: was using wrong slice indices

                const source_reg_1 = unsignedBinaryToNumber(source_reg_1_bin);
                const dest_reg = unsignedBinaryToNumber(dest_reg_bin);

                const i_bool = instruction[18];

                const instruction_type = Object.entries(instructionSet)
                    .find(([, instr]) => 
                        instr.op_code === "10" &&  
                        instr.op3_code === op3_code
                    )?.[0];
                
                if (!instruction_type) throw new Error(`Unknown instruction: ${instruction}`);

                if (i_bool == "0") {
                    const sources_reg2_bin = instruction.slice(27,32);
                    const sources_reg2 = unsignedBinaryToNumber(sources_reg2_bin);
                    return [instruction_type, "%r" + source_reg_1, "%r" + sources_reg2, "%r" + dest_reg];
                } else {
                    const imm_bin = instruction.slice(19,32);
                    const imm = twosComplementBinaryToNumber(imm_bin);
                    return [instruction_type, "%r" + source_reg_1, imm.toString(), "%r" + dest_reg];
                }
            }
            case "11": {
                const op3_code = instruction.slice(7,13);
                const source_reg_1_bin = instruction.slice(13,18);
                const dest_reg_bin = instruction.slice(2,7);  // Fixed: was using wrong slice indices

                const source_reg_1 = unsignedBinaryToNumber(source_reg_1_bin);
                const dest_reg = unsignedBinaryToNumber(dest_reg_bin);

                const i_bool = instruction[18];

                const instruction_type = Object.entries(instructionSet)
                    .find(([, instr]) => 
                        instr.op_code === "11" &&  
                        instr.op3_code === op3_code &&
                        'store_instruction' in instr
                    )?.[0] as keyof typeof instructionSet;
                
                if (!instruction_type) throw new Error(`Unknown instruction: ${instruction}`);
                const instr = instructionSet[instruction_type];

                if (i_bool == "0") {
                    const sources_reg2_bin = instruction.slice(27,32);
                    const sources_reg2 = unsignedBinaryToNumber(sources_reg2_bin);
                    if ('store_instruction' in instr && instr.store_instruction) 
                        return [instruction_type, "%r" + dest_reg, "%r" + source_reg_1, "%r" + sources_reg2];
                    else
                        return [instruction_type, "%r" + source_reg_1, "%r" + sources_reg2, "%r" + dest_reg];
                } else {
                    const imm_bin = instruction.slice(19,32);
                    const imm = twosComplementBinaryToNumber(imm_bin);
                    if ('store_instruction' in instr && instr.store_instruction) 
                        return [instruction_type, "%r" + dest_reg, source_reg_1 != 0 ? "%r" + source_reg_1 : "", 
                            "[" + imm.toString() + "]"].filter(s => s !== "");
                    else 
                        return [instruction_type, source_reg_1 != 0 ? "%r" + source_reg_1 : "",
                            "[" + imm.toString() + "]", "%r" + dest_reg].filter(s => s !== "");
                }
            }
        }
        return ["unknown"];
    }

    public safeReadMemory(address: number): string {
        try {
            return this.readMemory(address);
        } catch {
            // Return zeros if memory doesn't exist or there's an error
            return '00000000';
        }
    }
}
