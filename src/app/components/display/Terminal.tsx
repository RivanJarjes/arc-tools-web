'use client';

import React, { useRef, useEffect, useState } from 'react';
import { CPU } from '../../simulator/cpu';

interface TerminalProps {
  lines: string[];
  maxLines?: number;
  height?: string;
  className?: string;
  cpu?: CPU; // Using the proper CPU type
}

export function Terminal({ 
  lines, 
  maxLines = 10,
  height = '150px',
  className = '',
  cpu
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [terminalLines, setTerminalLines] = useState(lines);
  const [isResizing, setIsResizing] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(height);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  
  // Update terminalLines when lines prop changes
  useEffect(() => {
    setTerminalLines(lines);
  }, [lines]);

  // Auto-scroll to the bottom when lines are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startYRef.current;
      const newHeight = Math.max(100, startHeightRef.current + delta); // Minimum height of 100px
      setTerminalHeight(`${newHeight}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Register CPU console write listener
  useEffect(() => {
    const consoleWriteHandler = (char: string) => {
      // For newline characters, add a new empty line
      if (char === '\n') {
        setTerminalLines(prev => [...prev, '']);
      } else if (char === '\r') {
        // Handle carriage return - typically we'd need to overwrite the current line
        // For simplicity, we're just ignoring it here
      } else if (char === '\b') {
        // Handle backspace by removing the last character from the last line
        setTerminalLines(prev => {
          if (prev.length === 0) return prev;
          const newLines = [...prev];
          const lastLine = newLines[newLines.length - 1];
          newLines[newLines.length - 1] = lastLine.slice(0, -1);
          return newLines;
        });
      } else {
        // For regular characters, append to the last line if it exists, otherwise create a new line
        setTerminalLines(prev => {
          if (prev.length === 0) {
            return [char];
          }
          
          const newLines = [...prev];
          newLines[newLines.length - 1] += char;
          return newLines;
        });
      }
    };

    // Add the listener if CPU is available
    if (cpu) {
      cpu.addConsoleWriteListener(consoleWriteHandler);
    }

    // Cleanup on unmount
    return () => {
      if (cpu) {
        cpu.removeConsoleWriteListener(consoleWriteHandler);
      }
    };
  }, [cpu]);

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if terminal is focused and a CPU instance is provided
      if (isFocused && cpu) {
        // Check if it's a printable ASCII character (32-126)
        const charCode = e.key.charCodeAt(0);
        if (charCode >= 32 && charCode <= 126 && e.key.length === 1) {
          // Try to send the character to the CPU
          cpu.handleKeyboardInput(e.key);
          
          // Prevent default action to avoid interfering with the simulator
          e.preventDefault();
        } else if (e.key === 'Enter') {
          // Handle Enter key (ASCII 13)
          cpu.handleKeyboardInput('\r');
          // Also add a newline character
          cpu.handleKeyboardInput('\n');
          e.preventDefault();
        } else if (e.key === 'Backspace') {
          // Handle Backspace key (ASCII 8)
          cpu.handleKeyboardInput('\b');
          e.preventDefault();
        }
      }
    };

    // Add the event listener to the window
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocused, cpu]);

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = parseInt(terminalHeight);
  };

  return (
    <div className={`mt-4 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-medium text-gray-400">Terminal</h3>
        {isFocused && (
          <span className="text-xs text-green-500">Focused - Input Enabled</span>
        )}
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1A1A1A;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3D3D3D;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4D4D4D;
        }
        .resize-handle {
          height: 4px;
          background-color: #2D2D2D;
          cursor: ns-resize;
          transition: background-color 0.2s;
        }
        .resize-handle:hover {
          background-color: #569CD6;
        }
      `}</style>
      <div 
        ref={terminalRef}
        className={`bg-[#1A1A1A] border ${isFocused ? 'border-green-500' : 'border-[#2D2D2D]'} rounded-md font-mono text-sm p-2 overflow-y-auto text-[#E1E8ED] transition-colors duration-200 focus:outline-none custom-scrollbar`}
        style={{ height: terminalHeight }}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {terminalLines.length === 0 ? (
          <div className="text-[#555555] italic">
            {isFocused 
              ? "Terminal ready - Keyboard input enabled" 
              : "Terminal ready - Click to enable keyboard input"}
            {isFocused && (
              <span className="inline-block w-2 h-4 bg-gray-500 ml-0.5 animate-pulse"></span>
            )}
          </div>
        ) : (
          terminalLines.slice(-maxLines).map((line, index) => (
            <div 
              key={index} 
              className="py-0.5 whitespace-pre-wrap break-words text-[#E1E8ED]"
            >
              {line}
              {isFocused && index === terminalLines.slice(-maxLines).length - 1 && (
                <span className="inline-block w-2 h-4 bg-gray-500 ml-0.5 animate-pulse"></span>
              )}
            </div>
          ))
        )}
      </div>
      <div 
        className="resize-handle mt-2 rounded-full"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
} 
