type MemoryMap = Map<string, number>;
/*  op_code:
        "00" - SETHI / BRANCH
        "01" - CALL
        "10" - ALU
        "11" - MEMORY
*/

/*
    BRANCH BINARY CODE STRUCTURE:
    000CCCC010DDDDDDDDDDDDDDDDDDDDDD
    C - Condition Code
    D - Displacement from PC
*/

/*
    SETHI BINARY CODE STRUCTURE:
    00RRRRR100IIIIIIIIIIIIIIIIIIIIII
    R - Destination Register
    I - 22-bit Immediate Value
*/

/*
    CALL BINARY CODE STRUCTURE:
    01DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
    D - 30-bit Displacement from PC
*/

/*
    ALU BINARY CODE STRUCTURE:
    Structure 1:
    10DDDDDOOOOOORRRRR000000000SSSSS
    D - Destination Register
    O - op3_code
    R - Source Register 1
    S - Source Register 2

    Structure 2:
    10DDDDDOOOOOORRRRR1SSSSSSSSSSSSS
    D - Destination Register
    O - op3_code
    R - Source Register 1
    S - 13-bit sign extended immediate value
*/

/*
    MEMORY BINARY CODE STRUCTURE:
    Structure 1:
    11DDDDDOOOOOORRRRR000000000SSSSS
    D - Destination Register/Bit-address
    O - op3_code
    R - Source Register 1
    S - Source Register 2

    Structure 2:
    11DDDDDOOOOOORRRRR1SSSSSSSSSSSSS
    D - Destination Register/Bit-address
    O - op3_code
    R - Source Register 1
    S - 13-bit sign extended immediate value
*/

/*
    HALT BINARY CODE STRUCTURE:
    11111111111111111111111111111111
*/

