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

export const instructionSet = {
    /*
        SETHI 
    */
        sethi: {
            // Set higher 22 bits
            op_code: "00",
            op2_code: "100",
            cond_code: "0000",
            operands: 2,
            memory_param: 0,
        },
        /*
            BRANCH
        */
        ba: {
            // Branch always
            op_code: "00",
            op2_code: "010",
            cond_code: "1000",
            operands: 1,
            memory_param: 0,
        },
        bcc: {
            // Branch if carry clear
            op_code: "00",
            op2_code: "010",
            cond_code: "1101",
            operands: 1,
            memory_param: 0,
        },
        bcs: {
            // Branch if carry set
            op_code: "00",
            op2_code: "010",
            cond_code: "0101",
            operands: 1,
            memory_param: 0,
        },
        be: {
            // Branch if equal
            op_code: "00",
            op2_code: "010",
            cond_code: "0001",
            operands: 1,
            memory_param: 0,
        },
        bg: {
            // Branch if greater
            op_code: "00",
            op2_code: "010",
            cond_code: "1010",
            operands: 1,
            memory_param: 0,
        },
        bge: {
            // Branch if greater than or equal
            op_code: "00",
            op2_code: "010",
            cond_code: "1011",
            operands: 1,
            memory_param: 0,
        },
        bgu: {
            // Branch if greater unsigned
            op_code: "00",
            op2_code: "010",
            cond_code: "1100",
            operands: 1,
            memory_param: 0,
        },
        bl: {
            // Branch if less
            op_code: "00",
            op2_code: "010",
            cond_code: "0011",
            operands: 1,
            memory_param: 0,
        },
        ble: {
            // Branch if less than or equal
            op_code: "00",
            op2_code: "010",
            cond_code: "0010",
            operands: 1,
            memory_param: 0,
        },
        bleu: {
            // Branch if less than or equal to unsigned
            op_code: "00",
            op2_code: "010",
            cond_code: "0100",
            operands: 1,
            memory_param: 0,
        },
        bn: {
            // Branch never
            op_code: "00",
            op2_code: "010",
            cond_code: "0000",
            operands: 1,
            memory_param: 0,
        },
        bne: {
            // Branch if not equal
            op_code: "00",
            op2_code: "010",
            cond_code: "1001",
            operands: 1,
            memory_param: 0,
        },
        bneg: {
            // Branch if negative
            op_code: "00",
            op2_code: "010",
            cond_code: "0110",
            operands: 1,
            memory_param: 0,
        },
        bpos: {
            // Branch if positive
            op_code: "00",
            op2_code: "010",
            cond_code: "1110",
            operands: 1,
            memory_param: 0,
        },
        bvc: {
            // Branch if overflow clear
            op_code: "00",
            op2_code: "010",
            cond_code: "1111",
            operands: 1,
            memory_param: 0,
        },
        bvs: {
            // Branch if overflow set
            op_code: "00",
            op2_code: "010",
            cond_code: "0111",
            operands: 1,
            memory_param: 0,
        },
        /*
            CALL
        */
        call: {
            // Call a subroutine
            op_code: "01",
            operands: 1,
            memory_param: 0,
        },
        jmpl: {
            // Jump and link
            op_code: "01",
            op3_code: "111000",
            operands: 2,
            memory_param: 0,
        },
        /*
            ALU
        */
        add: {
            // Add
            op_code: "10",
            op3_code: "000000",
            operands: 3,
            memory_param: 0,
        },
        addcc: {
            // Add with condition codes
            op_code: "10",
            op3_code: "010000",
            operands: 3,
            memory_param: 0,
        },
        and: {
            // AND
            op_code: "10",
            op3_code: "000001",
            operands: 3,
            memory_param: 0,
        },
        andcc: {
            // AND with condition codes
            op_code: "10",
            op3_code: "010001",
            operands: 3,
            memory_param: 0,
        },
        andn: {
            // AND NOT
            op_code: "10",
            op3_code: "000101",
            operands: 3,
            memory_param: 0,
        },
        andncc: {
            // AND NOT with condition codes
            op_code: "10",
            op3_code: "010101",
            operands: 3,
            memory_param: 0,
        },
        or: {
            // OR
            op_code: "10",
            op3_code: "000010",
            operands: 3,
            memory_param: 0,
        },
        orcc: {
            // OR with condition codes
            op_code: "10",
            op3_code: "010010",
            operands: 3,
            memory_param: 0,
        },
        orn: {
            // OR NOT
            op_code: "10",
            op3_code: "000110",
            operands: 3,
            memory_param: 0,
        },
        orncc: {
            // OR NOT with condition codes
            op_code: "10",
            op3_code: "010110",
            operands: 3,
            memory_param: 0,
        },
        rett: {
            // Return from subroutine
            op_code: "10",
            op3_code: "111001",
            operands: 3,
            memory_param: 0,
        },
        sll: {
            // Shift bit left logical
            op_code: "10",
            op3_code: "100101",
            operands: 3,
            memory_param: 0,
        },
        sra: {
            // Shift bit right arithmetic
            op_code: "10",
            op3_code: "100111",
            operands: 3,
            memory_param: 0,
        },
        srl: {
            // Shift bit right logical
            op_code: "10",
            op3_code: "100110",
            operands: 3,
            memory_param: 0,
        },
        sub: {
            // Subtract
            op_code: "10",
            op3_code: "000100",
            operands: 3,
            memory_param: 0,
        },
        subcc: {
            // Subtract with condition codes
            op_code: "10",
            op3_code: "010100",
            operands: 3,
            memory_param: 0,
        },
        ta: {
            // Trap
            op_code: "10",
            op3_code: "111010",
            operands: 1,
            memory_param: 0,
        },
        wr: {
            // Write a value to special registers
            op_code: "10",
            op3_code: "110001",
            operands: 3,
            memory_param: 0,
        },
        xnor: {
            // XOR with NOT
            op_code: "10",
            op3_code: "000111",
            operands: 3,
            memory_param: 0,
        },
        xnorcc: {
            // XNOR with condition codes
            op_code: "10",
            op3_code: "010111",
            operands: 3,
            memory_param: 0,
        },
        xor: {
            // XOR
            op_code: "10",
            op3_code: "000011",
            operands: 3,
            memory_param: 0,
        },
        xorcc: {
            // XOR with condition codes
            op_code: "10",
            op3_code: "010011",
            operands: 3,
            memory_param: 0,
        },
        /*
            MEMORY
        */
        ld: {
            // Load a value
            op_code: "11",
            op3_code: "000000",
            operands: 2,
            memory_param: 1,
            store_instruction: false,
        },
        ldsb: {
            // Load a signed byte
            op_code: "11",
            op3_code: "001001",
            operands: 2,
            memory_param: 1,
            store_instruction: false,
        },
        ldsh: {
            // Load a signed half-word (2 bytes)
            op_code: "11",
            op3_code: "001010",
            operands: 2,
            memory_param: 1,
            store_instruction: false,
        },
        ldub: {
            // Load an unsigned byte
            op_code: "11",
            op3_code: "000001",
            operands: 2,
            memory_param: 1,
            store_instruction: false,
        },
        lduh: {
            // Load an unsigned half-word (2 bytes)
            op_code: "11",
            op3_code: "000010",
            operands: 2,
            memory_param: 1,
            store_instruction: false,
        },
        rd: {
            // Read a value
            op_code: "11",
            op3_code: "101001",
            operands: 2,
            memory_param: 0,
            store_instruction: false,
        },
        st: {
            // Store a value
            op_code: "11",
            op3_code: "000100",
            operands: 2,
            memory_param: 2,
            store_instruction: true,
        },
        stb: {
            // Store a byte
            op_code: "11",
            op3_code: "000101",
            operands: 2,
            memory_param: 2,
            store_instruction: true,
        },
        sth: {
            // Store a half-word (2 bytes)
            op_code: "11",
            op3_code: "000110",
            operands: 2,
            memory_param: 2,
            store_instruction: true,
        },
        /*
            OTHER
        */
        halt: {
            // Halt the program
            op_code: "11",
            op3_code: "111111",
            operands: 0,
            memory_param: 0,
            store_instruction: false,
        }
} as const;

