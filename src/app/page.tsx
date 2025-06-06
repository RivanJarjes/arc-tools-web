"use client";

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect, useCallback } from 'react';
import { assemble } from './simulator/assembler';
import { RegistersView } from './components/display/RegistersView';
import { CPUInfo } from './components/display/CPUInfo';
import { MemoryView } from './components/display/MemoryView';
import { Terminal } from './components/display/Terminal';
import { Simulator } from './simulator/simulator';
import { twosComplementHexToNumber, numberToTwosComplementHex } from './utils/helpers';
import { isClient, getWindow } from './utils/client';

const Editor = dynamic(() => import('./components/Editor/Editor'), { 
  ssr: false 
});

// Types for the File System Access API
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

interface ShowSaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

interface CCRUpdate {
  n: boolean | undefined;
  z: boolean | undefined;
  v: boolean | undefined;
  c: boolean | undefined;
}

const CONTAINER_HEIGHT = 600; // Total height of editor + terminal

// Cookie utility functions for editor content
function saveEditorContentToCookie(content: string) {
  try {
    // Save only first 4KB to avoid cookie size limits
    const truncatedContent = content.length > 4096 ? content.substring(0, 4096) : content;
    const expires = new Date();
    expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    document.cookie = `editorContent=${encodeURIComponent(truncatedContent)};expires=${expires.toUTCString()};path=/`;
  } catch (error) {
    console.error('Error saving editor content to cookie:', error);
  }
}

function getEditorContentFromCookie(): string | null {
  try {
    const nameEQ = 'editorContent=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const encodedContent = c.substring(nameEQ.length, c.length);
        return decodeURIComponent(encodedContent);
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading editor content from cookie:', error);
    return null;
  }
}

