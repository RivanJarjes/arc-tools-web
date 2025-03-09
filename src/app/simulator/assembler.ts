export interface SymbolEntry {
    address: number;
    value?: number;
}

export type MemoryMap = Map<string, SymbolEntry>; 

import {
	numberToUnsignedBinary,
	numberToTwosComplementBinary,
    twosComplementBinaryToNumber,
    unsignedHexToNumber,
    binaryToHex
} from "../utils/helpers";

import { 
	instructionSet, 
	syntheticInstructions, 
	pseudoOps,
    SyntheticInstruction
} from "./instructions";

// Add the new interface
interface MemoryAddressValue {
    type: 'register' | 'immediate' | 'register-register' | 'register-immediate';
    register?: string;
    register2?: string;
    immediate?: number;
}

export { instructionSet, syntheticInstructions, pseudoOps };
let currentLine: number = 0;
let starting_address: number = NaN;

function error(message: string) {
    throw new Error(`Error on line ${currentLine}: ${message}`);
}

function warning(message: string) {
    console.log("_WARNING on line " + currentLine + ": " + message);
}

export interface AssemblerOutput {
	machineCode: string;
	symbolTable: MemoryMap;
}

export function assemble(code: string): AssemblerOutput {
	const lines = code.split("\n");
	const cleanInstructions = lines
		.map((line) => line.startsWith("!") ? "" : line.trim());
	// First pass: build symbol table
	const symbolTable = first_pass(cleanInstructions);
	// Second pass: generate machine code
	const machineCode = second_pass(cleanInstructions, symbolTable);
	if (machineCode.some(line => line.includes("NaN"))) {
		error("Invalid instruction or operand");
	}

	// Convert each binary instruction to hexadecimal using binaryToHex
	const formattedMachineCode = machineCode.map(line => {
		return line.map(binary => binaryToHex(binary)).join('\t');
	}).join('\n');
    
	return {
		machineCode: formattedMachineCode,
		symbolTable,
	};
}

function first_pass(instructions: string[]): MemoryMap {
	const symbolMap: MemoryMap = new Map();
	let pc = 0;
	let assembling: boolean = false;

	for (const instruction of instructions) {
		currentLine++;
		const tokens = tokenize(instruction);
		if (!tokens.length) continue;

		if (tokens[0].endsWith(":")) {
            if (assembling) {
                const label = tokens[0].slice(0, -1);
                if (/^[a-zA-Z0-9_\.]+$/.test(label)) {
                    // Store only the address
                    symbolMap.set(label, { address: pc});
					if (label == "main")
						starting_address = pc;
                }
            }
            tokens.shift(); // Remove label from tokens
            if (!(tokens.length) || !(tokens[0].slice(1) in pseudoOps)) {
                if (tokens.length && tokens.every(token => isImmediate(token, symbolMap)))
                    pc += 4 * tokens.length;
                else
                    pc += 4;
                continue;
            }
		}

		// Handle pseudo-ops
		if (tokens[0] && tokens[0].slice(1) in pseudoOps) {
			switch (tokens[0]) {
				case ".begin":
					assembling = true;
					continue;
				case ".end":
					assembling = false;
					continue;
				case ".org":
                    if (symbolMap.has(tokens[1])) {
                        pc = symbolMap.get(tokens[1])!.address;
                    } else {
                        pc = parseInt(tokens[1]);
                    }
                    if (isNaN(pc))
                        pc = 0;

                    if (pc % 4 != 0)
                        error("Memory address must be word aligned (a multiple of 4): " + tokens[1]);

					if (isNaN(starting_address))
						starting_address = pc;
					continue;
                case ".dwb":
                    let dwb_value: number;
                    if (symbolMap.has(tokens[1])) {
                        dwb_value = symbolMap.get(tokens[1])!.address;
                    } else {
                        dwb_value = parseInt(tokens[1]);
                    }

                    if (isNaN(dwb_value))
                        dwb_value = 0;

                    pc += dwb_value * 4;
                    continue;
			}
		}

        // Handle .equ psuedo-ops, holds in symbol table
        if (tokens.length == 3 && tokens[1] == ".equ") {
            const symbol = tokens[0];
            const value = parseInt(tokens[2]);
            symbolMap.set(symbol, { address: value });
            continue;
        }

		// Only increment PC for actual instructions
		if (tokens.length > 0 && assembling) {
			pc += 4; // Each instruction is 4 bytes
		}
	}
    currentLine = 0;
	return symbolMap;
}

