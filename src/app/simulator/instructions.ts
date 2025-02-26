import { CPU } from "./cpu";
import { twosComplementBinaryToNumber, numberToTwosComplementBinary, twosComplementHexToNumber, numberToTwosComplementHex, numberToUnsignedHex, hexToBinary, binaryToHex } from "../utils/helpers";
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
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3) throw new Error("Invalid number of operands for sethi");
                try {
                    const dest_reg = parseInt(operands[2].slice(2));
                    const imm = parseInt(operands[1]);
                    
                    const result_bin = numberToTwosComplementBinary(imm, 22) + "0".repeat(10);
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
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
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch always
                cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bcc: {
            // Branch if carry clear
            op_code: "00",
            op2_code: "010",
            cond_code: "1101",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if not C
                if (!cpu.getCCR().c) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bcs: {
            // Branch if carry set
            op_code: "00",
            op2_code: "010",
            cond_code: "0101",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if C
                if (cpu.getCCR().c) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        be: {
            // Branch if equal
            op_code: "00",
            op2_code: "010",
            cond_code: "0001",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if Z
                if (cpu.getCCR().z) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bg: {
            // Branch if greater
            op_code: "00",
            op2_code: "010",
            cond_code: "1010",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if not (Z or (N xor V))
                if (!(cpu.getCCR().z || cpu.getCCR().n != cpu.getCCR().v)) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bge: {
            // Branch if greater than or equal
            op_code: "00",
            op2_code: "010",
            cond_code: "1011",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                if (!(cpu.getCCR().n != cpu.getCCR().v)) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bgu: {
            // Branch if greater unsigned
            op_code: "00",
            op2_code: "010",
            cond_code: "1100",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if not (C or Z)
                if (!(cpu.getCCR().c || cpu.getCCR().z)) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bl: {
            // Branch if less
            op_code: "00",
            op2_code: "010",
            cond_code: "0011",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if N xor V
                if (cpu.getCCR().n != cpu.getCCR().v) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        ble: {
            // Branch if less than or equal
            op_code: "00",
            op2_code: "010",
            cond_code: "0010",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if Z or (N xor V)
                if (cpu.getCCR().z || cpu.getCCR().n != cpu.getCCR().v) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bleu: {
            // Branch if less than or equal to unsigned
            op_code: "00",
            op2_code: "010",
            cond_code: "0100",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if C or Z
                if (cpu.getCCR().c || cpu.getCCR().z) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bn: {
            // Branch never
            op_code: "00",
            op2_code: "010",
            cond_code: "0000",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for bn");
                // Do nothing
            }
        },
        bne: {
            // Branch if not equal
            op_code: "00",
            op2_code: "010",
            cond_code: "1001",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if not Z
                if (!cpu.getCCR().z) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bneg: {
            // Branch if negative
            op_code: "00",
            op2_code: "010",
            cond_code: "0110",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if N
                if (cpu.getCCR().n) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bpos: {
            // Branch if positive
            op_code: "00",
            op2_code: "010",
            cond_code: "1110",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if not N
                if (!cpu.getCCR().n) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bvc: {
            // Branch if overflow clear
            op_code: "00",
            op2_code: "010",
            cond_code: "1111",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if not V
                if (!cpu.getCCR().v) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
        },
        bvs: {
            // Branch if overflow set
            op_code: "00",
            op2_code: "010",
            cond_code: "0111",
            operands: 1,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 2) throw new Error("Invalid number of operands for ba");
                // Branch if V
                if (cpu.getCCR().v) cpu.setNextBranchDisp(parseInt(operands[1]) * 4);
            }
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
        /*
            ALU
        */
        add: {
            // Add
            op_code: "10",
            op3_code: "000000",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for add");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let result;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        result = cpu.getRegister(source_reg1) + cpu.getRegister(source_reg2);
                    } else {
                        const imm = parseInt(operands[2]);
                        result = cpu.getRegister(source_reg1) + imm;
                    }
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        addcc: {
            // Add with condition codes
            op_code: "10",
            op3_code: "010000",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for addcc");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    const operand_1 = cpu.getRegister(source_reg1);
                    let operand_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        operand_2 = cpu.getRegister(source_reg2);
                    } else 
                        operand_2 = parseInt(operands[2]);
                    const result = operand_1 + operand_2;
                    cpu.setRegister(dest_reg, result);
                    
                    // Overflow: occurs when adding two numbers of the same sign produces a result of the opposite sign
                    const overflow: boolean = (operand_1 >= 0 && operand_2 >= 0 && result < 0) || 
                                         (operand_1 < 0 && operand_2 < 0 && result >= 0);
                    
                    // Carry: occurs when unsigned addition would need a 33rd bit
                    const unsignedResult = BigInt(BigInt.asUintN(32, BigInt(operand_1))) + 
                                         BigInt(BigInt.asUintN(32, BigInt(operand_2)));

                    const carry: boolean = unsignedResult > BigInt(0xFFFFFFFF);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: overflow,
                        c: carry
                    });

                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        and: {
            // AND
            op_code: "10",
            op3_code: "000001",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for and");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result = "";
                    for (let i = 0; i < 32; i++) {
                        result += bin_1[i] === "1" && bin_2[i] === "1" ? "1" : "0";
                    }
                    cpu.setRegister(dest_reg, twosComplementBinaryToNumber(result));
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        andcc: {
            // AND with condition codes
            op_code: "10",
            op3_code: "010001",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for andcc");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result_bin = "";
                    for (let i = 0; i < 32; i++) 
                        result_bin += bin_1[i] === "1" && bin_2[i] === "1" ? "1" : "0";
                    
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: false,
                        c: false
                    });
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        andn: {
            // AND NOT
            op_code: "10",
            op3_code: "000101",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for andn");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result = "";
                    for (let i = 0; i < 32; i++) {
                        result += !(bin_1[i] === "1" && bin_2[i] === "1") ? "1" : "0";
                    }
                    cpu.setRegister(dest_reg, twosComplementBinaryToNumber(result));
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        andncc: {
            // AND NOT with condition codes
            op_code: "10",
            op3_code: "010101",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for andncc");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result_bin = "";
                    for (let i = 0; i < 32; i++) 
                        result_bin += !(bin_1[i] === "1" && bin_2[i] === "1") ? "1" : "0";
                    
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: false,
                        c: false
                    });
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        jmpl: {
            // Jump To New Address
            op_code: "10",
            op3_code: "111000",
            operands: 2,
            memory_param: 0,
        },
        or: {
            // OR
            op_code: "10",
            op3_code: "000010",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for andn");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result = "";
                    for (let i = 0; i < 32; i++) {
                        result += bin_1[i] === "1" || bin_2[i] === "1" ? "1" : "0";
                    }
                    cpu.setRegister(dest_reg, twosComplementBinaryToNumber(result));
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        orcc: {
            // OR with condition codes
            op_code: "10",
            op3_code: "010010",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for orcc");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }

                    let result_bin = "";
                    for (let i = 0; i < 32; i++) 
                        result_bin += bin_1[i] === "1" || bin_2[i] === "1" ? "1" : "0";
                    
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: false,
                        c: false
                    });
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        orn: {
            // OR NOT
            op_code: "10",
            op3_code: "000110",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for orn");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result = "";
                    for (let i = 0; i < 32; i++) {
                        result += bin_1[i] === "0" && bin_2[i] === "0" ? "1" : "0";
                    }
                    cpu.setRegister(dest_reg, twosComplementBinaryToNumber(result));
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        orncc: {
            // OR NOT with condition codes
            op_code: "10",
            op3_code: "010110",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for orncc");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }

                    let result_bin = "";
                    for (let i = 0; i < 32; i++) 
                        result_bin += bin_1[i] === "0" && bin_2[i] === "0" ? "1" : "0";
                    
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: false,
                        c: false
                    });
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        rd: {
            // Read a value
            op_code: "10",
            op3_code: "101001",
            operands: 2,
            memory_param: 0
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
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for sll");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg = parseInt(operands[1].slice(2));
                    let shift_amount;
                    if (operands[2].startsWith("%r")) {
                        shift_amount = cpu.getRegister(parseInt(operands[2].slice(2)));
                    } else {
                        shift_amount = parseInt(operands[2]);
                    }
                    if (shift_amount > 31) shift_amount = shift_amount % 32;
                    else if (shift_amount < 0) shift_amount = 32 - (Math.abs(shift_amount) % 32);
                    else if (shift_amount == 0) {
                        cpu.setRegister(dest_reg, cpu.getRegister(source_reg));
                        return;
                    }
                    let result_bin = numberToTwosComplementBinary(cpu.getRegister(source_reg), 32); 
                    result_bin = result_bin.slice(shift_amount) + "0".repeat(shift_amount);
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        sra: {
            // Shift bit right arithmetic
            op_code: "10",
            op3_code: "100111",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for sra");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg = parseInt(operands[1].slice(2));
                    let shift_amount;
                    if (operands[2].startsWith("%r")) {
                        shift_amount = cpu.getRegister(parseInt(operands[2].slice(2)));
                    } else {
                        shift_amount = parseInt(operands[2]);
                    }
                    if (shift_amount > 31) shift_amount = shift_amount % 32;
                    else if (shift_amount < 0) shift_amount = 32 - (Math.abs(shift_amount) % 32);
                    else if (shift_amount == 0) {
                        cpu.setRegister(dest_reg, cpu.getRegister(source_reg));
                        return;
                    }
                    let result_bin = numberToTwosComplementBinary(cpu.getRegister(source_reg), 32); 
                    const msb = result_bin[0]; 
                    result_bin = msb.repeat(shift_amount) + result_bin.slice(0, 32 - shift_amount);
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        srl: {
            // Shift bit right logical
            op_code: "10",
            op3_code: "100110",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for srl");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg = parseInt(operands[1].slice(2));
                    let shift_amount;
                    if (operands[2].startsWith("%r")) {
                        shift_amount = cpu.getRegister(parseInt(operands[2].slice(2)));
                    } else {
                        shift_amount = parseInt(operands[2]);
                    }
                    if (shift_amount > 31) shift_amount = shift_amount % 32;
                    else if (shift_amount < 0) shift_amount = 32 - (Math.abs(shift_amount) % 32);
                    else if (shift_amount == 0) {
                        cpu.setRegister(dest_reg, cpu.getRegister(source_reg));
                        return;
                    }
                    let result_bin = numberToTwosComplementBinary(cpu.getRegister(source_reg), 32); 
                    result_bin = "0".repeat(shift_amount) + result_bin.slice(0, 32 - shift_amount);
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        sub: {
            // Subtract
            op_code: "10",
            op3_code: "000100",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for sub");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        const result = cpu.getRegister(source_reg1) - cpu.getRegister(source_reg2);
                        cpu.setRegister(dest_reg, result);
                    } else {
                        const imm = parseInt(operands[2]);
                        const result = cpu.getRegister(source_reg1) - imm;
                        cpu.setRegister(dest_reg, result);
                    }
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        subcc: {
            // Subtract with condition codes
            op_code: "10",
            op3_code: "010100",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for addcc");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    const operand_1 = cpu.getRegister(source_reg1);
                    let operand_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        operand_2 = cpu.getRegister(source_reg2);
                    } else 
                        operand_2 = parseInt(operands[2]);
                    const result = operand_1 - operand_2;
                    cpu.setRegister(dest_reg, result);
                    
                    // Overflow: occurs when subtracting numbers of opposite signs produces a result with unexpected sign
                    const overflow = (operand_1 >= 0 && operand_2 < 0 && result < 0) || 
                                   (operand_1 < 0 && operand_2 >= 0 && result >= 0);
                    
                    // Carry (borrow): occurs when first operand is less than second operand in unsigned arithmetic
                    const unsignedOp1 = BigInt(BigInt.asUintN(32, BigInt(operand_1)));
                    const unsignedOp2 = BigInt(BigInt.asUintN(32, BigInt(operand_2)));
                    const carry = unsignedOp1 < unsignedOp2;

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: overflow,
                        c: carry
                    });

                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
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
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for xnor");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result_bin = "";
                    for (let i = 0; i < 32; i++) {
                        result_bin += (bin_1[i] === bin_2[i]) ? "1" : "0";
                    }
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: false,
                        c: false
                    });
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        xnorcc: {
            // XNOR with condition codes
            op_code: "10",
            op3_code: "010111",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for xnor");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result = "";
                    for (let i = 0; i < 32; i++) {
                        result += (bin_1[i] === bin_2[i]) ? "1" : "0";
                    }
                    cpu.setRegister(dest_reg, twosComplementBinaryToNumber(result));
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        xor: {
            // XOR
            op_code: "10",
            op3_code: "000011",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for xor");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result = "";
                    for (let i = 0; i < 32; i++) {
                        result += (bin_1[i] === "1" && bin_2[i] === "0") || 
                            (bin_1[i] === "0" && bin_2[i] === "1") ? "1" : "0";
                    }
                    cpu.setRegister(dest_reg, twosComplementBinaryToNumber(result));
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
        },
        xorcc: {
            // XOR with condition codes
            op_code: "10",
            op3_code: "010011",
            operands: 3,
            memory_param: 0,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 4) throw new Error("Invalid number of operands for xor");
                try {
                    const dest_reg = parseInt(operands[3].slice(2));
                    const source_reg1 = parseInt(operands[1].slice(2));
                    let bin_1;
                    let bin_2;
                    if (operands[2].startsWith("%r")) {
                        const source_reg2 = parseInt(operands[2].slice(2));
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(cpu.getRegister(source_reg2), 32);
                        
                    } else {
                        const imm = parseInt(operands[2]);
                        bin_1 = numberToTwosComplementBinary(cpu.getRegister(source_reg1), 32);
                        bin_2 = numberToTwosComplementBinary(imm, 32);
                    }
                    let result_bin = "";
                    for (let i = 0; i < 32; i++) {
                        result_bin += (bin_1[i] === "1" && bin_2[i] === "0") || 
                            (bin_1[i] === "0" && bin_2[i] === "1") ? "1" : "0";
                    }
                    const result = twosComplementBinaryToNumber(result_bin);
                    cpu.setRegister(dest_reg, result);

                    cpu.setCCR({
                        n: result < 0,
                        z: result == 0,
                        v: false,
                        c: false
                    });
                } catch (e) {
                    throw new Error("Invalid register: " + e);
                }
            }
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
            bytes_loaded: 4,
            store_instruction: false,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for ld");
                try {
                    const dest_reg = parseInt(operands[operands.length - 1].slice(2));
                    //operand 1
                    let operand_1;
                    if (operands[1].startsWith("%r")) 
                        operand_1 = cpu.getRegister(parseInt(operands[1].slice(2)));
                    else 
                        operand_1 = parseInt(operands[1].substring(1, operands[1].length - 1));
                    //operand 2
                    let operand_2 = 0;
                    if (operands.length == 4) {
                        if (operands[2].startsWith("%r")) 
                            operand_2 = cpu.getRegister(parseInt(operands[2].slice(2)));
                        else 
                            operand_2 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    }
                    const memory_address = operand_1 + operand_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // If not word-aligned
                    if (memory_address % 4 != 0){ 
                        const standard_address = twosComplementHexToNumber(
                                numberToUnsignedHex(memory_address, 32), 32);
                        const hex_address = numberToTwosComplementHex(memory_address, 32);
                        throw new Error("Memory Operation Failed: address " + standard_address + " (" + 
                            hex_address + ") is not word-aligned");
                    }
                    const result = cpu.safeReadMemory(memory_address);
                    cpu.setRegister(dest_reg, twosComplementHexToNumber(result, 32));
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        ldsb: {
            // Load a signed byte
            op_code: "11",
            op3_code: "001001",
            operands: 2,
            memory_param: 1,
            bytes_loaded: 1,
            store_instruction: false,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for ldsb");
                try {
                    const dest_reg = parseInt(operands[operands.length - 1].slice(2));
                    //operand 1
                    let operand_1;
                    if (operands[1].startsWith("%r")) 
                        operand_1 = cpu.getRegister(parseInt(operands[1].slice(2)));
                    else 
                        operand_1 = parseInt(operands[1].substring(1, operands[1].length - 1));
                    //operand 2
                    let operand_2 = 0;
                    if (operands.length == 4) {
                        if (operands[2].startsWith("%r")) 
                            operand_2 = cpu.getRegister(parseInt(operands[2].slice(2)));
                        else 
                            operand_2 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    }
                    const memory_address = operand_1 + operand_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // No word-alignment required
                    const result_bin = hexToBinary(cpu.safeReadMemory(memory_address, 1));
                    const sign_bit = result_bin[0];
                    const result = twosComplementBinaryToNumber(sign_bit.repeat(24) + result_bin);
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        ldsh: {
            // Load a signed half-word (2 bytes)
            op_code: "11",
            op3_code: "001010",
            operands: 2,
            memory_param: 1,
            bytes_loaded: 2,
            store_instruction: false,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for ldsb");
                try {
                    const dest_reg = parseInt(operands[operands.length - 1].slice(2));
                    //operand 1
                    let operand_1;
                    if (operands[1].startsWith("%r")) 
                        operand_1 = cpu.getRegister(parseInt(operands[1].slice(2)));
                    else 
                        operand_1 = parseInt(operands[1].substring(1, operands[1].length - 1));
                    //operand 2
                    let operand_2 = 0;
                    if (operands.length == 4) {
                        if (operands[2].startsWith("%r")) 
                            operand_2 = cpu.getRegister(parseInt(operands[2].slice(2)));
                        else 
                            operand_2 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    }
                    const memory_address = operand_1 + operand_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // If not word-aligned
                    if (memory_address % 2 != 0){ 
                        const standard_address = twosComplementHexToNumber(
                                numberToUnsignedHex(memory_address, 32), 32);
                        const hex_address = numberToTwosComplementHex(memory_address, 32);
                        throw new Error("Memory Operation Failed: address " + standard_address + " (" + 
                            hex_address + ") is not word-aligned");
                    }
                    const result_bin = hexToBinary(cpu.safeReadMemory(memory_address, 2));
                    const sign_bit = result_bin[0];
                    const result = twosComplementBinaryToNumber(sign_bit.repeat(16) + result_bin);
                    cpu.setRegister(dest_reg, result);
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        ldub: {
            // Load an unsigned byte
            op_code: "11",
            op3_code: "000001",
            operands: 2,
            memory_param: 1,
            bytes_loaded: 1,
            store_instruction: false,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for ldub");
                try {
                    const dest_reg = parseInt(operands[operands.length - 1].slice(2));
                    //operand 1
                    let operand_1;
                    if (operands[1].startsWith("%r")) 
                        operand_1 = cpu.getRegister(parseInt(operands[1].slice(2)));
                    else 
                        operand_1 = parseInt(operands[1].substring(1, operands[1].length - 1));
                    //operand 2
                    let operand_2 = 0;
                    if (operands.length == 4) {
                        if (operands[2].startsWith("%r")) 
                            operand_2 = cpu.getRegister(parseInt(operands[2].slice(2)));
                        else 
                            operand_2 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    }
                    const memory_address = operand_1 + operand_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // No word-alignment required
                    const result = cpu.safeReadMemory(memory_address, 1);
                    cpu.setRegister(dest_reg, twosComplementHexToNumber("0".repeat(6) + result, 32));
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        lduh: {
            // Load an unsigned half-word (2 bytes)
            op_code: "11",
            op3_code: "000010",
            operands: 2,
            memory_param: 1,
            bytes_loaded: 2,
            store_instruction: false,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for ldub");
                try {
                    const dest_reg = parseInt(operands[operands.length - 1].slice(2));
                    //operand 1
                    let operand_1;
                    if (operands[1].startsWith("%r")) 
                        operand_1 = cpu.getRegister(parseInt(operands[1].slice(2)));
                    else 
                        operand_1 = parseInt(operands[1].substring(1, operands[1].length - 1));
                    //operand 2
                    let operand_2 = 0;
                    if (operands.length == 4) {
                        if (operands[2].startsWith("%r")) 
                            operand_2 = cpu.getRegister(parseInt(operands[2].slice(2)));
                        else 
                            operand_2 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    }
                    const memory_address = operand_1 + operand_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // If not word-aligned
                    if (memory_address % 2 != 0){ 
                        const standard_address = twosComplementHexToNumber(
                                numberToUnsignedHex(memory_address, 32), 32);
                        const hex_address = numberToTwosComplementHex(memory_address, 32);
                        throw new Error("Memory Operation Failed: address " + standard_address + " (" + 
                            hex_address + ") is not word-aligned");
                    }
                    const result = cpu.safeReadMemory(memory_address, 2);
                    cpu.setRegister(dest_reg, twosComplementHexToNumber("0".repeat(4) + result, 32));
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        st: {
            // Store a value
            op_code: "11",
            op3_code: "000100",
            operands: 2,
            memory_param: 2,
            bytes_stored: 4,
            store_instruction: true,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for st");
                try {
                    const source_reg = cpu.getRegister(parseInt(operands[1].slice(2)));
                    let memory_parameter_1;
                    if (operands[2].startsWith("%r")) 
                        memory_parameter_1 = cpu.getRegister(parseInt(operands[2].slice(2)));
                    else 
                        memory_parameter_1 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    let memory_parameter_2 = 0;
                    if (operands.length == 4) {
                        if (operands[3].startsWith("%r")) 
                            memory_parameter_2 = cpu.getRegister(parseInt(operands[3].slice(2)));
                        else 
                            memory_parameter_2 = parseInt(operands[3].substring(1, operands[3].length - 1));
                    }
                    const memory_address = memory_parameter_1 + memory_parameter_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // If not word-aligned
                    if (memory_address % 4 != 0){ 
                        const standard_address = twosComplementHexToNumber(
                                numberToUnsignedHex(memory_address, 32), 32);
                        const hex_address = numberToTwosComplementHex(memory_address, 32);
                        throw new Error("Memory Operation Failed: address " + standard_address + " (" + 
                            hex_address + ") is not word-aligned");
                    }
                    cpu.writeMemory(memory_address, numberToTwosComplementHex(source_reg, 32));
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        stb: {
            // Store a byte
            op_code: "11",
            op3_code: "000101",
            operands: 2,
            memory_param: 2,
            bytes_stored: 1,
            store_instruction: true,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for stb");
                try {
                    const source_reg_whole = cpu.getRegister(parseInt(operands[1].slice(2)));
                    const source_reg_whole_bin = numberToTwosComplementBinary(source_reg_whole, 32);
                    const source_reg_byte = source_reg_whole_bin.slice(-8);
                    const source_reg = binaryToHex(source_reg_byte);
                    let memory_parameter_1;
                    if (operands[2].startsWith("%r")) 
                        memory_parameter_1 = cpu.getRegister(parseInt(operands[2].slice(2)));
                    else 
                        memory_parameter_1 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    let memory_parameter_2 = 0;
                    if (operands.length == 4) {
                        if (operands[3].startsWith("%r")) 
                            memory_parameter_2 = cpu.getRegister(parseInt(operands[3].slice(2)));
                        else 
                            memory_parameter_2 = parseInt(operands[3].substring(1, operands[3].length - 1));
                    }
                    const memory_address = memory_parameter_1 + memory_parameter_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // Do not need to check word-alignment
                    cpu.writeMemory(memory_address, source_reg, 1);
                } catch (e) {
                    throw new Error(e as string);
                }
            }
        },
        sth: {
            // Store a half-word (2 bytes)
            op_code: "11",
            op3_code: "000110",
            operands: 2,
            memory_param: 2,
            bytes_stored: 2,
            store_instruction: true,
            execute: (cpu: CPU, operands: string[]) => {
                if (operands.length != 3 && operands.length != 4) throw new Error("Invalid number of operands for stb");
                try {
                    const source_reg_whole = cpu.getRegister(parseInt(operands[1].slice(2)));
                    const source_reg_whole_bin = numberToTwosComplementBinary(source_reg_whole, 32);
                    const source_reg_byte = source_reg_whole_bin.slice(-16);
                    const source_reg = binaryToHex(source_reg_byte);
                    let memory_parameter_1;
                    if (operands[2].startsWith("%r")) 
                        memory_parameter_1 = cpu.getRegister(parseInt(operands[2].slice(2)));
                    else 
                        memory_parameter_1 = parseInt(operands[2].substring(1, operands[2].length - 1));
                    let memory_parameter_2 = 0;
                    if (operands.length == 4) {
                        if (operands[3].startsWith("%r")) 
                            memory_parameter_2 = cpu.getRegister(parseInt(operands[3].slice(2)));
                        else 
                            memory_parameter_2 = parseInt(operands[3].substring(1, operands[3].length - 1));
                    }
                    const memory_address = memory_parameter_1 + memory_parameter_2;
                    if (memory_address < -0xFFFFFFFF || memory_address > 0xFFFFFFFF) throw new Error("Invalid memory address");
                    // If not word-aligned
                    if (memory_address % 2 != 0){ 
                        const standard_address = twosComplementHexToNumber(
                                numberToUnsignedHex(memory_address, 32), 32);
                        const hex_address = numberToTwosComplementHex(memory_address, 32);
                        throw new Error("Memory Operation Failed: address " + standard_address + " (" + 
                            hex_address + ") is not word-aligned");
                    }
                    cpu.writeMemory(memory_address, source_reg, 2);
                } catch (e) {
                    throw new Error(e as string);
                }
            }
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
        instruction: ["xnor", "*1", "%r0", "*2"],
        operands: 2,
        operand_types: ["reg", "reg"]
    },
    neg: {
        // Negate a value
        instruction: ["sub", "%r0", "*1", "*2"],
        operands: 2,
        operand_types: ["reg", "reg"]
    },
    inc: {
        // Increment a value
        instruction: ["add", "*1", "1", "*1"],
        operands: 1,
        operand_types: ["reg"]
    },
    dec: {
        // Decrement a value
        instruction: ["sub", "*1", "1", "*1"],
        operands: 1,
        operand_types: ["reg"]
    },
    clr: {
        // Clear a value
        instruction: ["and", "*1", "%r0", "*1"],
        operands: 1,
        operand_types: ["reg"]
    },
    cmp: {
        instruction: ["subcc", "*1", "*2", "%r0"],
        operands: 2,
        operand_types: ["reg", "reg_imm"]
    },
    tst: {
        // Test a value
        instruction: ["orcc", "%r0", "*1", "%r0"],
        operands: 1,
        operand_types: ["reg"]
    },
    mov: {
        // Move a value
        instruction: ["or", "%r0", "*1", "*2"],
        operands: 2,
        operand_types: ["reg_imm", "reg"]
    },
    nop: {
        // No operation
        instruction: ["sethi", "0", "%r0"],
        operands: 0,
        operand_types: []
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
