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
  
  // Auto-scroll to the bottom when lines are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

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
      `}</style>
      <div 
        ref={terminalRef}
        className={`bg-[#1A1A1A] border ${isFocused ? 'border-green-500' : 'border-[#2D2D2D]'} rounded-md font-mono text-sm p-2 overflow-y-auto text-[#E1E8ED] transition-colors duration-200 focus:outline-none custom-scrollbar`}
        style={{ height }}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {lines.length === 0 ? (
          <div className="text-[#555555] italic">
            {isFocused 
              ? "Terminal ready - Keyboard input enabled" 
              : "Terminal ready - Click to enable keyboard input"}
            {isFocused && (
              <span className="inline-block w-2 h-4 bg-gray-500 ml-0.5 animate-pulse"></span>
            )}
          </div>
        ) : (
          lines.slice(-maxLines).map((line, index) => (
            <div 
              key={index} 
              className="py-0.5 whitespace-pre-wrap break-words text-[#E1E8ED]"
            >
              {line}
              {isFocused && index === lines.slice(-maxLines).length - 1 && (
                <span className="inline-block w-2 h-4 bg-gray-500 ml-0.5 animate-pulse"></span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 
