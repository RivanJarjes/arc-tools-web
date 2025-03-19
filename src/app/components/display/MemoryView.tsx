'use client';
import React, { useState } from 'react';
import { MemoryViewProps } from '../display/types';
import { twosComplementHexToNumber, numberToTwosComplementHex } from '../../utils/helpers';
import { CPU } from '../../simulator/cpu';

export function MemoryView({ memory, currentLocation, onMemoryChange, displayMode, breakpoints, onBreakpointToggle, baseLocation, onBaseLocationChange }: MemoryViewProps) {
  const [editingLocations, setEditingLocations] = useState<{ [key: number]: string }>({});
  const locations = Array.from({ length: 8 }, (_, i) => baseLocation + (i * 4));
  const [editingValues, setEditingValues] = useState<{ [key: number]: string }>({});
  const cpu = new CPU(); // Create CPU instance for instruction interpretation
  
  // Function to check if a machine word is blank (all zeroes)
  const isBlankInstruction = (machWord: string): boolean => {
    return machWord.replace(/[^0-9A-Fa-f]/g, '') === '00000000';
  };

  // Function to interpret machine word
  const interpretInstruction = (machWord: string): string => {
    if (isBlankInstruction(machWord)) return 'None';
    try {
      const instruction = cpu.interpretInstruction(machWord);
      if (instruction.length <= 1) return instruction[0];
      // Join first two elements with space, remaining with ", "
      return instruction[0] + ' ' + instruction[1] + 
             (instruction.length > 2 ? instruction.slice(2).map(x => ', ' + x).join('') : '');
    } catch (error) {
      console.error('Error interpreting instruction:', error);
      return 'Invalid';
    }
  };

  // Navigation handlers
  const handlePrev = (amount: number) => {
    onBaseLocationChange(baseLocation - (amount * 4));
  };

  const handleNext = (amount: number) => {
    onBaseLocationChange(baseLocation + (amount * 4));
  };

  // Check if a location matches the current PC
  const isCurrentLocation = (loc: number) => {
    // Convert both values to unsigned 32-bit representation for comparison
    const locUnsigned = loc >>> 0;
    const currentLocationUnsigned = currentLocation >>> 0;
    return locUnsigned === currentLocationUnsigned;
  };

  // Handle memory value input change
  const handleInputChange = (location: number, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [location]: value
    }));
  };

  // Handle memory value input blur
  const handleInputBlur = (location: number) => {
    const value = editingValues[location];
    if (value === undefined) return;

    try {
      // Always treat as hex, sanitize and ensure it's a string
      const sanitizedValue = value.toString().replace(/[^0-9A-Fa-f]/g, '').toLowerCase();
      if (sanitizedValue) {
        onMemoryChange(location, sanitizedValue);
      }
    } catch (error) {
      console.error('Error writing to memory:', error);
    }

    // Clear editing value
    setEditingValues(prev => {
      const next = { ...prev };
      delete next[location];
      return next;
    });
  };

  // Handle location input change
  const handleLocationChange = (index: number, value: string) => {
    setEditingLocations(prev => ({
      ...prev,
      [index]: value
    }));
  };

  // Format location based on display mode
  const formatLocation = (loc: number) => {
    if (displayMode === 'hex') {
      return numberToTwosComplementHex(loc, 32);
    } else {
      return loc.toString();
    }
  };

  // Handle location input blur
  const handleLocationBlur = (index: number) => {
    const value = editingLocations[index];
    if (value === undefined) return;

    try {
      let newLocation: number;
      if (displayMode === 'hex') {
        newLocation = twosComplementHexToNumber(value.replace(/[^0-9A-Fa-f]/g, ''), 32);
      } else {
        newLocation = parseInt(value.replace(/[^0-9-]/g, ''), 10);
      }

      if (!isNaN(newLocation)) {
        // Round down to nearest multiple of 4
        const alignedLocation = newLocation & ~0x3;
        // Update baseLocation to align with this input's position
        onBaseLocationChange(alignedLocation - (index * 4));
      }
    } catch (error) {
      console.error('Error parsing location:', error);
    }

    // Clear editing value
    setEditingLocations(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  return (
    <div className="mt-4 max-w-[600px] mx-auto">
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="grid grid-cols-[100px_60px_80px_200px] gap-x-0">
            {/* Headers */}
            <div className="text-xs text-gray-400 mb-1 text-center h-8 flex items-center justify-center">
              Location
            </div>
            <div className="text-xs text-gray-400 mb-1 text-center h-8 flex items-center justify-center">
              Break<br/>Point
            </div>
            <div className="text-xs text-gray-400 mb-1 font-mono text-center h-8 flex items-center justify-center">
              MachWord
            </div>
            <div className="text-xs text-gray-400 mb-1 pl-2 h-8 flex items-center">
              Source Code
            </div>

            {/* Memory rows */}
            {locations.map((loc, index) => (
              <React.Fragment key={loc}>
                {/* Location */}
                <div className={`flex justify-center items-center h-6 px-1 ${isCurrentLocation(loc) ? 'bg-[#2D2D2D]' : ''}`}>
                  <span className="text-gray-400 mr-0.5">[</span>
                  <input
                    type="text"
                    value={editingLocations[index] ?? formatLocation(loc)}
                    onChange={(e) => handleLocationChange(index, e.target.value)}
                    onBlur={() => handleLocationBlur(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    className="w-20 bg-transparent text-white text-center font-mono text-xs
                             focus:outline-none focus:ring-1 focus:ring-[#569CD6]"
                    maxLength={displayMode === 'hex' ? 8 : 11}
                    placeholder={displayMode === 'hex' ? '00000000' : '0'}
                  />
                  <span className="text-gray-400 ml-0.5">]</span>
                </div>

                {/* Breakpoint button */}
                <div className={`flex justify-center items-center h-6 px-1 ${isCurrentLocation(loc) ? 'bg-[#2D2D2D]' : ''}`}>
                  <button
                    className="w-3 h-3 rounded-full border border-gray-600 
                             hover:border-red-400 transition-colors cursor-pointer
                             focus:outline-none group"
                    onClick={() => onBreakpointToggle(loc)}
                  >
                    <div className={`w-full h-full rounded-full transform scale-75
                                  transition-colors duration-150
                                  ${breakpoints.has(loc) ? 'bg-red-500' : ''}
                                  ${breakpoints.has(loc) ? 'group-hover:bg-red-600' : 'group-hover:bg-red-400/50'}`}
                    />
                  </button>
                </div>

                {/* Machine word */}
                <div className={`flex items-center h-6 px-1 font-mono text-xs text-center ${isCurrentLocation(loc) ? 'bg-[#2D2D2D]' : ''}`}>
                  <input
                    type="text"
                    value={editingValues[loc] ?? memory[locations.indexOf(loc)]}
                    onChange={(e) => handleInputChange(loc, e.target.value)}
                    onBlur={() => handleInputBlur(loc)}
                    className="bg-transparent w-16 text-center focus:outline-none focus:ring-1 
                             focus:ring-[#569CD6] text-white text-xs"
                    maxLength={8}
                    placeholder="00000000"
                  />
                </div>

                {/* Source code */}
                <div className={`flex items-center h-6 text-xs font-mono px-1 overflow-x-auto ${isCurrentLocation(loc) ? 'bg-[#2D2D2D]' : ''}`}>
                  <span className={`${isBlankInstruction(memory[locations.indexOf(loc)]) ? 'text-gray-400' : 'text-[#569CD6]'}`}>
                    {interpretInstruction(memory[locations.indexOf(loc)])}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-col justify-between h-[235px] py-2">
          <button onClick={() => handlePrev(8)} className="h-6 px-2 text-xs bg-[#2D2D2D] text-gray-300 rounded hover:bg-[#3D3D3D] w-14 flex items-center justify-center">
            Prev. 8
          </button>
          <button onClick={() => handlePrev(4)} className="h-6 px-2 text-xs bg-[#2D2D2D] text-gray-300 rounded hover:bg-[#3D3D3D] w-14 flex items-center justify-center">
            Prev. 4
          </button>
          <button onClick={() => handlePrev(1)} className="h-6 px-2 text-xs bg-[#2D2D2D] text-gray-300 rounded hover:bg-[#3D3D3D] w-14 flex items-center justify-center">
            Prev. 1
          </button>
          <button onClick={() => handleNext(1)} className="h-6 px-2 text-xs bg-[#2D2D2D] text-gray-300 rounded hover:bg-[#3D3D3D] w-14 flex items-center justify-center">
            Next 1
          </button>
          <button onClick={() => handleNext(4)} className="h-6 px-2 text-xs bg-[#2D2D2D] text-gray-300 rounded hover:bg-[#3D3D3D] w-14 flex items-center justify-center">
            Next 4
          </button>
          <button onClick={() => handleNext(8)} className="h-6 px-2 text-xs bg-[#2D2D2D] text-gray-300 rounded hover:bg-[#3D3D3D] w-14 flex items-center justify-center">
            Next 8
          </button>
        </div>
      </div>
    </div>
  );
} 
