# arc-tools-web

A web adaptation of [ARCTools](https://iiusatech.com/murdocca/CAO/) originally made in Java.

![image](https://github.com/user-attachments/assets/9c34b489-d859-44bb-9529-885c0c8d56ca)

## Description

arc-tools-web is an interactive web-based simulator for the ARC (a subset of the [SPARC](https://en.wikipedia.org/wiki/SPARC) instruction set) assembly language. Write, assemble, run, and debug ARC assembly code directly in your browser.

### Features

- Updates to dated original version of ARCTools written in Java
    - Fixed crashes
    - Improved code editor
    - Improved error handling
    - Cleaner UI
- Integrated Assembly Code Editor ([using the Monaco Editor](https://microsoft.github.io/monaco-editor/))
    - Syntax highlighting and auto-completion for ARC assembly language
    - Line numbers and error highlighting
- Full Client-Side CPU Simulation
    - Complete implementation of the ARC instruction set
    - View and modify all 32 general-purpose registers
    - Monitor and control program counter, trap base register, and condition codes
    - Execute step-by-step or run continuously
    - Set breakpoints for debugging
- Memory Inspection
    - Up to 4GB memory space, using 4KB page size
    - View memory contents in real-time
    - Display values in hexadecimal or decimal format
- I/O Simulation
    - Console output for program interaction
    - Keyboard input support
- File Operations
    - Create, open, and save assembly files
    - Load pre-assembled binary files
    - Automatic assembly of code to machine code
- Debugging Tools
    - Step through code instruction by instruction
    - Run until breakpoint
    - Clear registers and memory

### Instructions

| SETHI/BRANCH | CALL | ALU | MEMORY |
|--------------|------|-----|---------|
| sethi | call | add | ld |
| ba | | addcc | ldsb |
| bcc | | and | ldsh |
| bcs | | andcc | ldub |
| be | | andn | lduh |
| bg | | andncc | st |
| bge | | jmpl | stb |
| bgu | | or | sth |
| bl | | orcc | halt |
| ble | | orn | |
| bleu | | orncc | |
| bn | | rd | |
| bne | | rett | |
| bneg | | sll | |
| bpos | | sra | |
| bvc | | srl | |
| bvs | | sub | |
| | | subcc | |
| | | ta | |
| | | wr | |
| | | xnor | |
| | | xnorcc | |
| | | xor | |
| | | xorcc | |

#### Synthetic Instructions

| Instruction | Base Instruction |
|-------------|------------------|
| not | xnor param1, %r0, param2 |
| neg | sub %r0, param1, param2 |
| inc | add param1, 1, param1 |
| dec | sub param1, 1, param1 |
| clr | and param1, %r0, param1 |
| cmp | subcc param1, param2, %r0 |
| tst | orcc %r0, param1, %r0 |
| mov | or %r0, param1, param2 |
| nop | sethi 0, %r0 |

## Getting Started

### Online Version

Use the simulator directly in your browser without installation: [Arc Assembly Simulator](https://rivanjarjes.com/arc-simulator)

### Local Development

To run the simulator locally:


1. Clone the repository:
   ```
   git clone https://github.com/RivanJarjes/arc-tools-web.git
   cd arc-tools-web
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser


## Supported Instructions

The simulator supports the full ARC instruction set including:

- Arithmetic operations (add, sub, etc.)
- Logical operations (and, or, xor, etc.)
- Memory operations (ld, st, ldub, stb, etc.)
- Branch instructions (ba, be, bne, etc.)
- System calls through traps


## Technology Stack

- **Frontend**: Next.js, React
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Styling**: Tailwind CSS
- **Icons**: [Font Awesome](https://fontawesome.com/)

## Limitations

- The simulator is designed for educational purposes and may not implement all edge cases
- Performance may be limited for very large programs
- Some advanced features of hardware ARC implementations may not be available (most trapping cases for example)

## Future Improvements

- Add entire SPARC instruction-set
- Add assembly to binary instruction visualizer similar to [original Arc-Tools](https://github.com/user-attachments/assets/41905445-2d8f-4bbc-9c9d-cbba80b4c20d)