function second_pass(instructions: string[], symbolTable: MemoryMap): string[][] {
	const machineCode: string[][] = [];
	let pc = 0;
	let assembling: boolean = false;
	for (const instruction of instructions) {
        currentLine++;
		const tokens = tokenize(instruction);
		if (!tokens.length) continue;

		// Skip labels
		if (tokens[0].endsWith(":")) {
			tokens.shift();
			if (!tokens.length) {
                pc += 4;
                continue;
            };
		}

		// Handle pseudo-ops
		if (tokens[0] && tokens[0].slice(1) in pseudoOps) {
			switch (tokens[0]) {
				case ".begin":
					assembling = true;
					continue;
				case ".end":
                    if (!assembling)
                        error("Unterminated block, expecting .begin");
					assembling = false;
					continue;
				case ".org":
                    let org_value: number;
                    if (symbolTable.has(tokens[1])) 
                        org_value = symbolTable.get(tokens[1])!.address;
                    else 
                        org_value = parseInt(tokens[1]);
                    if (isNaN(org_value)){
                        org_value = 0;
                        warning("Undefined or forward label reference to " + tokens[1]);
                    }
                    else if (org_value % 4 != 0)
                        error("Memory address must be word aligned (a multiple of 4): " + tokens[1]);
                    pc = org_value;
					continue;
                case ".dwb":
                        let dwb_value: number;
                        
                        if (symbolTable.has(tokens[1])) 
                            dwb_value = symbolTable.get(tokens[1])!.address;
                        else 
                            dwb_value = parseInt(tokens[1]);
                        
                        if (isNaN(dwb_value))
                            dwb_value = 0;
    
                        pc += dwb_value * 4;
                        continue;
			}
		}

        // If not assembling, skip
		if (!assembling) continue;

        // Ignore .equ psuedo-ops
        if (tokens[1] == ".equ") continue;

        if (machineCode.length == 0) {
			if (isNaN(starting_address))
				machineCode.push([numberToTwosComplementBinary(pc, 32)]);
			else {
				machineCode.push([numberToTwosComplementBinary(starting_address, 32)]);
				starting_address = NaN;
			}
        }

		// Handle actual instructions
		const baseInstruction = tokens[0];

		if (baseInstruction in instructionSet) {
			const encoded = encode_instruction(tokens, symbolTable, pc);
			if (encoded !== null) {
                machineCode.push([]);
                machineCode[machineCode.length - 1].push(numberToTwosComplementBinary(pc, 32));
				machineCode[machineCode.length - 1].push(encoded);
				pc += 4;
			} else {
				error("Invalid instruction: " + instruction);
			}
		} else if (baseInstruction in syntheticInstructions) {
			const expanded = expand_synthetic(tokens, symbolTable);
            const encoded = encode_instruction(expanded, symbolTable, pc);
            if (encoded !== null) {
                machineCode.push([]);
                machineCode[machineCode.length - 1].push(numberToTwosComplementBinary(pc, 32));
                machineCode[machineCode.length - 1].push(encoded);
                pc += 4;
            } else 
                error("Invalid instruction: " + instruction);
		} else if (tokens.every(token => isImmediate(token, symbolTable))) {
            for (const token of tokens) {
                machineCode.push([]);
                machineCode[machineCode.length - 1].push(numberToTwosComplementBinary(pc, 32));
                machineCode[machineCode.length - 1].push(numberToTwosComplementBinary(getImmediateValue(token, symbolTable), 32));
                pc += 4;
            }
		} else {
			error("Invalid instruction: " + instruction);
		}
	}
    if (assembling) {
        error("Unterminated block, expecting .end");
    }

    currentLine = 0;
	return machineCode;
}

