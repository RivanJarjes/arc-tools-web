import { twosComplementHexToNumber, hexToBinary, 
    unsignedBinaryToNumber, twosComplementBinaryToNumber, 
    numberToTwosComplementHex,
    unsignedHexToNumber} from "../utils/helpers";

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
    private memory_pages: Map<number, Map<number, string>>;
    
    // Trap handler
    private trap_base_register: number = -16777216;
    private enable_traps: boolean = false;

    // Console handling
    private consoleWriteListeners: Array<(char: string) => void> = [];
    private readonly CONSOLE_DATA_ADDRESS = 0xffff0000;
    private readonly CONSOLE_STATUS_ADDRESS = 0xffff0004;
    private readonly CONSOLE_READY_STATUS = "80000000";
    private readonly CONSOLE_BUSY_STATUS = "00000000";
    private consoleStatusCounter: number = 0;

    // Keyboard handling
    private readonly KEYBOARD_DATA_ADDRESS = 0xffff0008;
    private readonly KEYBOARD_STATUS_ADDRESS = 0xffff000C;
    private readonly KEYBOARD_DATA_READY = "80000000";
    private readonly KEYBOARD_DATA_NOT_READY = "00000000";

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
        this.memory_pages = new Map();
        
        // Initialize special registers
        this.initializeSpecialRegisters();

        // Add Terminal Status Memory
        this.writeMemory(this.CONSOLE_STATUS_ADDRESS, this.CONSOLE_READY_STATUS, 4);
    }
    
    public setNextBranchDisp(disp: number): void {
        this.next_branch_disp = disp;
    }

    public clearMemory(): void {
        // Reinitialize memory pages to empty
        this.memory_pages = new Map();
        // Reset console status to ready
        this.writeMemory(this.CONSOLE_STATUS_ADDRESS, this.CONSOLE_READY_STATUS, 4);
        // Reset keyboard status to not ready
        this.writeMemory(this.KEYBOARD_STATUS_ADDRESS, this.KEYBOARD_DATA_NOT_READY, 4);
        // Reset console status counter
        this.consoleStatusCounter = 0;
    }
    
    private initializeSpecialRegisters() {
        // r0 is always 0 in (SP)ARC
        this.registers[0] = 0;
    }
    
    private getPageNumber(address: number): number {
        // Ensure address is treated as unsigned
        const unsignedAddress = address >>> 0;
        return Math.floor(unsignedAddress / this.PAGE_SIZE);
    }
    
    private getPageOffset(address: number): number {
        // Ensure address is treated as unsigned
        const unsignedAddress = address >>> 0;
        return unsignedAddress % this.PAGE_SIZE;
    }
    
    private getOrCreatePage(pageNumber: number): Map<number, string> {
        // Ensure page number is treated as unsigned
        const unsignedPageNumber = pageNumber >>> 0;
        
        let page = this.memory_pages.get(unsignedPageNumber);
        if (!page) {
            page = new Map();
            this.memory_pages.set(unsignedPageNumber, page);
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

    public getTrapBaseRegister(): number {
        return this.trap_base_register;
    }

    public setTrapBaseRegister(value: number): void {
        this.trap_base_register = value;
    }

    public getEnableTraps(): boolean {
        return this.enable_traps;
    }

    public setEnableTraps(value: boolean): void {
        this.enable_traps = value;
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
        // Handle addresses as unsigned 32-bit values
        const unsignedAddress = address >>> 0;

        if (unsignedAddress >= this.TOTAL_MEMORY) {
            throw new Error(`Memory access out of bounds: ${address.toString(16)}`);
        }

        if (unsignedAddress % size !== 0) {
            throw new Error(`Memory access must be aligned to ${size} bytes: ${address.toString(16)}`);
        }
        
        const last_word = Math.floor(unsignedAddress / 4) * 4;
        const pageNumber = this.getPageNumber(last_word);
        const offset = this.getPageOffset(last_word);
        
        // Check if access crosses page boundary
        if (offset + size > this.PAGE_SIZE) {
            throw new Error(`Memory access crosses page boundary at address: ${address.toString(16)}`);
        }
        
        const page = this.getOrCreatePage(pageNumber);
        const value = page.get(offset) || '00000000';
        
        // If reading from keyboard data, reset keyboard status to not ready
        if (unsignedAddress === this.KEYBOARD_DATA_ADDRESS) {
            try {
                // Reset keyboard status to not ready
                const statusPageNumber = this.getPageNumber(this.KEYBOARD_STATUS_ADDRESS);
                const statusOffset = this.getPageOffset(this.KEYBOARD_STATUS_ADDRESS);
                const statusPage = this.getOrCreatePage(statusPageNumber);
                statusPage.set(statusOffset, this.KEYBOARD_DATA_NOT_READY);
            } catch (error) {
                console.error("Error resetting keyboard status:", error);
            }
        }
        
        switch(size) {
            case 1:
                return value.slice((unsignedAddress-last_word)*2, (unsignedAddress-last_word)*2 + 2); // Any 2 chars for 1 byte
            case 2:
                return value.slice((unsignedAddress-last_word)*2, (unsignedAddress-last_word)*2 + 4); // Any 4 chars for 2 bytes
            case 4:
                return value; // All 8 chars for 4 bytes
            default:
                throw new Error(`Invalid memory access size: ${size}`);
        }
    }
    
    public writeMemory(address: number, value: string, size: 1 | 2 | 4 = 4): void {
        // Convert to addressable address if negative
        const new_address = unsignedHexToNumber(numberToTwosComplementHex(address, 32));

        if (new_address < 0 || new_address >= this.TOTAL_MEMORY) {
            throw new Error(`Memory access out of bounds: ${address}`);
        }

        if (new_address % size !== 0) {
            throw new Error(`Memory access must be aligned to ${size} bytes: ${address}`);
        }
        
        const last_word = Math.floor(new_address / 4) * 4;
        const pageNumber = this.getPageNumber(last_word);
        const offset = this.getPageOffset(last_word);
        
        // Check if access crosses page boundary
        if (offset + size > this.PAGE_SIZE) {
            throw new Error(`Memory access crosses page boundary at address: ${new_address}`);
        }
        
        const page = this.getOrCreatePage(pageNumber);
        let paddedValue = value.padStart(8, '0');

        // For smaller sizes, we need to preserve the other bytes
        if (size < 4) {
            const existingValue = page.get(offset) || '00000000';
            const word_diff = (new_address - last_word)*2;

            console.log("address: ", new_address)
            console.log("last_word: ", last_word)
            console.log("word_diff: ", word_diff)
            if (size === 1) {
                // Replace last 2 chars
                console.log(word_diff);
                paddedValue = (word_diff != 0 ? existingValue.slice(0, word_diff) : "") + value + (word_diff != 6 ? existingValue.slice(word_diff + 2) : "");
                console.log("existingValue: ", existingValue)
                console.log("value: ", value)
                console.log("paddedValue: ", paddedValue)
            } else if (size === 2) {
                // Replace last 4 chars
                paddedValue = (word_diff != 0 ? existingValue.slice(0, word_diff) : "") + value + (word_diff != 4 ? existingValue.slice(word_diff + 4) : "");
            }
        }

        page.set(offset, paddedValue);

        // Check if writing to console data address and console is ready
        if (new_address === this.CONSOLE_DATA_ADDRESS) {
            // Read console status
            try {
                const status = this.readMemory(this.CONSOLE_STATUS_ADDRESS, 4);
                if (status === this.CONSOLE_READY_STATUS) {
                    // Extract the first byte (2 hex characters) of the data and convert to ASCII
                    const charCode = parseInt(paddedValue.substring(0, 2), 16);
                    const char = String.fromCharCode(charCode);
                    
                    // Notify listeners with the actual character
                    this.notifyConsoleWrite(char);
                    
                    // Set console status to busy for 8 instruction executions
                    this.consoleStatusCounter = 8;
                    
                    // Update console status register to busy
                    const statusPageNumber = this.getPageNumber(this.CONSOLE_STATUS_ADDRESS);
                    const statusOffset = this.getPageOffset(this.CONSOLE_STATUS_ADDRESS);
                    const statusPage = this.getOrCreatePage(statusPageNumber);
                    statusPage.set(statusOffset, this.CONSOLE_BUSY_STATUS);
                }
            } catch (error) {
                console.error("Error checking console status:", error);
            }
        }
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
                // Convert hex address to unsigned 32-bit integer directly
                // This prevents the twosComplementHexToNumber function from interpreting
                // high addresses (like 0xff000a00) as negative numbers
                let addressHex = address;
                if (addressHex.startsWith('0x')) {
                    addressHex = addressHex.substring(2);
                }
                
                // Parse the hex address as an unsigned integer
                const addressNum = parseInt(addressHex, 16);
                
                // Write to memory using the unsigned address
                this.writeMemory(addressNum, instruction, 4);
            } catch (e) {
                throw new Error(`Error writing memory at address ${address}: ${e}`);
            }
        }
        
        // Make sure console status is ready
        this.writeMemory(this.CONSOLE_STATUS_ADDRESS, this.CONSOLE_READY_STATUS, 4);
        this.consoleStatusCounter = 0;
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

                    if (instruction_type == "wr") 
                        return [instruction_type, "%r" + source_reg_1, "%r" + sources_reg2, "%psr"];
                    else if (instruction_type == "rd")
                        return [instruction_type, "%psr", "%r" + sources_reg2, "%r" + dest_reg];
                    else if (instruction_type == "ta" || instruction_type == "rett")
                        return [instruction_type, "%r" + source_reg_1, "%r" + sources_reg2];

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
                    if (instruction_type == "ta" || instruction_type == "rett")
                        return [instruction_type, "%r" + source_reg_1, imm.toString()];
                    
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
        // Get the instruction
        const instruction = this.safeReadMemory(this.pc);
        const decoded_instruction = this.interpretInstruction(instruction);

        // Check if we need to update console status
        if (this.consoleStatusCounter > 0) {
            this.consoleStatusCounter--;
            
            // If counter reaches zero, set console status back to ready
            if (this.consoleStatusCounter === 0) {
                try {
                    // Update console status without triggering side effects
                    const pageNumber = this.getPageNumber(this.CONSOLE_STATUS_ADDRESS);
                    const offset = this.getPageOffset(this.CONSOLE_STATUS_ADDRESS);
                    const page = this.getOrCreatePage(pageNumber);
                    page.set(offset, this.CONSOLE_READY_STATUS);
                } catch (error) {
                    console.error("Error updating console status:", error);
                }
            }
        }

        if (instruction === "0".repeat(8))  {
            this.pc += 4;
            return;
        }

        // Get the instruction definition
        const instruction_def = instructionSet[decoded_instruction[0] as keyof typeof instructionSet];
        try {
            if ('execute' in instruction_def) {
                instruction_def.execute(this, decoded_instruction);
            }
        } catch (e) {
            console.error(`_${e instanceof Error ? e.message : 'Unknown error'}`);
            this.pc += 4;
            this.next_branch_disp = 0;
            throw e;
        }

        // Update PC
        if (this.next_branch_disp != 0) {
            this.pc += this.next_branch_disp;
            this.next_branch_disp = 0;
        } else { 
            this.pc += 4;
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

    // Debug method to check if a memory address is properly allocated
    public checkMemoryExistence(addressHex: string): boolean {
        let address: number;
        
        // Handle addresses with or without 0x prefix
        if (addressHex.startsWith('0x')) {
            address = parseInt(addressHex.substring(2), 16);
        } else {
            address = parseInt(addressHex, 16);
        }
        
        // Convert to unsigned 32-bit integer 
        const unsignedAddress = address >>> 0;
        
        // Calculate page information
        const last_word = Math.floor(unsignedAddress / 4) * 4;
        const pageNumber = this.getPageNumber(last_word);
        const offset = this.getPageOffset(last_word);
        
        // Check if the page exists
        const page = this.memory_pages.get(pageNumber);
        if (!page) {
            return false;
        }
        
        // Check if the specific memory location exists in the page
        return page.has(offset);
    }

    // Method to add console write listener
    public addConsoleWriteListener(listener: (char: string) => void): void {
        this.consoleWriteListeners.push(listener);
    }

    // Method to remove console write listener
    public removeConsoleWriteListener(listener: (char: string) => void): void {
        this.consoleWriteListeners = this.consoleWriteListeners.filter(l => l !== listener);
    }

    // Method to notify listeners when console data is written
    private notifyConsoleWrite(char: string): void {
        this.consoleWriteListeners.forEach(listener => listener(char));
    }

    // Public getter for console status counter
    public getConsoleStatusCounter(): number {
        return this.consoleStatusCounter;
    }

    // Method to handle keyboard input
    public handleKeyboardInput(char: string): void {
        try {
            // Check if keyboard status indicates it's ready for input
            const status = this.safeReadMemory(this.KEYBOARD_STATUS_ADDRESS, 4);
            if (status === this.KEYBOARD_DATA_NOT_READY) {
                // Get ASCII code of the character
                const charCode = char.charCodeAt(0);
                
                // Convert to hex string and pad to 2 characters
                const hexValue = charCode.toString(16).padStart(2, '0') + '000000';
                
                // Write the character to keyboard data address
                this.writeMemory(this.KEYBOARD_DATA_ADDRESS, hexValue, 4);
                
                // Set keyboard status to data ready
                const statusPageNumber = this.getPageNumber(this.KEYBOARD_STATUS_ADDRESS);
                const statusOffset = this.getPageOffset(this.KEYBOARD_STATUS_ADDRESS);
                const statusPage = this.getOrCreatePage(statusPageNumber);
                statusPage.set(statusOffset, this.KEYBOARD_DATA_READY);
            }
        } catch (error) {
            console.error("Error handling keyboard input:", error);
        }
    }
}
