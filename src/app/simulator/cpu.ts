import { clear } from "console";
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
    
    // Next Branch Displacement
    private next_branch_disp: number = 0;
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
    
    public setNextBranchDisp(disp: number): void {
        this.next_branch_disp = disp;
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
        return this.registers[index];
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

    public setCCR(ccr: {
        n: boolean | undefined,
        z: boolean | undefined,
        v: boolean | undefined,
        c: boolean | undefined
    }): void {
        if (ccr.n !== undefined) this.ccr.n = ccr.n;
        if (ccr.z !== undefined) this.ccr.z = ccr.z;
        if (ccr.v !== undefined) this.ccr.v = ccr.v;
        if (ccr.c !== undefined) this.ccr.c = ccr.c;
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
        
        const last_word = Math.floor(address / 4) * 4;
        const pageNumber = this.getPageNumber(last_word);
        const offset = this.getPageOffset(last_word);
        
        // Check if access crosses page boundary
        if (offset + size > this.PAGE_SIZE) {
            throw new Error(`Memory access crosses page boundary at address: ${address}`);
        }
        
        const page = this.getOrCreatePage(pageNumber);
        const value = page.get(offset) || '00000000';
        
        switch(size) {
            case 1:
                return value.slice((address-last_word)*2, (address-last_word)*2 + 2); // Any 2 chars for 1 byte
            case 2:
                return value.slice((address-last_word)*2, (address-last_word)*2 + 4); // Any 4 chars for 2 bytes
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
        
        const last_word = Math.floor(address / 4) * 4;
        const pageNumber = this.getPageNumber(last_word);
        const offset = this.getPageOffset(last_word);
        
        // Check if access crosses page boundary
        if (offset + size > this.PAGE_SIZE) {
            throw new Error(`Memory access crosses page boundary at address: ${address}`);
        }
        
        const page = this.getOrCreatePage(pageNumber);
        let paddedValue = value.padStart(8, '0');

        // For smaller sizes, we need to preserve the other bytes
        if (size < 4) {
            const existingValue = page.get(offset) || '00000000';
            const word_diff = (address - last_word)*2;
            if (size === 1) {
                // Replace last 2 chars
                console.log(word_diff);
                paddedValue = (word_diff != 0 ? existingValue.slice(0, word_diff) : "") + value + (word_diff != 6 ? existingValue.slice(word_diff + 2) : "");
            } else if (size === 2) {
                // Replace last 4 chars
                paddedValue = (word_diff != 0 ? existingValue.slice(0, word_diff) : "") + value + (word_diff != 4 ? existingValue.slice(word_diff + 4) : "");
            }
        }

        page.set(offset, paddedValue);
    }

    public loadBinaryCode(binaryCode: string = ""): void {
        this.clearMemory();

        for (let i = 0; i < 32; i++) {
            this.registers[i] = 0;
        }

        // If no parameter provided, use the last binary code
        if (binaryCode != "") {
            // Split the string by newlines and filter out empty lines
            const lines = binaryCode.split('\n').filter(line => line.trim() !== '');
            // Process each line into a string[][]
            this.binaryCode = lines.map(line => line.split('\t').filter(part => part.trim() !== ''));
        }
        
        const editedBinaryCode: string[][] = this.binaryCode.map(line => [...line]);
        // If first line is a single value, it's the PC
        if (editedBinaryCode[0].length === 1) {
            this.pc = twosComplementHexToNumber(editedBinaryCode[0][0], 32);
            editedBinaryCode.shift();
        }

        // Process each instruction line
        for (const line of editedBinaryCode) {
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
        if (machWord == "0".repeat(8)) return ["nop"];

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
                const disp = twosComplementBinaryToNumber(disp_bin);
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
                
                if (!instruction_type) return [twosComplementHexToNumber(machWord, 32).toString()];

                if (i_bool == "0") {
                    const sources_reg2_bin = instruction.slice(27,32);
                    const sources_reg2 = unsignedBinaryToNumber(sources_reg2_bin);
                    return [instruction_type, "%r" + source_reg_1, "%r" + sources_reg2, "%r" + dest_reg];
                } else {
                    const imm_bin = instruction.slice(19,32);
                    let imm = twosComplementBinaryToNumber(imm_bin);
                    if (instruction_type == "sra" || instruction_type == "srl" || instruction_type == "sll") {
                        if (imm > 31) 
                            imm = imm % 32;
                        else if (imm < 0)
                            imm = 32 - (Math.abs(imm) % 32);
                    }
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
                
                if (!instruction_type) return [twosComplementHexToNumber(machWord, 32).toString()];
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
        return [twosComplementHexToNumber(machWord, 32).toString()];
    }

    public executeInstruction(): void {
        const instruction = this.safeReadMemory(this.pc);
        const decoded_instruction = this.interpretInstruction(instruction);
        const old_pc = this.pc;
        this.pc += 4;

        if (instruction === "0".repeat(8)) return;

        const instruction_def = instructionSet[decoded_instruction[0] as keyof typeof instructionSet];
        try {
            if ('execute' in instruction_def) {
                instruction_def.execute(this, decoded_instruction);
            }
        } catch (e) {
            console.error(`_${e instanceof Error ? e.message : 'Unknown error'}`);
            throw e;
        }

        if (this.next_branch_disp != 0) {
            this.pc = old_pc + this.next_branch_disp;
            this.next_branch_disp = 0;
        }
    }

    public safeReadMemory(address: number, size: 1 | 2 | 4 = 4): string {
        try {
            return this.readMemory(address, size);
        } catch {
            // Return zeros if memory doesn't exist or there's an error
            return size === 4 ? '00000000' : (size === 2 ? '0000' : '00');
        }
    }
}