export default function Home() {
  const [simulator] = useState(() => new Simulator());
  const cpu = simulator.getCPU();
  const [code, setCode] = useState('');
  const [binaryCode, setBinaryCode] = useState('');
  const [activeTab, setActiveTab] = useState<'assembly' | 'binary' | 'examples'>('assembly');
  const [assemblyError, setAssemblyError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(120);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const [terminalHistory, setTerminalHistory] = useState<string>('Ready to assemble');
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [leftContainerWidth, setLeftContainerWidth] = useState(50); // percentage
  const [isResizingContainers, setIsResizingContainers] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const [registers, setRegisters] = useState<string[]>(Array(32).fill('00000000'));
  const [assemblerLogs, setAssemblerLogs] = useState<string[]>([]);
  const [programCounter, setProgramCounter] = useState(() => 
    numberToTwosComplementHex(cpu.getPC(), 32)
  );
  const [trapBaseRegister, setTrapBaseRegister] = useState(() => 
    numberToTwosComplementHex(cpu.getTrapBaseRegister(), 32)
  );
  const [enableTraps, setEnableTraps] = useState(() => cpu.getEnableTraps());
  const [cpuFlags, setCpuFlags] = useState({
    negative: false,
    zero: false,
    overflow: false,
    carry: false
  });
  const [displayMode, setDisplayMode] = useState<'hex' | 'dec'>('hex');
  const [memoryVersion, setMemoryVersion] = useState(0);
  const [baseLocation, setBaseLocation] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);
  const [exampleFiles, setExampleFiles] = useState<{name: string, path: string}[]>([]);
  const [isEditorContentLoaded, setIsEditorContentLoaded] = useState(false);

  // Fetch example files when component mounts
  useEffect(() => {
    // List of example files in the public directory
    const examples = [
      'division.asm',
      'exponent.asm',
      'get_iee754_exponent.asm',
      'hextest.asm',
      'instructiontest.asm',
      'load_addition.asm',
      'loadtest.asm',
      'multiplication.asm',
      'storetest.asm',
      'subtest.asm',
      'single_digit_calculator.asm',
    ];
    
    setExampleFiles(examples.map(file => ({
      name: file.replace('.asm', ''),
      path: `/${file}`
    })));
  }, []);

  // Initialize the editor content from cookie when the component mounts
  useEffect(() => {
    if (isClient) {
      const savedContent = getEditorContentFromCookie();
      if (savedContent) {
        setCode(savedContent);
      }
      setIsEditorContentLoaded(true);
    }
  }, []);
  
  // Save editor content to cookie whenever it changes
  useEffect(() => {
    if (isClient && isEditorContentLoaded) {
      const timeoutId = setTimeout(() => {
        saveEditorContentToCookie(code);
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [code, isEditorContentLoaded]);

  // Function to load an example file
  const handleLoadExample = async (path: string) => {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load example file: ${response.statusText}`);
      }
      const content = await response.text();
      setCode(content);
      saveEditorContentToCookie(content); // Save to cookie when example is loaded
      setActiveTab('assembly');
      setTerminalHistory(`Loaded example: ${path.split('/').pop()}`);
    } catch (error) {
      console.error('Error loading example:', error);
      setTerminalHistory(`Error loading example: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const simulationTerminalHeight = 120; 
  
  // Calculate editor height to balance with the left side
  const getEditorHeight = () => {
    // Account for tabs (35px), file menu (30px), resize handle (8px), and padding
    const nonTerminalHeight = 35 + 30 + 8 + 16; // 16px for padding
    return CONTAINER_HEIGHT - terminalHeight - nonTerminalHeight;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = terminalHeight;
  };

  useEffect(() => {
    // Only run in browser environment
    if (!isClient) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate delta (negative when moving up, positive when moving down)
      const delta = e.clientY - startYRef.current;
      
      // Calculate new height and limit the range to prevent terminal from becoming too small or too large
      const newHeight = Math.max(5, Math.min(CONTAINER_HEIGHT - 150, startHeightRef.current - delta));
      
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Add a class to the body to prevent text selection during resize
      document.body.classList.add('resize-y');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-y');
    };
  }, [isDragging]);

  // Add click outside handler
  useEffect(() => {
    if (!isClient) return;
    
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // container resizing
  useEffect(() => {
    if (!isClient) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingContainers) return;
      
      const delta = e.clientX - startXRef.current;
      const containerWidth = document.querySelector('.container')?.clientWidth || 0;
      const percentageDelta = (delta / containerWidth) * 100;
      const newWidth = Math.min(Math.max(39.5, startWidthRef.current + percentageDelta), 83);
      setLeftContainerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingContainers(false);
    };

    if (isResizingContainers) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingContainers]);

  // container resizing
  useEffect(() => {
    // Only run in browser environment
    if (!isClient) return;
    
    // Add a class to the body when resizing to prevent text selection
    if (isResizingContainers) {
      document.body.classList.add('resize-x');
    } else {
      document.body.classList.remove('resize-x');
    }
  }, [isResizingContainers]);

  // Add handler for container resize
  const handleContainerResizeStart = (e: React.MouseEvent) => {
    setIsResizingContainers(true);
    startXRef.current = e.clientX;
    startWidthRef.current = leftContainerWidth;
  };

  const addLog = (message: string) => {
    // Only add logs that start with '_' and remove the prefix
    if (message.startsWith('_')) {
      setAssemblerLogs(prev => [...prev, message.substring(1)]);
    }
  };

  const handleAssemble = () => {
    try {
      setAssemblerLogs([]);
      
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        if (message.startsWith('_')) {
          addLog(message);
        }
        originalConsoleLog.apply(console, args);
      };

      // Check for empty code
      if (!code.trim()) {
        setAssemblyError('Cannot assemble empty code');
        setTerminalHistory('Cannot assemble empty code');
        setBinaryCode('');
        return;
      }

      setAssemblyError(null);
      // Clear binary code and switch to assembly tab before assembling
      setBinaryCode('');
      if (activeTab !== 'assembly') {
        setActiveTab('assembly');
      }
      
      const assembled = assemble(code);
      console.log('Assembled code:', assembled);
      setBinaryCode(assembled.machineCode);
      setTerminalHistory('Assembled Successfully');
      
      // Restore original console.log
      console.log = originalConsoleLog;

      setTimeout(() => {
        setActiveTab('binary');
      }, 1000);
    } catch (error) {
      console.error('Assembly error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAssemblyError(errorMessage);
      setTerminalHistory(errorMessage);
      // Clear binary code on error
      setBinaryCode('');
    }
  };

  const handleTabChange = (tab: 'assembly' | 'binary' | 'examples') => {
    if (tab === 'binary' && !binaryCode) return;
    setActiveTab(tab);
  };

  // Add file operation handlers
  const handleNewFile = () => {
    setCode('');
    saveEditorContentToCookie(''); // Clear cookie as well
    setBinaryCode('');
    setTerminalHistory('Ready to assemble');
    setIsFileMenuOpen(false);
  };

  const handleOpenFile = () => {
    if (!isClient) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asm';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          setCode(content);
          saveEditorContentToCookie(content); // Save to cookie when file is loaded
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setIsFileMenuOpen(false);
  };

  const handleSaveAs = () => {
    if (!isClient) return;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.asm';

    // Type guard for showSaveFilePicker
    const win = getWindow();
    if (win && 'showSaveFilePicker' in win) {
      // Modern browsers with File System Access API
      (win.showSaveFilePicker as (options: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>)({
        suggestedName: 'program.asm',
        types: [{
          description: 'Assembly File',
          accept: { 'text/plain': ['.asm'] }
        }]
      }).then(async (handle: FileSystemFileHandle) => {
        const writable = await handle.createWritable();
        await writable.write(code);
        await writable.close();
      }).catch(() => {
        // Fallback to traditional method if user cancels or browser doesn't support
        a.click();
      });
    } else {
      // Fallback for browsers that don't support showSaveFilePicker
      a.click();
    }
    URL.revokeObjectURL(url);
    setIsFileMenuOpen(false);
  };

  const handleRegisterChange = (index: number, value: string) => {
    // Only allow hex values and pad to 8 characters
    const sanitizedValue = value.replace(/[^0-9A-Fa-f]/g, '').padStart(8, '0');
    
    // Update the display state
    const newRegisters = [...registers];
    newRegisters[index] = sanitizedValue;
    setRegisters(newRegisters);
    
    // Update the CPU register (convert hex string to number)
    const numValue = parseInt(sanitizedValue, 16);
    cpu.setRegister(index, numValue);
  };

  const handleProgramCounterChange = (value: string) => {
    // Only allow hex values
    const sanitizedValue = value.replace(/[^0-9A-Fa-f]/g, '').padStart(8, '0');
    setProgramCounter(sanitizedValue);
    
    try {
      // Convert hex to number and ensure it's word-aligned (multiple of 4)
      const numValue = parseInt(sanitizedValue, 16);
      if (!isNaN(numValue)) {
        // Round down to nearest multiple of 4
        const alignedValue = numValue & ~0x3;
        cpu.setPC(alignedValue);
        // Update display to show aligned value
        setProgramCounter(alignedValue.toString(16).padStart(8, '0'));
      }
    } catch (error) {
      console.error('Error setting program counter:', error);
    }
  };

  const handleEnableTrapsChange = (value: boolean) => {
    setEnableTraps(value);
    cpu.setEnableTraps(value);
  };

  const handleFlagChange = (flag: keyof typeof cpuFlags, value: boolean) => {
    // Update UI state
    setCpuFlags(prev => ({
      ...prev,
      [flag]: value
    }));
    
    // Map UI flag names to CPU flag names
    let ccrFlag: 'n' | 'z' | 'v' | 'c';
    
    // Determine which CPU flag to update
    switch (flag) {
      case 'negative':
        ccrFlag = 'n';
        break;
      case 'zero':
        ccrFlag = 'z';
        break;
      case 'overflow':
        ccrFlag = 'v';
        break;
      case 'carry':
        ccrFlag = 'c';
        break;
    }
    
    // Create update object
    const update: CCRUpdate = {
      n: undefined,
      z: undefined,
      v: undefined,
      c: undefined
    };
    
    // Set the specific flag
    update[ccrFlag] = value;
    
    // Update the CPU's condition code register
    cpu.setCCR(update);
  };

  // Function to refresh register display from CPU
  const refreshRegisters = useCallback(() => {
    const newRegisters = Array(32).fill('').map((_, i) => {
      const value = cpu.getRegister(i);
      return numberToTwosComplementHex(value, 32);
    });
    setRegisters(newRegisters);
  }, [cpu]);

  // Function to refresh program counter display from CPU
  const refreshProgramCounter = useCallback(() => {
    const pcValue = cpu.getPC();
    setProgramCounter(numberToTwosComplementHex(pcValue, 32));
  }, [cpu]);

  // Function to refresh trap base register display from CPU
  const refreshTrapBaseRegister = useCallback(() => {
    const tbrValue = cpu.getTrapBaseRegister();
    setTrapBaseRegister(numberToTwosComplementHex(tbrValue, 32));
  }, [cpu]);

  // Function to refresh enable traps state from CPU
  const refreshEnableTraps = useCallback(() => {
    setEnableTraps(cpu.getEnableTraps());
  }, [cpu]);

  // Initialize registers display on mount
  useEffect(() => {
    refreshRegisters();
  }, [refreshRegisters]);

  // Initialize PC display on mount and include in refresh
  useEffect(() => {
    refreshProgramCounter();
  }, [refreshProgramCounter]);

  // Initialize TBR display on mount
  useEffect(() => {
    refreshTrapBaseRegister();
  }, [refreshTrapBaseRegister]);

  // Initialize Enable Traps on mount
  useEffect(() => {
    refreshEnableTraps();
  }, [refreshEnableTraps]);

  // Add debug keyboard shortcut
  useEffect(() => {
    // Only add event listeners in browser environment
    if (!isClient) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        // Get visible memory locations
        const visibleLocations = Array.from({ length: 8 }, (_, i) => i * 4);
        const memoryValues = visibleLocations.map(loc => ({
          address: numberToTwosComplementHex(loc, 32),
          value: {
            hex: cpu.safeReadMemory(loc),
            dec: twosComplementHexToNumber(cpu.safeReadMemory(loc), 32)
          }
        }));

        console.log('CPU Debug Info:', {
          registers: Array.from({ length: 32 }, (_, i) => ({
            [`r${i}`]: {
              hex: registers[i],
              dec: twosComplementHexToNumber(registers[i], 32)
            }
          })),
          pc: {
            hex: numberToTwosComplementHex(cpu.getPC(), 32),
            dec: cpu.getPC()
          },
          tbr: {
            hex: numberToTwosComplementHex(cpu.getTrapBaseRegister(), 32),
            dec: cpu.getTrapBaseRegister()
          },
          enableTraps: cpu.getEnableTraps(),
          ccr: cpu.getCCR(),
          memory: memoryValues,
          console: {
            status: cpu.safeReadMemory(0xffff0004),
            statusCounter: cpu.getConsoleStatusCounter(),
            isReady: cpu.safeReadMemory(0xffff0004) === "80000000"
          },
          cpu: cpu
        });
      }
    };

    const win = getWindow();
    if (win) {
      win.addEventListener('keydown', handleKeyDown);
      return () => win.removeEventListener('keydown', handleKeyDown);
    }
  }, [cpu, registers, trapBaseRegister, enableTraps]); // Include dependencies

  const handleClearRegisters = () => {
    for (let i = 0; i < 32; i++) 
      cpu.setRegister(i, 0);

    refreshRegisters(); // Update the display
  };

  const handleClearMemory = () => {
    cpu.clearMemory();
    refreshMemory(); // Update the display
  };

  // Function to clear all breakpoints
  const handleClearBreakpoints = () => {
    simulator.clearBreakpoints();
    // Force re-render by incrementing version
    setMemoryVersion(v => v + 1);
  };

  // Function to get memory values for display
  const getMemoryValues = (locations: number[]): string[] => {
    return locations.map(loc => cpu.safeReadMemory(loc));
  };

  // Update refreshMemory function to use version number
  const refreshMemory = () => {
    setMemoryVersion(v => v + 1);
  };

  // Add breakpoint handlers
  const handleBreakpointToggle = (location: number) => {
    if (simulator.hasBreakpoint(location)) {
      simulator.removeBreakpoint(location);
    } else {
      simulator.addBreakpoint(location);
    }
    // Force re-render by incrementing version
    setMemoryVersion(v => v + 1);
  };

  const getBreakpoints = useCallback(() => simulator.getBreakpoints(), [simulator]);

  // Add function to clear terminal
  const clearTerminal = () => {
    setTerminalLines([]);
  };

  // Silent version of addTerminalMessage that doesn't actually add anything
  // This is used to replace all the status update calls without changing their structure
  const addTerminalMessage = () => {
    // Intentionally empty - we don't want to show status messages
  };

  return (
    <main className="min-h-screen p-4 bg-[#1A1A1A]">
      {/* Add the global CSS for resize-y class */}
      <style jsx global>{`
        .resize-y {
          cursor: ns-resize !important;
          user-select: none !important;
        }
        .resize-x {
          cursor: ew-resize !important;
          user-select: none !important;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;     /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;             /* Chrome, Safari and Opera */
        }
      `}</style>

      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-[#E1E8ED] text-center">ARC Assembly Simulator</h1>
        <p className="text-center text-[#A0AEC0] mb-4">
          by <a href="https://rivanjarjes.com" className="text-[#569CD6] hover:underline" target="_blank" rel="noopener noreferrer">Rivan Jarjes</a>
          {" | "}
          <a href="https://github.com/RivanJarjes/arc-tools-web" className="text-[#569CD6] hover:underline" target="_blank" rel="noopener noreferrer">Source Code</a>
        </p>
        
        {/* Add flex container for the two halves */}
        <div className="flex gap-0 relative">
          {/* Left container */}
          <div 
            className="bg-[#1E1E1E] rounded-l-lg shadow-xl p-4 flex flex-col"
            style={{ width: `${leftContainerWidth}%` }}
          >
            <CPUInfo
              programCounter={programCounter}
              onProgramCounterChange={handleProgramCounterChange}
              trapBaseRegister={trapBaseRegister}
              flags={cpuFlags}
              onFlagChange={handleFlagChange}
              enableTraps={enableTraps}
              onEnableTrapsChange={handleEnableTrapsChange}
              displayMode={displayMode}
            />
            <RegistersView 
              registers={registers}
              onRegisterChange={handleRegisterChange}
              onDisplayModeChange={setDisplayMode}
              onClearRegisters={handleClearRegisters}
              onClearMemory={handleClearMemory}
              onClearBreakpoints={handleClearBreakpoints}
              isRunning={isRunning}
              onUpload={(binaryContent: string) => {
                try {
                  cpu.loadBinaryCode(binaryContent);
                  refreshProgramCounter();
                  refreshTrapBaseRegister();
                  refreshEnableTraps();
                  refreshMemory();
                  // Update memory view base location to match new PC
                  const newPC = cpu.getPC();
                  // Round down to nearest multiple of 32 (8 words) to show context
                  const baseLocation = newPC & ~0x1F;
                  setBaseLocation(baseLocation);
                  setTerminalHistory('Binary file loaded successfully');
                  
                  // Clear terminal when loading binary
                  clearTerminal();
                  addTerminalMessage();
                } catch (error) {
                  console.error('Error loading binary file:', error);
                  setTerminalHistory('Error loading binary file: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  
                  // Add error to terminal
                  addTerminalMessage();
                }
              }}
              onReset={() => {
                try {
                  cpu.loadBinaryCode(); // Call with no parameter to reload last binary
                  refreshProgramCounter();
                  refreshMemory();
                  
                  // Clear all registers
                  handleClearRegisters();
                  
                  // Reset condition code flags
                  cpu.setCCR({
                    n: false,
                    z: false,
                    v: false,
                    c: false
                  });
                  setCpuFlags({
                    negative: false,
                    zero: false,
                    overflow: false,
                    carry: false
                  });
                  
                  // Reset trap base register to default value (-16777216)
                  cpu.setTrapBaseRegister(-16777216);
                  refreshTrapBaseRegister();
                  
                  // Reset enable traps to default value (false)
                  cpu.setEnableTraps(false);
                  refreshEnableTraps();
                  
                  // Update memory view base location to match new PC
                  const newPC = cpu.getPC();
                  // Round down to nearest multiple of 32 (8 words) to show context
                  const baseLocation = newPC & ~0x1F;
                  setBaseLocation(baseLocation);
                  setTerminalHistory('Binary code reloaded successfully');
                  
                  // Clear terminal when resetting
                  clearTerminal();
                  addTerminalMessage();
                } catch (error) {
                  console.error('Error reloading binary code:', error);
                  setTerminalHistory('Error reloading binary code: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  
                  // Add error to terminal
                  addTerminalMessage();
                }
              }}
              onStep={() => {
                  // Execute one instruction
                  let error = false;
                  try {
                    cpu.executeInstruction();
                  } catch (e) {
                    console.error('Error executing instruction:', e);
                    // Set error message in red by using the assemblyError state
                    setAssemblyError(e instanceof Error ? e.message : 'Unknown error');
                    setTerminalHistory(e instanceof Error ? e.message : 'Unknown error');
                    error = true;
                    
                    // Add error to terminal
                    addTerminalMessage();
                  }
                  
                  // Update UI state
                  refreshRegisters();
                  refreshProgramCounter();
                  refreshTrapBaseRegister();
                  refreshEnableTraps();
                  refreshMemory();

                  // Check if the current PC is outside of the displayed memory range (8 words = 32 bytes) and update baseLocation if needed
                  const pc = cpu.getPC();
                  if (pc < baseLocation || pc >= baseLocation + 32) {
                    setBaseLocation(pc & ~0x1F);
                  }
                  
                  // Update condition code flags from CPU
                  const ccr = cpu.getCCR();
                  setCpuFlags({
                    negative: ccr.n,
                    zero: ccr.z,
                    overflow: ccr.v,
                    carry: ccr.c
                  });
                  
                  // Update terminal history with success message
                  if (!error) {
                    setAssemblyError(null);
                    setTerminalHistory('Executed instruction successfully');
                    
                    // Add step info to terminal
                    const instruction = cpu.safeReadMemory(pc - 4);
                    try {
                      // No need to store decoded instruction if we're not using it
                      cpu.interpretInstruction(instruction);
                      addTerminalMessage();
                    } catch {
                      addTerminalMessage();
                    }
                  }
              }}
              onRun={() => {
                // Don't start if already running
                if (isRunningRef.current) {
                  return;
                }
                
                // Set execution state
                setIsRunning(true);
                isRunningRef.current = true;
                setAssemblyError(null);
                
                // Set up variables to track execution state
                let instructionsExecuted = 0;
                const BATCH_SIZE = 500; // Execute this many instructions before yielding to the event loop
                
                // Function to update UI status when execution stops
                const stopExecution = (message: string) => {
                  setIsRunning(false);
                  isRunningRef.current = false;
                  setTerminalHistory(message);
                  
                  // Make sure memory view is refreshed when execution stops
                  refreshRegisters();
                  refreshProgramCounter();
                  refreshTrapBaseRegister();
                  refreshEnableTraps();
                  refreshMemory();
                  
                  // Update condition code flags from CPU
                  const ccr = cpu.getCCR();
                  setCpuFlags({
                    negative: ccr.n,
                    zero: ccr.z,
                    overflow: ccr.v,
                    carry: ccr.c
                  });
                  
                  // Update memory view to show current PC location
                  const finalPC = cpu.getPC();
                  if (finalPC < baseLocation || finalPC >= baseLocation + 32) {
                    setBaseLocation(finalPC & ~0x1F);
                  }
                };
                
                // Function to run one batch of instructions
                const runBatch = () => {
                  // Immediately check if we should stop
                  if (!isRunningRef.current) {
                    stopExecution(`Execution stopped: ${instructionsExecuted} instructions executed`);
                    return;
                  }
                  
                  // Execute a batch of instructions
                  let batchCount = 0;
                  
                  while (batchCount < BATCH_SIZE && isRunningRef.current) {
                    // Get current PC and instruction
                    const pc = cpu.getPC();
                    const instruction = cpu.safeReadMemory(pc);
                    
                    // Check for breakpoints
                    if (simulator.hasBreakpoint(pc) && batchCount !== 0) {
                      stopExecution(`Stopped at breakpoint 0x${pc.toString(16).padStart(8, '0')}`);
                      return;
                    }
                    
                    // Check for halt instruction (ffffffff)
                    if (instruction === "ffffffff") {
                      cpu.executeInstruction();
                      stopExecution('Execution halted: "halt" instruction reached');
                      return;
                    }
                    
                    // Execute the instruction
                    try {
                      cpu.executeInstruction();
                      instructionsExecuted++;
                      batchCount++;
                    } catch (e) {
                      console.error('Error executing instruction:', e);
                      setAssemblyError(e instanceof Error ? e.message : 'Unknown error');
                      stopExecution(`Execution halted: ${e instanceof Error ? e.message : 'Unknown error'}`);
                      return;
                    }
                  }
                  
                  // Update UI state after the batch
                  refreshRegisters();
                  refreshProgramCounter();
                  refreshTrapBaseRegister();
                  refreshEnableTraps();
                  refreshMemory();
                  
                  // Update condition code flags from CPU
                  const ccr = cpu.getCCR();
                  setCpuFlags({
                    negative: ccr.n,
                    zero: ccr.z,
                    overflow: ccr.v,
                    carry: ccr.c
                  });
                  
                  // Update memory view to show current PC location
                  const finalPC = cpu.getPC();
                  if (finalPC < baseLocation || finalPC >= baseLocation + 32) {
                    setBaseLocation(finalPC & ~0x1F);
                  }
                  
                  // Continue execution with requestAnimationFrame for better performance
                  requestAnimationFrame(runBatch);
                };
                
                // Start execution
                requestAnimationFrame(runBatch);
              }}
              onStop={() => {
                if (isRunningRef.current) {
                  setIsRunning(false);
                  isRunningRef.current = false;
                  setTerminalHistory('Stop requested, execution will halt after current instruction');
                }
              }}
            />
            <MemoryView
              memory={getMemoryValues(Array.from({ length: 8 }, (_, i) => baseLocation + (i * 4)))}
              currentLocation={twosComplementHexToNumber(programCounter, 32)}
              onMemoryChange={(address: number, value: string) => {
                try {
                  // Ensure the value is padded to the correct length for a word
                  const paddedValue = value.padStart(8, '0');
                  // Write the value to CPU memory
                  cpu.writeMemory(address, paddedValue, 4);
                  // Refresh the memory display
                  refreshMemory();
                  
                  // Add message to terminal
                  addTerminalMessage();
                } catch (error) {
                  console.error('Error writing to memory:', error);
                  // Add error to terminal
                  addTerminalMessage();
                }
              }}
              displayMode={displayMode}
              breakpoints={getBreakpoints()}
              onBreakpointToggle={handleBreakpointToggle}
              key={memoryVersion}
              baseLocation={baseLocation}
              onBaseLocationChange={setBaseLocation}
            />
            
            {/* Add Terminal component */}
            <Terminal 
              lines={terminalLines} 
              maxLines={15}
              height={`${simulationTerminalHeight}px`}
              cpu={cpu}
            />
          </div>

          {/* Resize handle */}
          <div
            className="w-1 bg-[#2D2D2D] cursor-col-resize hover:bg-[#569CD6] transition-colors relative z-10 select-none"
            onMouseDown={handleContainerResizeStart}
          />

          {/* Right container */}
          <div 
            className="bg-[#1E1E1E] rounded-r-lg shadow-xl flex flex-col justify-between"
            style={{ width: `${100 - leftContainerWidth}%` }}
          >
            <div className="rounded-lg overflow-hidden shadow-xl flex-grow">
              {/* Tabs row */}
              <div className="flex bg-[#2D2D2D]">
                <button
                  onClick={() => handleTabChange('assembly')}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'assembly'
                      ? 'bg-[#1E1E1E] text-white border-b-2 border-[#569CD6]'
                      : 'bg-[#2D2D2D] text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Assembly Editor
                </button>
                <button
                  onClick={() => handleTabChange('binary')}
                  disabled={!binaryCode}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    binaryCode
                      ? activeTab === 'binary'
                        ? 'bg-[#1E1E1E] text-white border-b-2 border-[#569CD6]'
                        : 'bg-[#2D2D2D] text-gray-400 hover:text-gray-300'
                      : 'bg-[#2D2D2D] text-gray-600 cursor-not-allowed'
                  }`}
                >
                  Binary File
                </button>
                <button
                  onClick={() => handleTabChange('examples')}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'examples'
                      ? 'bg-[#1E1E1E] text-white border-b-2 border-[#569CD6]'
                      : 'bg-[#2D2D2D] text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Load Examples
                </button>
              </div>

              {/* File menu row */}
              <div className="bg-[#1E1E1E] border-b border-[#2D2D2D]">
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                    className="px-4 py-1 text-sm text-gray-300 hover:text-white focus:outline-none cursor-default"
                  >
                    File
                  </button>
                  {isFileMenuOpen && (
                    <div className="absolute left-0 mt-1 w-40 bg-[#2D2D2D] rounded-md shadow-lg z-50">
                      <button
                        onClick={handleNewFile}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3D3D3D] hover:text-white cursor-default"
                      >
                        New
                      </button>
                      <button
                        onClick={handleOpenFile}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3D3D3D] hover:text-white cursor-default"
                      >
                        Open...
                      </button>
                      <button
                        onClick={handleSaveAs}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3D3D3D] hover:text-white cursor-default"
                      >
                        Save As...
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editor content with fixed height calculation */}
              <div style={{ height: `${getEditorHeight()}px` }}>
                <div style={{ display: activeTab === 'assembly' ? 'block' : 'none', height: '100%' }}>
                  {isEditorContentLoaded && (
                    <Editor 
                      value={code}
                      onChange={setCode}
                      language="arc"
                      height="100%"
                    />
                  )}
                </div>
                <div style={{ display: activeTab === 'binary' ? 'block' : 'none', height: '100%' }}>
                  <Editor 
                    value={binaryCode}
                    onChange={() => {}}
                    language="plaintext"
                    height="100%"
                    readOnly={true}
                    renderWhitespace="all"
                    lineNumbers="on"
                  />
                </div>
                <div 
                  style={{ display: activeTab === 'examples' ? 'block' : 'none', height: '100%' }}
                  className="bg-[#1E1E1E] p-4 overflow-auto"
                >
                  <h2 className="text-lg text-white font-medium mb-4">Example Assembly Files</h2>
                  <p className="text-gray-400 mb-4">
                    Click on an example to load it into the Assembly Editor.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {exampleFiles.map((file, index) => (
                      <button
                        key={index}
                        onClick={() => handleLoadExample(file.path)}
                        className="bg-[#2D2D2D] hover:bg-[#3D3D3D] transition-colors text-left p-3 rounded-md group"
                      >
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-[#569CD6] mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 8L14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-gray-300 group-hover:text-white transition-colors">
                            {file.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Terminal separator */}
              <div
                className="h-2 bg-[#2D2D2D] cursor-ns-resize hover:bg-[#569CD6] flex items-center justify-center transition-colors"
                onMouseDown={handleMouseDown}
              >
                <div className="w-16 h-1 bg-[#3D3D3D] rounded-full"></div>
              </div>
              
              {/* Assembly logs terminal */}
              <div 
                className="bg-[#1E1E1E] transition-all duration-200"
                style={{ height: `${terminalHeight}px` }}
              >
                <div className="h-full p-3" style={{ minHeight: '30px' }}>
                  <div className="font-mono text-sm truncate">
                    <span className={
                      assemblyError 
                        ? "text-[#FF5F56]" 
                        : "text-green-400"
                    }>
                      {terminalHistory}
                    </span>
                    <div className="overflow-auto max-h-full">
                      {assemblerLogs.map((log, index) => (
                        <div key={index} className="text-gray-400 mt-1">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Button container - positioned at the very bottom */}
            <div className="px-3 py-3 border-t border-[#2D2D2D]">
              <div className="flex gap-2">
                <button
                  onClick={handleAssemble}
                  className="px-4 py-2 bg-[#569CD6] text-white rounded hover:bg-[#4E8CC2] transition-colors flex-1"
                >
                  Assemble
                </button>
                <button
                  onClick={() => {
                    try {
                      // Clear registers before simulation
                      handleClearRegisters();
                      // Clear CPU memory before writing binary code
                      cpu.clearMemory();
                      // Reset condition codes
                      cpu.setCCR({
                        n: false,
                        z: false,
                        v: false,
                        c: false
                      });
                      // Also update UI flags
                      setCpuFlags({
                        negative: false,
                        zero: false,
                        overflow: false,
                        carry: false
                      });
                      cpu.loadBinaryCode(binaryCode);
                      refreshProgramCounter();
                      refreshTrapBaseRegister();
                      refreshEnableTraps();
                      refreshMemory();
                      // Update memory view base location to match new PC exactly
                      // No need to round down since we want PC at the top
                      const newPC = cpu.getPC();
                      setBaseLocation(newPC);
                      setTerminalHistory('Binary code loaded into simulation successfully');
                      
                      // Clear terminal and add success message
                      clearTerminal();
                      addTerminalMessage();
                    } catch (error) {
                      console.error('Error loading binary code:', error);
                      setTerminalHistory('Error loading binary code: ' + (error instanceof Error ? error.message : 'Unknown error'));
                      
                      // Add error to terminal
                      addTerminalMessage();
                    }
                  }}
                  disabled={!binaryCode}
                  className={`px-4 py-2 rounded transition-colors flex-1 ${
                    binaryCode 
                      ? 'bg-[#569CD6] text-white hover:bg-[#4E8CC2]' 
                      : 'bg-[#2D2D2D] text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Binary -&gt; Simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="text-center text-[#A0AEC0] mt-6 pb-4">
        <a 
          href="https://github.com/RivanJarjes/arc-tools-web/issues" 
          className="text-[#569CD6] hover:underline" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Please report any bugs in the source code&apos;s issue page
        </a>
      </footer>
    </main>
  );
}
