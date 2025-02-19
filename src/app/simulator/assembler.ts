import type { MemoryMap } from "./types";
import {
	numberToUnsignedBinary,
	numberToTwosComplementBinary,
    twosComplementHexToNumber,
    twosComplementBinaryToNumber,
    binaryToHex
} from "../utils/helpers";

import { 
	instructionSet, 
	syntheticInstructions, 
	pseudoOps,
    Instruction,
    SyntheticInstruction,
    PseudoOp
} from "./instructions";

// Add the new interface
interface MemoryAddressValue {
    type: 'register' | 'immediate' | 'register-register' | 'register-immediate';
    register?: string;
    register2?: string;
    immediate?: number;
}

export { instructionSet, syntheticInstructions, pseudoOps };

export interface AssemblerOutput {
	machineCode: string[];
	symbolTable: MemoryMap;
}

export function assemble(code: string): AssemblerOutput {
	const lines = code.split("\n");
	const cleanInstructions = lines
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("!")); // Remove empty lines and comments
	// First pass: build symbol table
	const symbolTable = first_pass(cleanInstructions);
	// Second pass: generate machine code
	const machineCode = second_pass(cleanInstructions, symbolTable);
	if (machineCode.includes("NaN")) {
		throw new Error("Invalid instruction or operand");
	}
	return {
		machineCode,
		symbolTable,
	};
}

function first_pass(instructions: string[]): MemoryMap {
	const symbolMap: MemoryMap = new Map();
	let pc = 0;
	let assembling: boolean = false;

	for (const instruction of instructions) {
		const tokens = tokenize(instruction);
		if (!tokens.length) continue;

		if (tokens[0].endsWith(":")) {
			const label = tokens[0].slice(0, -1);
			if (!/\d/.test(label)) {
				// Store only the address
				symbolMap.set(label, { address: pc });
			}
			tokens.shift(); // Remove label from tokens
		}

		// Handle pseudo-ops
		if (tokens[0].slice(1) in pseudoOps) {
			switch (tokens[0]) {
				case ".begin":
					assembling = true;
					continue;
				case ".end":
					assembling = false;
					continue;
				case ".org":
					pc = parseInt(tokens[1]);
					continue;
			}
		}

		// Only increment PC for actual instructions
		if (tokens.length > 0 && assembling) {
			pc += 4; // Each instruction is 4 bytes
		}
	}
	return symbolMap;
}