function encode_instruction(
	tokens: string[],
	symbolTable: MemoryMap,
	currentPc: number
): string | null {
	if (tokens.length === 0) return null;

	const baseInstruction = tokens[0].toLowerCase();

	const instruction =
		instructionSet[baseInstruction as keyof typeof instructionSet];
	if (instruction === undefined)
		error("Invalid instruction: " + baseInstruction);

	switch (instruction.op_code) {
		case "00": // SETHI and Branching
            if (baseInstruction == "sethi" && tokens.length == 3) {
                if (!isImmediate(tokens[1], symbolTable) || !isRegister(tokens[2]))
                    error("Invalid operands: " + tokens.slice(1).join(" "));

                const imm22: string = numberToTwosComplementBinary(getImmediateValue(tokens[1], symbolTable), 22);
                const op2: string = instruction.op2_code;
                const rd: string = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
                return "00" + rd + op2 + imm22;
            }else if (baseInstruction != "sethi" && tokens.length == 2) {
                if (!isImmediate(tokens[1],symbolTable))
                    error("Invalid operand: " + tokens.slice(1).join(" "));

                const mem22: number = getImmediateValue(tokens[1], symbolTable);
                const disp22: string = numberToTwosComplementBinary(Math.floor((mem22 - currentPc) / 4), 22);
                const op2: string = instruction.op2_code;
                const cond: string = instruction.cond_code; 

                return "000" + cond + op2 + disp22;
            }
            error("Invalid operands: " + tokens.join(" "));
		case "01": // CALL 
            if (tokens.length != 2) error("Invalid operands: " + tokens.join(" "));

            if (!isImmediate(tokens[1],symbolTable))
                error("Invalid operand: " + tokens.slice(1).join(" "));

            const mem30: number = getImmediateValue(tokens[1], symbolTable);
            const disp30: string = numberToTwosComplementBinary(Math.floor((mem30 - currentPc) / 4), 30);

            return "01" + disp30;
		case "10": // ALU
            // Special Cases
            if (baseInstruction == "rd") {
                if (tokens.length != 3) error("Invalid operands: " + tokens.join(" "));

                if (tokens[1] != "%psr" || !isRegister(tokens[2]))
                    error("Invalid operands: " + tokens.join(" "));

                const rd: string = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);

                return "10" + rd + instruction.op3_code + "0".repeat(19);
            }else if (baseInstruction == "jmpl") {
                if (tokens.length != 3) error("Invalid operands: " + tokens.join(" "));

                const jmplResult = validJMPLOperand(tokens[1], symbolTable);
                
                if (!jmplResult.valid || !isRegister(tokens[2])) 
                    error("Invalid operands: " + tokens.join(" "));

                const rd = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
                const rs1 = numberToUnsignedBinary(parseInt(jmplResult.register!.slice(2)), 5);
                const simm13 = numberToTwosComplementBinary(jmplResult.immediate!, 13);
                return "10" + rd + instruction.op3_code + rs1 + "1" + simm13;
            }else if (baseInstruction == "ta" || baseInstruction == "rett") {
                if (tokens.length != 2 && tokens.length != 3) error("Invalid operands: " + tokens.join(" "));

				if (tokens.length == 2) {
					const opRegister = isRegister(tokens[1]);
					const opImmediate = isImmediate(tokens[1], symbolTable);

					if (opRegister == opImmediate) // If it's neither or... somehow both
						error("Invalid operands: " + tokens.join(" "));

					if (opRegister) {
						const rs1 = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						return "10" + "0".repeat(5) + instruction.op3_code + rs1 + "0".repeat(14);
					} else if (opImmediate) {
						const simm13 = numberToTwosComplementBinary(getImmediateValue(tokens[1], symbolTable), 13);
                        return "10" + "0".repeat(5) + instruction.op3_code + "0".repeat(5) + "1" + simm13;
                    }
				}else if (tokens.length == 3) {
					const op1Register = isRegister(tokens[1]);
					const op2Register = isRegister(tokens[2]);
					const op2Immediate = isImmediate(tokens[2], symbolTable);

					if (!op1Register || (op2Register == op2Immediate))
						error("Invalid operands: " + tokens.join(" "));

					const rd = "0".repeat(5);

					if (op1Register && op2Register) {
						const rs1 = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						const rs2 = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
						return "10" + rd + instruction.op3_code + rs1 + "0".repeat(9) + rs2;
					} else if (op1Register && op2Immediate) {
						const rs1 = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						const simm13 = numberToTwosComplementBinary(getImmediateValue(tokens[2], symbolTable), 13);
						return "10" + rd + instruction.op3_code + rs1 + "1" + simm13;
					}
				}

                error("Invalid operands: " + tokens.join(" "));
            }else if (baseInstruction == "rett") {
                if (tokens.length != 3) error("Invalid operands: " + tokens.join(" "));

                if (!isRegister(tokens[1]) || !isImmediate(tokens[2], symbolTable))
                    error("Invalid operands: " + tokens.join(" "));

                const rs1 = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
                const simm13 = numberToTwosComplementBinary(getImmediateValue(tokens[2], symbolTable), 13);
                return "10" + "0".repeat(5) + instruction.op3_code + rs1 + "1" + simm13;
            }
			else if (instruction.operands === 3) {
				if (tokens.length != 4) error("Invalid operands: " + tokens.join(" "));

				if (isRegister(tokens[1]) && isRegister(tokens[2]) && (
                    isRegister(tokens[3]) || (baseInstruction == "wr" && tokens[3] == "%psr"))
                ) {
                    //Case: writing to %psr with wr
                    if (baseInstruction == "wr" && tokens[3] == "%psr") 
                        tokens[3] = "%r0";
					const rd: string = numberToUnsignedBinary(parseInt(tokens[3].slice(2)), 5);
					const rs1: string = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
					const rs2: string = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
					return "10" + rd + instruction.op3_code + rs1 + "0".repeat(9) + rs2;
				} else if (
					isRegister(tokens[1]) && 
					(isImmediate(tokens[2], symbolTable)) && 
					(isRegister(tokens[3]) || (baseInstruction == "wr" && tokens[3] == "%psr"))
				) {
                    //Case: writing to %psr with wr
                    if (baseInstruction == "wr" && tokens[3] == "%psr") 
                        tokens[3] = "%r0";
					const rd: string = numberToUnsignedBinary(parseInt(tokens[3].slice(2)), 5);
					const rs1: string = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
					const value = getImmediateValue(tokens[2], symbolTable);
					const simm13: string = numberToTwosComplementBinary(value, 13);
					return "10" + rd + instruction.op3_code + rs1 + "1" + simm13;
				}
			}
			error("Invalid operands: " + tokens.join(" "));
            return null;
		case "11": // Memory
			const store_instruction = instruction.store_instruction;
			const memory_parameter = instruction.memory_param;
			
            if (baseInstruction == "halt") {
                if (tokens.length != 1)
                    error("Invalid operands: " + tokens.join(" "));

                return "1".repeat(32);
            }else if (tokens.length == 3) {
				// Handle [address] format
				const memory_address = parseMemoryAddress(tokens[memory_parameter], store_instruction, false, symbolTable);
				if (memory_parameter != 0 && !memory_address?.valid) {
					error("Invalid memory address: " + tokens[memory_parameter]);
				}

				if (store_instruction && !isRegister(tokens[1])) 
					error("Invalid operand: " + tokens[1]);

				const rd: string = memory_parameter == 2
					? numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5)
					: numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);

				const rs1: string = memory_address?.value?.type === 'register' || 
								   memory_address?.value?.type === 'register-register' ||
								   memory_address?.value?.type === 'register-immediate'
					? numberToUnsignedBinary(parseInt(memory_address.value.register!.slice(2)), 5)
					: "0".repeat(5);

				let rs2_simm13: string = "0".repeat(13);
				let i: string = "0";

				if (memory_address?.value) {
					switch (memory_address.value.type) {
						case 'immediate':
							rs2_simm13 = numberToTwosComplementBinary(memory_address.value.immediate!, 13);
							i = "1";
							break;
						case 'register':
							rs2_simm13 = "0".repeat(13);
							i = "0";
							break;
						case 'register-immediate':
							rs2_simm13 = numberToTwosComplementBinary(memory_address.value.immediate!, 13);
							i = "1";
							break;
						case 'register-register':
							rs2_simm13 = numberToTwosComplementBinary(
								parseInt(memory_address.value.register2!.slice(2)),
								13
							);
							i = "0";
							break;
					}
				}

				return "11" + rd + instruction.op3_code + rs1 + i + rs2_simm13;
			} else if (tokens.length == 4) {
				// Handle register-register format for store instructions
				if (store_instruction) {
					if (isRegister(tokens[1]) && // Source register
						isRegister(tokens[2]) && // Base register
						isRegister(tokens[3]))   // Offset register
					{
						const rd = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						const rs1 = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
						const rs2 = numberToUnsignedBinary(parseInt(tokens[3].slice(2)), 5);
						return "11" + rd + instruction.op3_code + rs1 + "0" + "0".repeat(8) + rs2;
					}
					
					// Handle register + base + memory address format
					if (isRegister(tokens[1]) && // Source register
						isRegister(tokens[2]) && // Base register
						tokens[3].startsWith("[") && tokens[3].endsWith("]")) // Memory address
					{
						const memory_address = parseMemoryAddress(tokens[3], store_instruction, true, symbolTable);
						if (!memory_address?.valid || typeof memory_address.value?.immediate !== 'number') {
							error("Invalid memory address: " + tokens[3]);
                            return null;
						}

						const rd = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						const rs1 = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
						const simm13 = numberToTwosComplementBinary(memory_address.value.immediate, 13);
						return "11" + rd + instruction.op3_code + rs1 + "1" + simm13;
					}

					// Handle register + base + immediate format
					if (isRegister(tokens[1]) && // Source register
						isRegister(tokens[2]) && // Base register
						isImmediate(tokens[3], symbolTable)) // Immediate
					{
						const memory_address = getImmediateValue(tokens[3], symbolTable);
						if (!memory_address) {
							error("Invalid memory address: " + tokens[3]);
                            return null;
						}

						const rd = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						const rs1 = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
						const simm13 = numberToTwosComplementBinary(memory_address, 13);
						return "11" + rd + instruction.op3_code + rs1 + "1" + simm13;
					}
				}

                if (tokens[2].includes("[") && isImmediate(tokens[2].slice(1, -1), symbolTable)) 
                    tokens[2] = tokens[2].slice(1, -1);
				// Return null if load instruction and any operand contains square brackets (memory address)
				if (!store_instruction && tokens.some((token) => token.includes("["))) {
					error("Invalid Operands: " + tokens.join(" "));
				}

				// First operand can be either register or immediate
				const isFirstReg = isRegister(
					memory_parameter == 2 ? tokens[2] : tokens[1]
				);
				const isFirstImm =
					isImmediate(memory_parameter == 2 ? tokens[2] : tokens[1], symbolTable) ||
					store_instruction
						? isValidMemoryAddress(
								memory_parameter == 2 ? tokens[2] : tokens[1],
								store_instruction,
								false,
                                false,
								symbolTable
						  ).valid
						: false;
				const isSecondReg = isRegister(
					memory_parameter == 2 ? tokens[3] : tokens[2]
				);

				const isSecondImm =
					isImmediate(memory_parameter == 2 ? tokens[3] : tokens[2], symbolTable) ||
					(store_instruction
						? isValidMemoryAddress(
								memory_parameter == 2 ? tokens[3] : tokens[2],
								store_instruction,
								false,
                                false,
								symbolTable
						  ).valid
						: false);
                

                // Check for false operands; must be at least one register and no more than one immediate
				if ((!isFirstReg && !isFirstImm) ||
					(!isSecondReg && !isSecondImm) ||
					(isFirstImm && isSecondImm) ||
					(!isFirstReg && !isSecondReg)) {
					error("Invalid Operands: " + tokens.join(" "));
				}

                //For easier access, make the second non-destination operand immediate always
                if (isFirstImm) {
                    const temp = tokens[memory_parameter == 2 ? 2 : 1];
                    tokens[memory_parameter == 2 ? 2 : 1] = tokens[memory_parameter == 2 ? 3 : 2];
                    tokens[memory_parameter == 2 ? 3 : 2] = temp;
                }

				// Check destination register
				if (!isRegister(
                    memory_parameter == 2 ? tokens[1] : tokens[3])) {
					error("Invalid Operands: " + tokens.join(" "));
				}

				const rd = numberToUnsignedBinary(parseInt(
                    (memory_parameter == 2 ? tokens[1] : tokens[3]).slice(2)), 5);
                const rs1 = numberToUnsignedBinary(parseInt(
                    (memory_parameter == 2 ? tokens[2] : tokens[1]).slice(2)), 5);

				if (isFirstReg && isSecondReg) {
					// Register-Register format
                    const rs2 = numberToUnsignedBinary(parseInt(
                        (memory_parameter == 2 ? tokens[3] : tokens[2]).slice(2)), 5);
					return "11" + rd + instruction.op3_code + rs1 + "0".repeat(9) + rs2;
				} else {
                    const simm13_value = getImmediateValue(tokens[memory_parameter == 2 ? 3 : 2], symbolTable);
                    if (simm13_value === null) {
                        error("Invalid operands: " + tokens.join(" "));
                        return null;
                    }
					// Immediate-Register format
					const simm13 = numberToTwosComplementBinary(
						simm13_value,
						13
					);
					return "11" + rd + instruction.op3_code + rs1 + "1" + simm13;
				}
			}
			error("Invalid operands: " + tokens.join(" "));
            return null;
	}
	return null;
}

