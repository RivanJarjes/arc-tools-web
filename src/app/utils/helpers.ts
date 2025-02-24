export function numberToUnsignedBinary(
    num: number, 
    bits: number = 32
) : string {
    if (!Number.isFinite(num) || !Number.isInteger(num)) 
        num = 0;

    const max = 2 ** bits;

    if (num < 0 || num >= max) 
        num = ((num % max) + max) % max;

    const output: string = num.toString(2);
    return (num <= 2**bits - 1 ? "0".repeat(bits - output.length) : "") + output;
}

export function numberToOnesComplementBinary(
    num: number, 
    bits: number = 32
) : string {
    if (!Number.isFinite(num) || !Number.isInteger(num)) 
        num = 0;

    const mod = 2 ** bits - 1;
    const maxPos = 2 ** (bits - 1) - 1;

    if (num === 0) return "0".repeat(bits);

    num = ((num % mod) + mod) % mod;

    if (num > maxPos) num = num - mod;

    let output: string = Math.abs(num).toString(2);
    output = "0".repeat(bits - output.length) + output;

    if (num < 0) 
        output = output.split('')
            .map(bit => bit === '0' ? '1' : '0')
            .join('');

    return output;
}

export function numberToTwosComplementBinary(num: number, bits: number = 32) : string {
    if (!Number.isFinite(num) || !Number.isInteger(num)) 
        num = 0;
      
    const mod = 2 ** bits;
    num = ((num % mod) + mod) % mod;
    const bin = num.toString(2);
    return "0".repeat(bits - bin.length) + bin;
}

export function binaryAddition(binary1: string, binary2: string, bits: number = 32) : string {
    if (!binary1) binary1 = "0";
    if (!binary2) binary2 = "0";

    binary1 = binary1.trim();
    binary2 = binary2.trim();

    if (!/^[01]+$/.test(binary1) || !/^[01]+$/.test(binary2)) 
        throw new Error("Inputs must be binary strings (containing only 0 and 1)");

    if (binary1.length > bits || binary2.length > bits) 
        throw new Error("Binary numbers must not exceed the specified bit length");

    const pad = (s: string) => "0".repeat(bits - s.length) + s;
    const arr1 = pad(binary1).split("");
    const arr2 = pad(binary2).split("");
    let carry = 0;

    for (let i = bits - 1; i >= 0; i--) {
        const sum = parseInt(arr1[i]) + parseInt(arr2[i]) + carry;
        arr1[i] = (sum % 2).toString();
        carry = Math.floor(sum / 2);
    }

    if (carry) 
        console.warn("Overflow detected in binaryAddition");

    return arr1.join("");
}

export function unsignedBinaryToNumber(binary: string): number {
    const bin = binary.trim();

    if (!/^[01]+$/.test(bin)) 
        throw new Error("Invalid binary string");

    return parseInt(bin, 2);
}

export function onesComplementBinaryToNumber(binary: string): number {
    const bin = binary.trim();

    if (!/^[01]+$/.test(bin)) 
        throw new Error("Invalid binary string");

    if (bin[0] === "0") 
        return parseInt(bin, 2);
    else {
      if (/^1+$/.test(bin)) 
        return 0;

      const inverted = bin
        .split("")
        .map((b) => (b === "0" ? "1" : "0"))
        .join("");
      const magnitude = parseInt(inverted, 2);
      return -magnitude;
    }
}

export function twosComplementBinaryToNumber(binary: string): number {
    const bin = binary.trim();

    if (!/^[01]+$/.test(bin)) 
        throw new Error("Invalid binary string");
    
    const bits = bin.length;
    const value = parseInt(bin, 2);

    if (bin[0] === "0") 
        return value;
    else 
        return value - 2 ** bits;
}

export function hexToBinary(hex: string, bits?: number): string {
    let normalized = hex.trim().toLowerCase();

    if (normalized.startsWith("0x"))
        normalized = normalized.slice(2);

    let bin = normalized
        .split("")
        .map((digit) => {
            const n = parseInt(digit, 16);
                if (isNaN(n)) 
                    throw new Error("Invalid hex digit");

            return n.toString(2).padStart(4, "0");
        })
      .join("");

    if (bits !== undefined) 
        if (bin.length < bits) 
            bin = "0".repeat(bits - bin.length) + bin;
        else if (bin.length > bits) 
            bin = bin.slice(-bits);

    return bin;
}

export function binaryToHex(binary: string, digits?: number): string {
    const bin = binary.trim();

    if (!/^[01]+$/.test(bin)) 
        throw new Error("Invalid binary string");

    const padLength = (4 - (bin.length % 4)) % 4;
    const padded = "0".repeat(padLength) + bin;
    let hex = "";

    for (let i = 0; i < padded.length; i += 4) {
        const nibble = padded.slice(i, i + 4);
        hex += parseInt(nibble, 2).toString(16);
    }

    if (digits !== undefined) 
        if (hex.length < digits) 
            hex = "0".repeat(digits - hex.length) + hex;
        else if (hex.length > digits) 
            hex = hex.slice(-digits);

    return hex;
}

export function unsignedHexToNumber(hex: string): number {
    let normalized = hex.trim().toLowerCase();

    if (normalized.startsWith("0x")) 
        normalized = normalized.slice(2);

    return parseInt(normalized, 16);
}

export function onesComplementHexToNumber(hex: string, bits?: number): number {
    const bin = hexToBinary(hex, bits);
    return onesComplementBinaryToNumber(bin);
}

export function twosComplementHexToNumber(hex: string, bits?: number): number {
    const bin = hexToBinary(hex, bits);
    return twosComplementBinaryToNumber(bin);
}

export function numberToUnsignedHex(num: number, bits?: number): string {
    let bin = numberToUnsignedBinary(num, bits);

    if (bits) 
        bin = bin.padStart(bits, "0");

    const digits = bits ? Math.ceil(bits / 4) : undefined;
    return binaryToHex(bin, digits);
}

export function numberToOnesComplementHex(num: number, bits?: number): string {
    const bin = numberToOnesComplementBinary(num, bits);
    const digits = bits ? Math.ceil(bits / 4) : undefined;
    return binaryToHex(bin, digits);
}
  
export function numberToTwosComplementHex(num: number, bits?: number): string {
    const bin = numberToTwosComplementBinary(num, bits);
    const digits = bits ? Math.ceil(bits / 4) : undefined;
    return binaryToHex(bin, digits);
}

const helpers = {
    numberToUnsignedBinary,
    numberToOnesComplementBinary,
    numberToTwosComplementBinary,
    binaryAddition,
    unsignedBinaryToNumber,
    onesComplementBinaryToNumber,
    twosComplementBinaryToNumber,
    hexToBinary,
    binaryToHex,
    unsignedHexToNumber,
    onesComplementHexToNumber,
    twosComplementHexToNumber,
    numberToUnsignedHex,
    numberToOnesComplementHex,
    numberToTwosComplementHex,
};

export default helpers;