function second_pass(instructions: string[], symbolTable: MemoryMap): string[] {
	const machineCode: string[] = [];
	let pc = 0;
	let assembling: boolean = false;
	for (const instruction of instructions) {
		const tokens = tokenize(instruction);
		if (!tokens.length) continue;

		// Skip labels
		if (tokens[0].endsWith(":")) {
			tokens.shift();
			if (!tokens.length) continue;
		}

		// Handle pseudo-ops
		if (tokens[0].slice(1) in pseudoOps) {
			switch (tokens[0]) {
				case ".begin":
					assembling = true;
					continue;
				case ".end":
					assembling = false;
					continue;
				case ".org":
					pc = parseInt(tokens[1]);
					continue;
			}
		}
		if (!assembling) continue;

		// Handle actual instructions
		const baseInstruction = tokens[0];

        

		if (baseInstruction in instructionSet) {
			const encoded = encode_instruction(tokens, symbolTable, pc);
			if (encoded !== null) {
				machineCode.push(encoded);
				pc += 4;
			} else {
				throw new Error("Invalid instruction: " + instruction);
			}
		} else if (instruction in syntheticInstructions) {
			const expanded = expand_synthetic(tokens, symbolTable);
			for (const synthetic of expanded) {
				const encoded = encode_instruction(synthetic, symbolTable, pc);
				if (encoded !== null) {
					machineCode.push(encoded);
					pc += 4;
				} else {
					throw new Error("Invalid instruction: " + instruction);
				}
			}
		} else if (tokens.length == 1 && isImmediate(tokens[0], symbolTable)) {
			machineCode.push(numberToTwosComplementBinary(getImmediateValue(tokens[0], symbolTable), 32));
			pc += 4;
		} else {
			throw new Error("Invalid instruction: " + instruction);
		}
	}
    if (assembling) {
        throw new Error("Unterminated block, expecting .end");
    }
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
		throw new Error("Invalid instruction: " + baseInstruction);

	switch (instruction.op_code) {
		case "00":
            if (baseInstruction == "sethi" && tokens.length == 3) {
                if (!isImmediate(tokens[1], symbolTable) || !isRegister(tokens[2]))
                    throw new Error("Invalid operands: " + tokens.slice(1).join(" "));

                const imm22: string = numberToTwosComplementBinary(getImmediateValue(tokens[1], symbolTable), 22);
                const op2: string = instruction.op2_code;
                const rd: string = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
                return "00" + rd + op2 + imm22;
            }else if (baseInstruction != "sethi" && tokens.length == 2) {
                if (!isImmediate(tokens[1],symbolTable))
                    throw new Error("Invalid operand: " + tokens.slice(1).join(" "));

                const mem22: number = getImmediateValue(tokens[1], symbolTable);
                const disp22: string = numberToTwosComplementBinary(mem22 - currentPc, 22);
                const op2: string = instruction.op2_code;
                const cond: string = instruction.cond_code; 

                return "000" + cond + op2 + disp22;
            }
            return null;
		case "01":
			return null;
		case "10":
			if (instruction.operands === 3) {
				if (tokens.length != 4) throw new Error("Invalid operands: " + tokens.join(" "));

				if (isRegister(tokens[1]) && isRegister(tokens[2]) && isRegister(tokens[3])) {
					const rd: string = numberToUnsignedBinary(parseInt(tokens[3].slice(2)), 5);
					const rs1: string = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
					const rs2: string = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
					return "10" + rd + instruction.op3_code + rs1 + "0".repeat(9) + rs2;
				} else if (
					isRegister(tokens[1]) && 
					(isImmediate(tokens[2], symbolTable) || symbolTable.has(tokens[2])) && 
					isRegister(tokens[3])
				) {
					const rd: string = numberToUnsignedBinary(parseInt(tokens[3].slice(2)), 5);
					const rs1: string = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
					const value = symbolTable.has(tokens[2]) 
						? (symbolTable.get(tokens[2])!.value ?? symbolTable.get(tokens[2])!.address)
						: getImmediateValue(tokens[2], symbolTable);
					const simm13: string = numberToTwosComplementBinary(value, 13);
					return "10" + rd + instruction.op3_code + rs1 + "1" + simm13;
				}
			}
			throw new Error("Invalid operands: " + tokens.join(" "));
		case "11":
			if (tokens.length < 3)
				throw new Error("Invalid operands: " + tokens.join(" "));

			const store_instruction = instruction.store_instruction;
			const memory_parameter = instruction.memory_param;
			
			if (tokens.length == 3) {
				// Handle [address] format
				const memory_address = parseMemoryAddress(tokens[memory_parameter], store_instruction, false, symbolTable);
				
				if (memory_parameter != 0 && !memory_address?.valid) {
					throw new Error("Invalid memory address: " + tokens[memory_parameter]);
				}

				if (store_instruction && !isRegister(tokens[1])) 
					throw new Error("Invalid operand: " + tokens[1]);

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
								5
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
							throw new Error("Invalid memory address: " + tokens[3]);
						}

						const rd = numberToUnsignedBinary(parseInt(tokens[1].slice(2)), 5);
						const rs1 = numberToUnsignedBinary(parseInt(tokens[2].slice(2)), 5);
						const simm13 = numberToTwosComplementBinary(memory_address.value.immediate, 13);
						return "11" + rd + instruction.op3_code + rs1 + "1" + simm13;
					}
				}

				// Return null if load instruction and any operand contains square brackets (memory address)
				if (!store_instruction && tokens.some((token) => token.includes("["))) {
					throw new Error("Invalid Operands: " + tokens.join(" "));
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
								symbolTable
						  ).valid
						: false;
				const isSecondReg = isRegister(
					memory_parameter == 2 ? tokens[3] : tokens[2]
				);
				const isSecondImm =
					isImmediate(memory_parameter == 2 ? tokens[3] : tokens[2], symbolTable) ||
					store_instruction
						? isValidMemoryAddress(
								memory_parameter == 2 ? tokens[3] : tokens[2],
								store_instruction,
								false,
								symbolTable
						  ).valid
						: false;

                // Check for false operands; must be at least one register and no more than one immediate
				if ((!isFirstReg && !isFirstImm) ||
					(!isSecondReg && !isSecondImm) ||
					(isFirstImm && isSecondImm) ||
					(!isFirstReg && !isSecondReg)) {
					throw new Error("Invalid Operands: " + tokens.join(" "));
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
					throw new Error("Invalid Operands: " + tokens.join(" "));
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
                    const simm13_value = parseMemoryAddress(tokens[memory_parameter == 2 ? 3 : 2], false, true, symbolTable);
                    if (simm13_value === null || typeof simm13_value.value != "number") {
                        throw new Error("Invalid Operands: " + tokens.join(" "));
                    }
					// Immediate-Register format
					const simm13 = numberToTwosComplementBinary(
						simm13_value.value,
						13
					);
					return "11" + rd + instruction.op3_code + rs1 + "1" + simm13;
				}
			}
			throw new Error("Invalid operands: " + tokens.join(" "));
	}
	return null;
}