function expand_synthetic(
	tokens: string[],
	symbolTable: MemoryMap
): string[] {
	if (tokens.length === 0) return [];

	const opcode = tokens[0].toLowerCase();
	const synthetic = syntheticInstructions[opcode as SyntheticInstruction];
	if (!synthetic) error("Invalid instruction: " + opcode);
    if (synthetic.operands != tokens.length - 1)
        error("Invalid operands: " + tokens.join(" "));

    const instruction: string[] = [...synthetic.instruction];  // Create mutable copy

    // Handle synthetic instructions with no operands
    if (synthetic.operands == 0) {
        return instruction;
    }

    for (let i = 0; i < instruction.length; i++) {
        if (instruction[i].startsWith("*")) {
            const token_index = parseInt(instruction[i].slice(1));
            if (token_index >= tokens.length)
                error("Invalid operands: " + tokens.join(" "));

            switch (synthetic.operand_types[token_index-1]) {
                case "reg":
                    if (!isRegister(tokens[token_index]))
                        error("Invalid operand: " + tokens[token_index]);
                    break;
                case "reg_imm":
                    if (!isRegister(tokens[token_index]) && !isImmediate(tokens[token_index], symbolTable))
                        error("Invalid operand: " + tokens[token_index]);
                    break;
            }

            instruction[i] = tokens[token_index];
        }
    }

    return instruction;  // Return the expanded instruction
}