const instructions = {
    /*
        SETHI 
    */
    "sethi": { // Set higher 22 bits 
        op_code: "00",
        op2_code: "100",
        operands: 2
    },
    /*
        BRANCH
    */
    "ba": { // Branch always
        op_code: "00",
        op2_code: "010",
        cond_code: "1000",
        operands: 1
    },
    "bcc": { // Branch if carry clear
        op_code: "00",
        op2_code: "010",
        cond_code: "1101",
        operands: 1
    },
    "bcs": { // Branch if carry set
        op_code: "00",
        op2_code: "010",
        cond_code: "0101",
        operands: 1
    },
    "be": { // Branch if equal
        op_code: "00",
        op2_code: "010",
        cond_code: "0001",
        operands: 1
    },
    "bg": { // Branch if greater
        op_code: "00",
        op2_code: "010",
        cond_code: "1010",
        operands: 1
    },
    "bge": { // Branch if greater than or equal
        op_code: "00",
        op2_code: "010",
        cond_code: "1011",
        operands: 1
    },
    "bgu": { // Branch if greater unsigned
        op_code: "00",
        op2_code: "010",
        cond_code: "1100",
        operands: 1
    },
    "bl": { // Branch if less
        op_code: "00",
        op2_code: "010",
        cond_code: "0011",
        operands: 1
    },
    "ble": { // Branch if less than or equal
        op_code: "00",
        op2_code: "010",
        cond_code: "0010",
        operands: 1
    },
    "bleu": { // Branch if less than or equal to unsigned
        op_code: "00",
        op2_code: "010",
        cond_code: "0100",
        operands: 1
    },
    "bn": { // Branch never
        op_code: "00",
        op2_code: "010",
        cond_code: "0000",
        operands: 1
    },
    "bne": { // Branch if not equal
        op_code: "00",
        op2_code: "010",
        cond_code: "1001",
        operands: 1
    },
    "bneg": { // Branch if negative
        op_code: "00",
        op2_code: "010",
        cond_code: "0110",
        operands: 1
    },
    "bpos": { // Branch if positive
        op_code: "00",
        op2_code: "010",
        cond_code: "1110",
        operands: 1
    },
    "bvc": { // Branch if overflow clear
        op_code: "00",
        op2_code: "010",
        cond_code: "1111",
        operands: 1
    },
    "bvs": { // Branch if overflow set
        op_code: "00",
        op2_code: "010",
        cond_code: "0111",
        operands: 1
    },
    /*
        CALL
    */
    "call": { // Call a subroutine
        op_code: "01",
        operands: 1
    },
    "jmpl": { // Jump and link
        op_code: "01",
        op3_code: "111000",
        operands: 2
    },
    /*
        ALU
    */
    "add": { // Add
        op_code: "10",
        op3_code: "0000000",
        operands: 3
    },
    "addcc": { // Add with condition codes
        op_code: "10",
        op3_code: "0100000",
        operands: 3
    },
    "and": { // AND
        op_code: "10",
        op3_code: "000001",
        operands: 3
    },
    "andcc": { // AND with condition codes
        op_code: "10",
        op3_code: "010001",
        operands: 3
    },
    "andn": { // AND NOT
        op_code: "10",
        op3_code: "000101",
        operands: 3
    },
    "andncc": { // AND NOT with condition codes
        op_code: "10",
        op3_code: "010101",
        operands: 3
    },
    "or": { // OR
        op_code: "10",
        op3_code: "000010",
        operands: 3
    },
    "orcc": { // OR with condition codes
        op_code: "10",
        op3_code: "010010",
        operands: 3
    },
    "orn": { // OR NOT
        op_code: "10",
        op3_code: "000110",
        operands: 3
    },
    "orncc": { // OR NOT with condition codes
        op_code: "10",
        op3_code: "010110",
        operands: 3
    },
    "rett": { // Return from subroutine
        op_code: "10",
        op3_code: "111001",
        operands: 3
    },
    "sll": { // Shift bit left logical
        op_code: "10",
        op3_code: "100101",
        operands: 3
    },
    "sra": { // Shift bit right arithmetic
        op_code: "10",
        op3_code: "100111",
        operands: 3
    },
    "srl": { // Shift bit right logical
        op_code: "10",
        op3_code: "100110",
        operands: 3
    },
    "sub": { // Subtract
        op_code: "10",
        op3_code: "000100",
        operands: 3
    },
    "subcc": { // Subtract with condition codes
        op_code: "10",
        op3_code: "010100",
        operands: 3
    },
    "ta": { // Trap
        op_code: "10",
        op3_code: "111010",
        operands: 1
    },
    "wr": { // Write a value to special registers
        op_code: "10",
        op3_code: "110001",
        operands: 3
    },
    "xnor": { // XOR with NOT
        op_code: "10",
        op3_code: "000111",
        operands: 3
    },
    "xnorcc": { // XNOR with condition codes
        op_code: "10",
        op3_code: "010111",
        operands: 3
    },
    "xor": { // XOR
        op_code: "10",
        op3_code: "000011",
        operands: 3
    },
    "xorcc": { // XOR with condition codes
        op_code: "10",
        op3_code: "010011",
        operands: 3
    },
    /*
        MEMORY
    */
    "ld": { // Load a value
        op_code: "11",
        op3_code: "000000",
        operands: 2
    },
    "ldsb": { // Load a signed byte
        op_code: "11",
        op3_code: "001001",
        operands: 2
    },
    "ldsh": { // Load a signed half-word (2 bytes)
        op_code: "11",
        op3_code: "001010",
        operands: 2
    },
    "ldub": { // Load an unsigned byte
        op_code: "11",
        op3_code: "000001",
        operands: 2
    },
    "lduh": { // Load an unsigned half-word (2 bytes)
        op_code: "11",
        op3_code: "000010",
        operands: 2
    },
    "rd": { // Read a value
        op_code: "11",
        op3_code: "101001",
        operands: 3
    },
    "st": { // Store a value
        op_code: "11",
        op3_code: "000100",
        operands: 2
    },
    "stb": { // Store a byte
        op_code: "11",
        op3_code: "000101",
        operands: 2
    },
    "sth": { // Store a half-word (2 bytes)
        op_code: "11",
        op3_code: "000110",
        operands: 2
    },
    /*
        OTHER
    */
    "halt": { // Halt the program
        op_code: "11",
        op3_code: "111111",
        operands: 0
    }
} as const;

const syntheticInstructions = {
    "not": { // Not a value
        instruction: "xor *1, %r0, *2",
        operands: 2
    },
    "neg": { // Negate a value
        instruction: "sub %r0, *1, *2",
        operands: 2
    },
    "inc": { // Increment a value
        instruction: "add *1, 1, *1",
        operands: 1
    },
    "dec": { // Decrement a value
        instruction: "sub *1, 1, *1",
        operands: 1
    },
    "clr": { // Clear a value
        instruction: "and *1, %r0, *1",
        operands: 1
    },
    "cmp": {
        instruction: "subcc *1, *2, %r0",
        operands: 2
    },
    "tst": { // Test a value
        instruction: "orcc %r0, *1, %r0",
        operands: 1
    },
    "mov": { // Move a value
        instruction: "or %r0, *1, *2",
        operands: 2
    },
    "nop": { // No operation
        instruction: "sethi 0, %r0",
        operands: 0
    }
} as const;