function expand_synthetic(
	tokens: string[],
	symbolTable: MemoryMap
): string[][] {
	if (tokens.length === 0) return [];

	const opcode = tokens[0].toLowerCase();
	const synthetic = syntheticInstructions[opcode as SyntheticInstruction];

	if (!synthetic) return [];

	// For now, return an empty array
	// This will be expanded in the next implementation
	return [tokens];
}

function isRegister(token: string): boolean {
	// Check if token starts with %r
	if (!token.startsWith("%r")) return false;

	// Get the number after %r
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
    if (token.toLowerCase().endsWith('b') && !/[+\-*/]/.test(token)) {
        const binPart = token.slice(0, -1);
        if (!/^[01]+$/.test(binPart)) return NaN;
        return twosComplementBinaryToNumber(binPart);
    }

    // Handle pure hexadecimal numbers
    if (token.toLowerCase().startsWith('0x') && !/[+\-*/]/.test(token)) {
        return twosComplementHexToNumber(token);
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

            // Convert all numbers to decimal before evaluation
            processedToken = processedToken
                // Convert binary numbers
                .replace(/[01]+b/g, match => {
                    const binPart = match.slice(0, -1);
                    if (!/^[01]+$/.test(binPart)) throw new Error("Invalid binary");
                    const value = twosComplementBinaryToNumber(binPart);
                    return `(${value})`;
                })
                // Convert hex numbers
                .replace(/0x[0-9a-fA-F]+/g, match => {
                    const value = twosComplementHexToNumber(match);
                    return `(${value})`;
                });

            // Evaluate the expression
            const result = eval(processedToken);
            
            if (typeof result === 'number' && !isNaN(result)) {
                return Math.floor(result);
            }
        } catch (e) {
            console.log("Error evaluating expression:", e);
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

	// Handle arithmetic expressions after registers
	instruction = instruction.replace(/%r\d+\s*[-+*/\d\s]+/g, (match) => {
		// Remove spaces in arithmetic expressions
		return match.replace(/\s+/g, "");
	});

	// Remove commas
	instruction = instruction.replace(/,/g, " ");

	// Split on spaces and filter out empty strings
	const tokens = instruction.split(/\s+/).filter(Boolean);

	// Add label if it exists
	if (label) {
		tokens.unshift(label);
	}

	return tokens;
}

function isValidMemoryAddress(
	expr: string,
	storeInstruction: boolean = false,
	immediateOnly: boolean = false,
	symbolTable?: MemoryMap
): { valid: boolean; value?: number | string } {
	// Remove brackets if they exist
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
					if (!/^[01]+$/.test(binPart)) throw new Error("Invalid binary");
					const value = twosComplementBinaryToNumber(binPart);
					return `(${value})`;
				})
				.replace(/0x[0-9a-fA-F]+/g, match => {
					const value = twosComplementHexToNumber(match);
					return `(${value})`;
				});

			// Then handle multiplication with symbols
			if (symbolTable) {
				// Handle multiplication first, including symbol multiplication
				processedToken = processedToken.replace(/(\w+)\s*\*\s*(\w+)/g, (match, a, b) => {
					console.log("Multiplication match:", match);
					console.log("a:", a, "b:", b);
					
					let aValue: number | undefined;
					let bValue: number | undefined;

					// Get values for both operands, checking for symbols first
					if (symbolTable.has(a)) {
						aValue = symbolTable.get(a)!.value ?? symbolTable.get(a)!.address;  // Use value if available
						console.log("Symbol a:", a, "=", aValue);
					} else if (a.toLowerCase().endsWith('b')) {
						aValue = twosComplementBinaryToNumber(a.slice(0, -1));
						console.log("Binary a:", a, "=", aValue);
					} else if (a.toLowerCase().startsWith('0x')) {
						aValue = twosComplementHexToNumber(a);
						console.log("Hex a:", a, "=", aValue);
					} else if (!isNaN(Number(a))) {
						aValue = Number(a);
						console.log("Number a:", a, "=", aValue);
					}

					if (symbolTable.has(b)) {
						bValue = symbolTable.get(b)!.value ?? symbolTable.get(b)!.address;  // Use value if available
						console.log("Symbol b:", b, "=", bValue);
					} else if (b.toLowerCase().endsWith('b')) {
						bValue = twosComplementBinaryToNumber(b.slice(0, -1));
						console.log("Binary b:", b, "=", bValue);
					} else if (b.toLowerCase().startsWith('0x')) {
						bValue = twosComplementHexToNumber(b);
						console.log("Hex b:", b, "=", bValue);
					} else if (!isNaN(Number(b))) {
						bValue = Number(b);
						console.log("Number b:", b, "=", bValue);
					}

					// If both values are numbers, multiply them
					if (typeof aValue === 'number' && typeof bValue === 'number') {
						const result = `(${aValue * bValue})`;
						console.log("Multiplication result:", result);
						return result;
					}
					console.log("Could not evaluate multiplication");
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
			console.log("Error evaluating memory address:", e);
		}
		return { valid: false };
	}

	// If immediateOnly is true, return false for any expression containing registers
	if (immediateOnly) {
		return { valid: false };
	}

	// Case 2: Single register
	if (inner.startsWith("%r") && !inner.includes("+") && !inner.includes("-") && 
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
	const regMatch = inner.match(/%r\d+/);
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
			console.log("Error evaluating register expression:", e);
		}
	}

	// Case 5: Pure arithmetic expression
	try {
		const value = getImmediateValue(inner, symbolTable);
		if (!isNaN(value) && isImmediate(value.toString(), symbolTable)) {
			return { valid: true, value: value };
		}
	} catch (e) {
		console.log("Error evaluating pure arithmetic:", e);
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

	const validAddress = isValidMemoryAddress(expr, storeInstruction, immediateOnly, localSymbolTable);
	if (!validAddress.valid || !validAddress.value) return null;

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
	if (typeof validAddress.value === "number") {
		return { 
			valid: true, 
			value: {
				type: 'immediate',
				immediate: validAddress.value
			}
		};
	}

	// Handle combined values (reg+reg or reg+imm)
	if (typeof validAddress.value === "string" && validAddress.value.includes("+")) {
		const [first, second] = validAddress.value.split("+").map(s => s.trim());

		// Register + Register
		if (second.startsWith("%r")) {
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
		if (first.startsWith("%r")) {
			return { 
				valid: true, 
				value: {
					type: 'register-immediate',
					register: first,
					immediate: parseInt(second)
				}
			};
		}
	}

	return null;
}

// Test cases:
if (require.main === module) {
	const testSymbolTable = new Map([
		['START', { address: 2048 }],
		['END', { address: 2052 }],
		['OFFSET', { address: 2056 }],
	]);

	const memoryTests = [
		["ld", "[24+2*24-24]", "%r2"],
        ["ld", "%r1+4+44-4*3", "%r2"],
        ["add", "%r1", "100110b", "%r2"],
        ["st", "%r0", "[2084]"],
        ["st", "%r2", "%r0", "%r1"],
        ["st", "%r2", "%r0", "[2100]"],
        ["ld", "[0xff]", "%r2"],
        ["ld", "[0xff+0x10]", "%r2"],
        ["ld", "[%r1+0xa0]", "%r2"],
        ["st", "%r2", "[0xfff]"],
        ["add", "%r1", "0xff", "%r2"],
        ["ld", "[24+0xa*2]", "%r2"],
        ["ld", "[0xa+%r1]", "%r2"],
        ["ld", "[1010b]", "%r2"],
        ["ld", "[1010b+0x10]", "%r2"],
        ["ld", "[%r1+1100b]", "%r2"],
        ["st", "%r2", "[1111b]"],
        ["add", "%r1", "1010b", "%r2"],
        ["ld", "[24+1010b*2]", "%r2"],
        ["ld", "[1010b+%r1]", "%r2"],
        ["ld", "[START]", "%r2"],                    // Load from symbol
        ["ld", "[START+0x10]", "%r2"],              // Symbol + hex
        ["ld", "[%r1+OFFSET]", "%r2"],              // Register + symbol
        ["st", "%r2", "[END]"],                     // Store to symbol
        ["add", "%r1", "START", "%r2"],             // ALU with symbol
        ["ld", "[START+OFFSET*2]", "%r2"],          // Symbol arithmetic
	];

	console.log("Memory Instruction Tests:");
	memoryTests.forEach((test) => {
		try {
			const result = encode_instruction(test, testSymbolTable, 0);
			if (result === null) {
				console.log(`Testing ${test.join(" ")}: `, "Invalid");
			} else {
				console.log(`Testing ${test.join(" ")}: `, binaryToHex(result) + ", " + result);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.log(`Testing ${test.join(" ")}: Error - ${message}`);
		}
	});
    console.log(assemble(".begin\n.org 2048\nx: 24\nld [x+2*x-24], %r1\n .end"))
    
}