function isRegister(token: string): boolean {
	// Check if token starts with %r
	if (!token.startsWith("%r") && !token.startsWith("%g") && !token.startsWith("%i")) return false;

	// Get the number after %r/%g
	const regNum = parseInt(token.slice(2));

	// Check if it's a valid number between 0 and 31
	return !isNaN(regNum) && regNum >= 0 && regNum <= 31;
}

function isImmediate(token: string, symbolTable?: MemoryMap): boolean {
    // Check if token exists in symbol table
    if (symbolTable?.has(token)) {
        return true;  // numberToTwosComplementBinary will handle overflow
    }

    const num: number = getImmediateValue(token, symbolTable);
    return !isNaN(num);  // Any number is valid, overflow will be handled
}

function getImmediateValue(token: string, symbolTable?: MemoryMap): number {
    // Handle pure binary numbers

    if (token.toLowerCase().endsWith('b') && !(token.toLowerCase().startsWith('0x')) && !/[+\-*/]/.test(token)) {
        const binPart = token.slice(0, -1);
        if (!/^[01]+$/.test(binPart)) return NaN;
        return twosComplementBinaryToNumber(binPart);
    }

    // Handle pure hexadecimal numbers
    if (token.toLowerCase().startsWith('0x') && !/[+\-*/]/.test(token)) {
        return unsignedHexToNumber(token);
    }

    // Handle pure symbol
    if (symbolTable?.has(token)) {
        return symbolTable.get(token)!.address;
    }

    if (/[+\-*/]/.test(token)) {
        try {
            let processedToken = token;
            if (symbolTable) {
                const sortedSymbols = Array.from(symbolTable.entries())
                    .sort((a, b) => b[0].length - a[0].length);
                
                for (const [symbol, entry] of sortedSymbols) {
                    const regex = new RegExp(`\\b${symbol}\\b`, 'g');
                    processedToken = processedToken.replace(regex, `(${entry.address})`);
                }
            }

            // Check for division by zero before evaluating
            if (/\/\s*0/.test(processedToken)) {
                error("Division by zero");
            }

            // Convert all numbers to decimal before evaluation
            processedToken = processedToken
                // Convert binary numbers
                .replace(/[01]+b/g, match => {
                    const binPart = match.slice(0, -1);
                    if (!/^[01]+$/.test(binPart)) error("Invalid binary");
                    const value = twosComplementBinaryToNumber(binPart);
                    return `(${value})`;
                })
                // Convert hex numbers
                .replace(/0x[0-9a-fA-F]+/g, match => {
                    const value = unsignedHexToNumber(match);
                    return `(${value})`;
                });

            // Evaluate the expression
            const result = eval(processedToken);
            
            if (typeof result === 'number' && !isNaN(result)) {
                return Math.floor(result);
            }
        } catch (e) {
            if (e instanceof Error && e.message === "Division by zero") {
                throw e;  // Re-throw division by zero error
            }
            error ("Error evaluating expression: " + e);
            return NaN;
        }
    }

    return /^\d+$/.test(token) ? parseInt(token) : NaN;
}