export const syntheticInstructions = {
    not: {
		// Not a value
		instruction: "xor *1, %r0, *2",
		operands: 2,
	},
	neg: {
		// Negate a value
		instruction: "sub %r0, *1, *2",
		operands: 2,
	},
	inc: {
		// Increment a value
		instruction: "add *1, 1, *1",
		operands: 1,
	},
	dec: {
		// Decrement a value
		instruction: "sub *1, 1, *1",
		operands: 1,
	},
	clr: {
		// Clear a value
		instruction: "and *1, %r0, *1",
		operands: 1,
	},
	cmp: {
		instruction: "subcc *1, *2, %r0",
		operands: 2,
	},
	tst: {
		// Test a value
		instruction: "orcc %r0, *1, %r0",
		operands: 1,
	},
	mov: {
		// Move a value
		instruction: "or %r0, *1, *2",
		operands: 2,
	},
	nop: {
		// No operation
		instruction: "sethi 0, %r0",
		operands: 0,
	}
} as const;

export const pseudoOps = {
    begin: {
		// Start the program
		operands: 0,
	},
	end: {
		// End the program
		operands: 0,
	},
	org: {
		// Set the program counter
		operands: 1,
	},
	dwb: {
		// Define a word (4 bytes)
		operands: 1,
	},
	if: {
		// If the condition is true
		operands: 1,
	},
	endif: {
		// End the if statement
		operands: 0,
	}
} as const;

// Add these exports for types
export type Instruction = keyof typeof instructionSet;
export type SyntheticInstruction = keyof typeof syntheticInstructions;
export type PseudoOp = keyof typeof pseudoOps;
