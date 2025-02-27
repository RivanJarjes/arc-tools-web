"use client";

import Editor from '@/app/components/editor/Editor';
import { useState, useRef, useEffect, useCallback } from 'react';
import { assemble } from './simulator/assembler';
import { RegistersView } from './components/display/RegistersView';
import { CPUInfo } from './components/display/CPUInfo';
import { MemoryView } from './components/display/MemoryView';
import { Simulator } from './simulator/simulator';
import { twosComplementHexToNumber, numberToTwosComplementHex } from './utils/helpers';

// Add proper types for the File System Access API
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

// Update the interface to include the options parameter
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

export default function Home() {
  const [simulator] = useState(() => new Simulator());
  const cpu = simulator.getCPU();
  const [code, setCode] = useState('');
  const [binaryCode, setBinaryCode] = useState('');
  const [activeTab, setActiveTab] = useState<'assembly' | 'binary'>('assembly');
  const [assemblyError, setAssemblyError] = useState<string | null>(null);
  const [terminalHeight, setTerminalHeight] = useState(150);
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
  const [cpuFlags, setCpuFlags] = useState({
    negative: false,
    zero: false,
    overflow: false,
    carry: false
  });
  const [displayMode, setDisplayMode] = useState<'hex' | 'dec'>('hex');
  const [memoryVersion, setMemoryVersion] = useState(0);
  const [baseLocation, setBaseLocation] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = terminalHeight;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate delta (negative when moving up, positive when moving down)
      const delta = e.clientY - startYRef.current;
      // Invert the delta to make upward movement increase height
      const newHeight = Math.max(40, Math.min(CONTAINER_HEIGHT - 200, startHeightRef.current - delta));
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Add click outside handler
  useEffect(() => {
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

  // Add new useEffect for container resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingContainers) return;
      
      const delta = e.clientX - startXRef.current;
      const containerWidth = document.querySelector('.container')?.clientWidth || 0;
      const percentageDelta = (delta / containerWidth) * 100;
      const newWidth = Math.min(Math.max(20, startWidthRef.current + percentageDelta), 80);
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

  // Add this useEffect after the other useEffects
  useEffect(() => {
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
      setActiveTab('assembly');
      
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

  const handleTabChange = (tab: 'assembly' | 'binary') => {
    if (tab === 'binary' && !binaryCode) return;
    setActiveTab(tab);
  };

  // Add file operation handlers
  const handleNewFile = () => {
    if (code && !confirm('Are you sure you want to create a new file? Any unsaved changes will be lost.')) {
      return;
    }
    setCode('');
    setBinaryCode('');
    setTerminalHistory('Ready to assemble');
    setIsFileMenuOpen(false);
  };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asm';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        setCode(text);
        setBinaryCode('');
        setTerminalHistory('File loaded successfully');
      }
    };
    input.click();
    setIsFileMenuOpen(false);
  };

  const handleSaveAs = () => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') return;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.asm';

    // Type guard for showSaveFilePicker
    if ('showSaveFilePicker' in window) {
      // Modern browsers with File System Access API
      (window.showSaveFilePicker as (options: ShowSaveFilePickerOptions) => Promise<FileSystemFileHandle>)({
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

  // Initialize registers display on mount
  useEffect(() => {
    refreshRegisters();
  }, [refreshRegisters]);

  // Initialize PC display on mount and include in refresh
  useEffect(() => {
    refreshProgramCounter();
  }, [refreshProgramCounter]);

  // Add debug keyboard shortcut
  useEffect(() => {
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
          ccr: cpu.getCCR(),
          memory: memoryValues,
          cpu: cpu
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cpu, registers]); // Include dependencies

  const handleClearRegisters = () => {
    for (let i = 0; i < 32; i++) 
      cpu.setRegister(i, 0);

    refreshRegisters(); // Update the display
  };

  const handleClearMemory = () => {
    cpu.clearMemory();
    refreshMemory(); // Update the display
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

  return (
    <main className="min-h-screen p-4 bg-[#1A1A1A]">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-[#E1E8ED] text-center">ARC Assembly Simulator</h1>
        
        {/* Add flex container for the two halves */}
        <div className="flex gap-0 relative">
          {/* Left container */}
          <div 
            className="bg-[#1E1E1E] rounded-l-lg shadow-xl p-4"
            style={{ width: `${leftContainerWidth}%` }}
          >
            <CPUInfo
              programCounter={programCounter}
              onProgramCounterChange={handleProgramCounterChange}
              flags={cpuFlags}
              onFlagChange={handleFlagChange}
              displayMode={displayMode}
            />
            <RegistersView 
              registers={registers}
              onRegisterChange={handleRegisterChange}
              onDisplayModeChange={setDisplayMode}
              onClearRegisters={handleClearRegisters}
              onClearMemory={handleClearMemory}
              onUpload={(binaryContent: string) => {
                try {
                  cpu.loadBinaryCode(binaryContent);
                  refreshProgramCounter();
                  refreshMemory();
                  // Update memory view base location to match new PC
                  const newPC = cpu.getPC();
                  // Round down to nearest multiple of 32 (8 words) to show context
                  const baseLocation = newPC & ~0x1F;
                  setBaseLocation(baseLocation);
                  setTerminalHistory('Binary file loaded successfully');
                } catch (error) {
                  console.error('Error loading binary file:', error);
                  setTerminalHistory('Error loading binary file: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
                  
                  // Update memory view base location to match new PC
                  const newPC = cpu.getPC();
                  // Round down to nearest multiple of 32 (8 words) to show context
                  const baseLocation = newPC & ~0x1F;
                  setBaseLocation(baseLocation);
                  setTerminalHistory('Binary code reloaded successfully');
                } catch (error) {
                  console.error('Error reloading binary code:', error);
                  setTerminalHistory('Error reloading binary code: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
                  }
                  
                  // Update UI state
                  refreshRegisters();
                  refreshProgramCounter();
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
                  }
              }}
              onRun={() => {/* TODO: Add run handler */}}
              onStop={() => {/* TODO: Add stop handler */}}
            />
            <MemoryView
              memory={getMemoryValues(Array.from({ length: 8 }, (_, i) => baseLocation + (i * 4)))}
              currentLocation={parseInt(programCounter, 16)}
              onMemoryChange={(address: number, value: string) => {
                try {
                  // Ensure the value is padded to the correct length for a word
                  const paddedValue = value.padStart(8, '0');
                  // Write the value to CPU memory
                  cpu.writeMemory(address, paddedValue, 4);
                  // Refresh the memory display
                  refreshMemory();
                } catch (error) {
                  console.error('Error writing to memory:', error);
                }
              }}
              displayMode={displayMode}
              breakpoints={getBreakpoints()}
              onBreakpointToggle={handleBreakpointToggle}
              key={memoryVersion}
              baseLocation={baseLocation}
              onBaseLocationChange={setBaseLocation}
            />
          </div>

          {/* Resize handle */}
          <div
            className="w-1 bg-[#2D2D2D] cursor-col-resize hover:bg-[#569CD6] transition-colors relative z-10 select-none"
            onMouseDown={handleContainerResizeStart}
          />

          {/* Right container - existing content */}
          <div 
            className="bg-[#1E1E1E] rounded-r-lg shadow-xl"
            style={{ width: `${100 - leftContainerWidth}%` }}
          >
            <div className="rounded-lg overflow-hidden shadow-xl">
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

              {/* Editor content */}
              <div style={{ height: `${CONTAINER_HEIGHT - terminalHeight - 4}px` }}>
                <div style={{ display: activeTab === 'assembly' ? 'block' : 'none', height: '100%' }}>
                  <Editor 
                    value={code}
                    onChange={setCode}
                    language="arc"
                    height="100%"
                  />
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
              </div>
              <div
                className="h-1 bg-[#2D2D2D] cursor-ns-resize hover:bg-[#569CD6] transition-colors"
                onMouseDown={handleMouseDown}
              ></div>
              <div 
                className="bg-[#1E1E1E] p-3 overflow-auto transition-all duration-200"
                style={{ height: `${terminalHeight}px` }}
              >
                <div className="font-mono text-sm">
                  <span className={
                    assemblyError 
                      ? "text-[#FF5F56]" 
                      : "text-green-400"
                  }>
                    {terminalHistory}
                  </span>
                  {assemblerLogs.map((log, index) => (
                    <div key={index} className="text-gray-400 mt-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Update the button container to include both buttons */}
            <div className="mt-2 mb-2 flex gap-2">
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
                    cpu.loadBinaryCode(binaryCode);
                    refreshProgramCounter();
                    refreshMemory();
                    // Update memory view base location to match new PC exactly
                    // No need to round down since we want PC at the top
                    const newPC = cpu.getPC();
                    setBaseLocation(newPC);
                    setTerminalHistory('Binary code loaded into simulation successfully');
                  } catch (error) {
                    console.error('Error loading binary code:', error);
                    setTerminalHistory('Error loading binary code: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
    </main>
  );
}