function tokenize(instruction: string): string[] {
    // Remove comments
    instruction = instruction.split("!")[0].trim();

    // Handle labels: Split on colon but keep it with the label
    const labelMatch = instruction.match(/^([^:]+:)/);
    let label = "";
    if (labelMatch) {
        label = labelMatch[1];
        instruction = instruction.substring(labelMatch[1].length).trim();
    }

    // Handle memory addresses: preserve content within brackets
    instruction = instruction.replace(/\[(.*?)\]/g, (match) => {
        // Remove spaces within brackets and keep brackets
        return "[" + match.slice(1, -1).replace(/\s+/g, "") + "]";
    });

    // First split instruction into parts, preserving commas
    const parts = instruction.match(/^(\S+)\s*(.*)/);
    if (!parts) {
        // If only instruction with no operands, handle normally
        const tokens = instruction.split(/\s+/).filter(Boolean);
        if (label) tokens.unshift(label);
        return tokens;
    }

    const [, instr, operands] = parts;
    
    // Split operands on commas, preserving arithmetic expressions
    const operandTokens = operands
        .split(/\s*,\s*/)  // Split on commas with optional whitespace
        .map(op => op.trim())
        .map(op => op.replace(/\s*([-+*/])\s*/g, "$1"))
        .filter(Boolean);

    // Combine the results
    let tokens = [instr, ...operandTokens];

    // Split on periods to handle directives
    tokens = tokens.map(token => {
        if (token.startsWith(".")) {
            return token;
        }
        return token.replace(/\./g, " .");
    }).flatMap(token => token.split(/\s+/));

    // Add label if it exists
    if (label) {
        tokens.unshift(label);
    }

    return tokens.filter(Boolean).map(token => token.replace(/[\s,]+/g, ''));
}