const pseudoOps = {
    "begin": { // Start the program
        operands: 0
    },
    "end": { // End the program
        operands: 0
    },
    "org": { // Set the program counter
        operands: 1
    },
    "dwb": { // Define a word (4 bytes)
        operands: 1
    },
    "if": { // If the condition is true
        operands: 1
    },
    "endif": { // End the if statement
        operands: 0
    }
} as const;

// Add these exports
export type Instruction = keyof typeof instructions;
export type SyntheticInstruction = keyof typeof syntheticInstructions;
export type PseudoOp = keyof typeof pseudoOps;

export { instructions, syntheticInstructions, pseudoOps };

export interface AssemblerOutput {
    machineCode: number[];
    symbolTable: MemoryMap;
}

export function assemble(code: string): AssemblerOutput {
    const lines = code.split("\n");
    const cleanInstructions = lines
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("!")); // Remove empty lines and comments

    // First pass: build symbol table
    const symbolTable = first_pass(cleanInstructions);
    
    // Second pass: generate machine code
    const machineCode = second_pass(cleanInstructions, symbolTable);
    
    return {
        machineCode,
        symbolTable
    };
}

function first_pass(instructions: string[]): MemoryMap {
    const symbolMap: MemoryMap = new Map();
    let pc = 0;
    let currentSection = "";

    for (const instruction of instructions) {
        const tokens = tokenize(instruction);
        if (!tokens.length) continue;

        // Handle labels
        if (tokens[0].endsWith(":")) {
            const label = tokens[0].slice(0, -1);
            symbolMap.set(label, pc);
            tokens.shift(); // Remove label from tokens
        }

        // Handle pseudo-ops
        if (tokens[0] in pseudoOps) {
            switch (tokens[0]) {
                case "org":
                    pc = parseInt(tokens[1]);
                    continue;
                case "begin":
                    currentSection = "text";
                    continue;
                case "end":
                    currentSection = "";
                    continue;
            }
        }

        // Only increment PC for actual instructions
        if (tokens.length > 0 && currentSection === "text") {
            pc += 4; // Each instruction is 4 bytes
        }
    }
    return symbolMap;
}

function second_pass(instructions: string[], symbolTable: MemoryMap): number[] {
    const machineCode: number[] = [];
    let pc = 0;

    for (const instruction of instructions) {
        const tokens = tokenize(instruction);
        if (!tokens.length) continue;

        // Skip labels
        if (tokens[0].endsWith(":")) {
            tokens.shift();
            if (!tokens.length) continue;
        }

        // Handle actual instructions
        const opcode = tokens[0].toLowerCase();
        
        if (opcode in instructions) {
            const encoded = encode_instruction(tokens, symbolTable, pc);
            if (encoded !== null) {
                machineCode.push(encoded);
                pc += 4;
            }
        } else if (opcode in syntheticInstructions) {
            const expanded = expand_synthetic(tokens, symbolTable);
            for (const synthetic of expanded) {
                const encoded = encode_instruction(synthetic, symbolTable, pc);
                if (encoded !== null) {
                    machineCode.push(encoded);
                    pc += 4;
                }
            }
        }
    }

    return machineCode;
}

function encode_instruction(tokens: string[], symbolTable: MemoryMap, currentPc: number): number | null {
    if (tokens.length === 0) return null;
    
    const opcode = tokens[0].toLowerCase();
    const instruction = instructions[opcode as Instruction];
    
    if (!instruction) return null;
    
    // For now, return a placeholder value
    // This will be expanded in the next implementation
    return 0;
}

function expand_synthetic(tokens: string[], symbolTable: MemoryMap): string[][] {
    if (tokens.length === 0) return [];
    
    const opcode = tokens[0].toLowerCase();
    const synthetic = syntheticInstructions[opcode as SyntheticInstruction];
    
    if (!synthetic) return [];
    
    // For now, return an empty array
    // This will be expanded in the next implementation
    return [tokens];
}

function tokenize(instruction: string): string[] {
    // Remove comments
    instruction = instruction.split("!")[0].trim();
    // Remove commas and tabs
    instruction = instruction.replace(/[,\t]/g, " ");
    // Split into tokens
    return instruction.split(" ").filter(Boolean);
}


console.log(assemble(".begin\nprog:add %r1, %r2, %r3\n.end"));