function isValidMemoryAddress(
	expr: string,
	storeInstruction: boolean = false,
	immediateOnly: boolean = false,
	noBrackets: boolean = false,
	symbolTable?: MemoryMap
): { valid: boolean; value?: number | string } {
	// Remove brackets if they exist
    if (noBrackets && expr.startsWith("[") && expr.endsWith("]")) 
        return { valid: false };
	const inner = expr.startsWith("[") && expr.endsWith("]") ? 
		expr.slice(1, -1).trim() : expr.trim();

	// Case 1: Pure arithmetic expression or immediate value - must be in brackets
	if (!inner.includes("%")) {
		if (!expr.startsWith("[") || !expr.endsWith("]")) {
			return { valid: false };
		}
		try {
			let processedToken = inner;
			
			// First convert binary and hex numbers
			processedToken = processedToken
				.replace(/[01]+b/g, match => {
					const binPart = match.slice(0, -1);
					if (!/^[01]+$/.test(binPart)) error("Invalid binary");
					const value = twosComplementBinaryToNumber(binPart);
					return `(${value})`;
				})
				.replace(/0x[0-9a-fA-F]+/g, match => {
					const value = unsignedHexToNumber(match);
					return `(${value})`;
				});

			// Then handle multiplication with symbols
			if (symbolTable) {
				// Handle multiplication first, including symbol multiplication
				processedToken = processedToken.replace(/(\w+)\s*\*\s*(\w+)/g, (match, a, b) => {
                    let aValue: number | undefined;
					let bValue: number | undefined;

					// Get values for both operands, checking for symbols first
					if (symbolTable.has(a)) {
						aValue = symbolTable.get(a)!.value ?? symbolTable.get(a)!.address;  // Use value if available
					} else if (a.toLowerCase().endsWith('b')) {
						aValue = twosComplementBinaryToNumber(a.slice(0, -1));
					} else if (a.toLowerCase().startsWith('0x')) {
						aValue = unsignedHexToNumber(a);
					} else if (!isNaN(Number(a))) {
						aValue = Number(a);
					}

					if (symbolTable.has(b)) {
						bValue = symbolTable.get(b)!.value ?? symbolTable.get(b)!.address;  // Use value if available
					} else if (b.toLowerCase().endsWith('b')) {
						bValue = twosComplementBinaryToNumber(b.slice(0, -1));
					} else if (b.toLowerCase().startsWith('0x')) {
						bValue = unsignedHexToNumber(b);
					} else if (!isNaN(Number(b))) {
						bValue = Number(b);
					}

					// If both values are numbers, multiply them
					if (typeof aValue === 'number' && typeof bValue === 'number') {
						const result = `(${aValue * bValue})`;
						return result;
					}
					return match;
				});

				// Then replace remaining symbols with their values (not addresses)
				const sortedSymbols = Array.from(symbolTable.entries())
					.sort((a, b) => b[0].length - a[0].length);
				
				for (const [symbol, entry] of sortedSymbols) {
					const regex = new RegExp(`\\b${symbol}\\b`, 'g');
					processedToken = processedToken.replace(regex, `(${entry.value ?? entry.address})`);
				}
			}

			const value = eval(processedToken);
			
			if (!isNaN(value)) {
				return { valid: true, value: value };  // numberToTwosComplementBinary will handle overflow
			}
		} catch (e) {
			error("Error evaluating memory address: " + e);
		}
		return { valid: false };
	}

	// If immediateOnly is true, return false for any expression containing registers
	if (immediateOnly) {
		return { valid: false };
	}

	// Case 2: Single register
	if ((inner.startsWith("%r") || inner.startsWith("%g") || inner.startsWith("%i")) && !inner.includes("+") && !inner.includes("-") && 
		!inner.includes("*") && !inner.includes("/")) {
		if (isRegister(inner)) {
			// For store instructions, a single register must not be in brackets
			if (storeInstruction && expr.startsWith("[")) {
				return { valid: false };
			}
			return { valid: true, value: inner };
		}
	}

	// Case 3: Register + Register
	if (!inner.includes("-") && !inner.includes("*") && !inner.includes("/")) {
		const parts = inner.split("+").map(p => p.trim());
		if (parts.length === 2) {
			if (isRegister(parts[0]) && isRegister(parts[1])) {
				return { valid: true, value: `${parts[0]}+${parts[1]}` };
			}
		}
	}

	// Case 4: Complex expression with register
	const regMatch = inner.match(/%r\d+|%g\d+|%i\d+/);
	if (regMatch) {
		const reg = regMatch[0];
		if (!isRegister(reg)) return { valid: false };

		// Get the arithmetic part by removing the register
		let arithmeticPart = inner;
		if (inner.startsWith(reg)) {
			arithmeticPart = inner.substring(reg.length).trim();
			if (!arithmeticPart.startsWith("+")) return { valid: false };
			arithmeticPart = arithmeticPart.substring(1);
		} else if (inner.endsWith(reg)) {
			arithmeticPart = inner.substring(0, inner.length - reg.length).trim();
			if (!arithmeticPart.endsWith("+")) return { valid: false };
			arithmeticPart = arithmeticPart.substring(0, arithmeticPart.length - 1);
		} else {
			// Register is in the middle of expression
			return { valid: false };
		}

		try {
			const value = getImmediateValue(arithmeticPart, symbolTable);
			if (!isNaN(value) && isImmediate(value.toString(), symbolTable)) {
				return { valid: true, value: `${reg}+${value}` };
			}
		} catch (e) {
			error("Error evaluating register expression: " + e);
		}
	}

	// Case 5: Pure arithmetic expression
	try {
		const value = getImmediateValue(inner, symbolTable);
		if (!isNaN(value) && isImmediate(value.toString(), symbolTable)) {
			return { valid: true, value: value };
		}
	} catch (e) {
		error("Error evaluating pure arithmetic: " + e);
	}

	return { valid: false };
}

function parseMemoryAddress(
	expr: string, 
	storeInstruction: boolean = false,
	immediateOnly: boolean = false, 
	symbolTable?: MemoryMap
): { valid: boolean, value?: MemoryAddressValue } | null {
	// First check if it's a memory address (surrounded by brackets)
	const isMemoryRef = expr.startsWith("[") && expr.endsWith("]");
	
	// Create a local copy of the symbol table that uses addresses for memory refs
	let localSymbolTable: MemoryMap | undefined;
	if (symbolTable && isMemoryRef) {
		localSymbolTable = new Map(
			Array.from(symbolTable.entries()).map(([key, entry]) => [
				key,
				{ ...entry, value: entry.address }  // Use address instead of value for memory refs
			])
		);
	} else {
		localSymbolTable = symbolTable;  // Use original table for non-memory refs
	}

	const validAddress = isValidMemoryAddress(expr, storeInstruction, immediateOnly, false, localSymbolTable);
	if (!validAddress.valid) return null;

	// Handle single register
	if (typeof validAddress.value === "string" && !validAddress.value.includes("+")) {
		return { 
			valid: true, 
			value: {
				type: 'register',
				register: validAddress.value
			}
		};
	}

	// Handle single immediate
	if (typeof validAddress.value === "number")
		return { 
			valid: true, 
			value: {
				type: 'immediate',
				immediate: validAddress.value
			}
		};

	// Handle combined values (reg+reg or reg+imm)
	if (typeof validAddress.value === "string" && validAddress.value.includes("+")) {
		const [first, second] = validAddress.value.split("+").map(s => s.trim());

		// Register + Register
		if (second.startsWith("%r") || second.startsWith("%g") || second.startsWith("%i")) {
			return { 
				valid: true, 
				value: {
					type: 'register-register',
					register: first,
					register2: second
				}
			};
		}

		// Register + Immediate
		if (first.startsWith("%r") || first.startsWith("%g") || first.startsWith("%i")) 
			return { 
				valid: true, 
				value: {
					type: 'register-immediate',
					register: first,
					immediate: parseInt(second)
				}
			};
	}

	return null;
}

function validJMPLOperand(
    expr: string,
    symbolTable?: MemoryMap
): { valid: boolean; register?: string; immediate?: number } {
    // Remove any whitespace
    expr = expr.trim();

    // Find the first register
    const regMatch = expr.match(/^%r\d+|%g\d+|%i\d+/);
    if (!regMatch || !isRegister(regMatch[0])) {
        return { valid: false };
    }

    const register = regMatch[0];
    const rest = expr.slice(register.length).trim();

    // Case 1: Single register
    if (!rest) {
        return { 
            valid: true,
            register,
            immediate: 0
        };
    }

    // Case 2: Register + Expression
    if (rest.startsWith('+')) {
        const immediateValue = getImmediateValue(rest.slice(1), symbolTable);
        if (isNaN(immediateValue)) {
            return { valid: false };
        }

        return {
            valid: true,
            register,
            immediate: immediateValue
        };
    }

    return { valid: false };
}
