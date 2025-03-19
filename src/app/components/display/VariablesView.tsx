'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpFromBracket, faRotateRight, faForwardStep, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import React, { useState } from 'react';
import { twosComplementHexToNumber, numberToTwosComplementHex } from '../../utils/helpers';

interface CPUInfoProps {
  programCounter: string;
  onProgramCounterChange: (value: string) => void;
  flags: {
    negative: boolean;
    zero: boolean;
    overflow: boolean;
    carry: boolean;
  };
  onFlagChange: (flag: keyof CPUInfoProps['flags'], value: boolean) => void;
  displayMode: 'hex' | 'dec';
}

interface RegistersViewProps {
  registers: string[];
  onRegisterChange: (index: number, value: string) => void;
  onDisplayModeChange?: (mode: 'hex' | 'dec') => void;
  onReset?: () => void;
}

export function CPUInfo({ programCounter, onProgramCounterChange, flags, onFlagChange, displayMode }: CPUInfoProps) {
  const [editingValue, setEditingValue] = useState<string>();
  
  // Create a mapping for the flag labels
  const flagLabels = {
    negative: 'Negative (n)',
    overflow: 'Overflow (v)',
    zero: 'Zero (z)',
    carry: 'Carry (c)'
  };

  // Convert display value based on mode
  const getDisplayValue = () => {
    if (displayMode === 'hex') {
      return programCounter;
    } else {
      return twosComplementHexToNumber(programCounter, 32).toString();
    }
  };

  // Handle temporary input changes
  const handleInputChange = (value: string) => {
    setEditingValue(value);
  };

  // Handle final value submission on blur
  const handleInputBlur = () => {
    // If there's no editing value, don't change anything
    if (editingValue === undefined) {
      return;
    }

    if (displayMode === 'hex') {
      onProgramCounterChange(editingValue);
    } else {
      const sanitizedDecimal = editingValue.replace(/[^0-9-]/g, '');
      try {
        const number = parseInt(sanitizedDecimal || '0', 10);
        const clampedNumber = Math.min(Math.max(number, -2147483648), 2147483647);
        const hexValue = numberToTwosComplementHex(clampedNumber, 32);
        onProgramCounterChange(hexValue);
      } catch (error) {
        console.error('Error converting decimal to hex:', error);
      }
    }
    
    // Clear the editing value
    setEditingValue(undefined);
  };

  return (
    <div className="mb-6 flex justify-center">
      
      <div className="flex items-start gap-8">
        {/* Program Counter */}
        <div className="flex flex-col items-end">
          <label htmlFor="pc" className="text-sm text-gray-400 mb-1">
            Program Counter (PC)
          </label>
          <input
            id="pc"
            type="text"
            value={editingValue ?? getDisplayValue()}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            className="bg-[#2D2D2D] text-white px-2 py-1 rounded text-sm font-mono 
                     focus:outline-none focus:ring-1 focus:ring-[#569CD6] w-36"
            maxLength={displayMode === 'hex' ? 8 : 11}
            placeholder={displayMode === 'hex' ? '00000000' : '0'}
          />
        </div>

        {/* Flags */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
          {Object.entries(flags).map(([flag, value]) => (
            <div key={flag} className="flex items-center">
              <input
                id={flag}
                type="checkbox"
                checked={value}
                onChange={(e) => onFlagChange(flag as keyof CPUInfoProps['flags'], e.target.checked)}
                className="appearance-none w-4 h-4 rounded border border-gray-600 
                         bg-[#2D2D2D] checked:bg-[#569CD6] checked:border-[#569CD6] 
                         hover:border-[#569CD6] transition-colors cursor-pointer"
              />
              <label htmlFor={flag} className="ml-2 text-sm text-gray-400 cursor-pointer select-none">
                {flagLabels[flag as keyof typeof flagLabels]}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RegistersView({ registers, onRegisterChange, onDisplayModeChange, onReset }: RegistersViewProps) {
  const [displayMode, setDisplayMode] = useState<'hex' | 'dec'>('hex');
  const [editingValues, setEditingValues] = useState<{ [key: number]: string }>({});

  // Update display mode and notify parent
  const handleDisplayModeChange = (mode: 'hex' | 'dec') => {
    setDisplayMode(mode);
    onDisplayModeChange?.(mode);
  };

  // Convert hex value to display value based on mode
  const getDisplayValue = (hexValue: string) => {
    if (displayMode === 'hex') {
      return hexValue;
    } else {
      const decimal = twosComplementHexToNumber(hexValue, 32);
      return decimal.toString();
    }
  };

  // Handle temporary input changes
  const handleInputChange = (index: number, value: string) => {
    setEditingValues({
      ...editingValues,
      [index]: value
    });
  };

  // Handle final value submission on blur
  const handleInputBlur = (index: number) => {
    const value = editingValues[index];
    
    // If there's no editing value, don't change anything
    if (value === undefined) {
      return;
    }
    
    if (displayMode === 'hex') {
      // Hex mode: sanitize hex input
      const sanitizedValue = value.replace(/[^0-9A-Fa-f]/g, '').padStart(8, '0');
      onRegisterChange(index, sanitizedValue);
    } else {
      // Decimal mode: convert decimal input to hex
      const sanitizedDecimal = value.replace(/[^0-9-]/g, '');
      try {
        const number = parseInt(sanitizedDecimal || '0', 10);
        // Clamp to 32-bit signed integer range
        const clampedNumber = Math.min(Math.max(number, -2147483648), 2147483647);
        const hexValue = numberToTwosComplementHex(clampedNumber, 32);
        onRegisterChange(index, hexValue);
      } catch (error) {
        console.error('Error converting decimal to hex:', error);
        // On error, revert to previous value
        onRegisterChange(index, registers[index]);
      }
    }
    
    // Clear the editing value
    const newEditingValues = { ...editingValues };
    delete newEditingValues[index];
    setEditingValues(newEditingValues);
  };

  // Add handler for clearing registers
  const handleClearRegisters = () => {
    // Set all registers to 0 (as hex)
    Array.from({ length: 32 }).forEach((_, i) => {
      onRegisterChange(i, '00000000');
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 32 }, (_, i) => (
          <div key={i} className="flex items-center gap-1">
            <label 
              htmlFor={`r${i}`} 
              className="text-xs text-gray-400 w-6"
            >
              r{i}
            </label>
            <input
              id={`r${i}`}
              type="text"
              value={editingValues[i] ?? getDisplayValue(registers[i])}
              onChange={(e) => handleInputChange(i, e.target.value)}
              onBlur={() => handleInputBlur(i)}
              className={`bg-[#2D2D2D] text-white px-1.5 py-0.5 rounded text-xs font-mono 
                       focus:outline-none focus:ring-1 focus:ring-[#569CD6] w-20
                       ${i === 0 ? 'opacity-50' : ''}`}
              maxLength={displayMode === 'hex' ? 8 : 11}
              placeholder={displayMode === 'hex' ? '00000000' : '0'}
              disabled={i === 0}
              readOnly={i === 0}
            />
          </div>
        ))}
      </div>
      
      {/* Action buttons row with display mode switch */}
      <div className="mt-4 flex gap-2 items-center">
        {/* Display mode switch */}
        <div className="flex items-center bg-[#2D2D2D] rounded-lg p-0.5 select-none relative w-[120px]">
          {/* Sliding highlight */}
          <div
            className={`absolute inset-0.5 w-[56px] rounded-md bg-[#569CD6] transition-transform duration-200 ease-out ${
              displayMode === 'dec' ? 'translate-x-[60px]' : 'translate-x-0'
            }`}
          />
          
          <button
            onClick={() => handleDisplayModeChange('hex')}
            className={`px-4 py-1 text-xs rounded-md transition-colors relative z-10 w-[60px] ${
              displayMode === 'hex'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Hex.
          </button>
          <button
            onClick={() => handleDisplayModeChange('dec')}
            className={`px-4 py-1 text-xs rounded-md transition-colors relative z-10 w-[60px] ${
              displayMode === 'dec'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Dec.
          </button>
        </div>

        {/* First vertical separator */}
        <div className="h-6 w-px bg-[#4D4D4D]" />

        {/* Existing action buttons */}
        <div className="flex gap-2">
          <div className="relative">
            <button 
              className="p-1.5 bg-[#2D2D2D] rounded-lg hover:bg-[#3D3D3D] 
                         transition-colors group focus:outline-none focus:ring-2 
                         focus:ring-[#569CD6] focus:ring-opacity-50
                         w-8 h-8 flex items-center justify-center group"
              onClick={() => {/* TODO: Add upload handler */}}
            >
              <FontAwesomeIcon 
                icon={faArrowUpFromBracket} 
                className="text-gray-400 group-hover:text-white w-4 h-4 transition-colors" 
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 
                             opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Load Binary File
              </span>
            </button>
          </div>
          <div className="relative">
            <button 
              className="p-1.5 bg-[#2D2D2D] rounded-lg hover:bg-[#3D3D3D] 
                         transition-colors group focus:outline-none focus:ring-2 
                         focus:ring-[#569CD6] focus:ring-opacity-50
                         w-8 h-8 flex items-center justify-center group"
              onClick={() => onReset?.()}
            >
              <FontAwesomeIcon 
                icon={faRotateRight} 
                className="text-gray-400 group-hover:text-white w-4 h-4 transition-colors" 
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 
                             opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Reload
              </span>
            </button>
          </div>
          <div className="relative">
            <button 
              className="p-1.5 bg-[#2D2D2D] rounded-lg hover:bg-[#3D3D3D] 
                         transition-colors group focus:outline-none focus:ring-2 
                         focus:ring-[#569CD6] focus:ring-opacity-50
                         w-8 h-8 flex items-center justify-center group"
              onClick={() => {/* TODO: Add step handler */}}
            >
              <FontAwesomeIcon 
                icon={faForwardStep} 
                className="text-gray-400 group-hover:text-white w-4 h-4 transition-colors" 
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 
                             opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Step
              </span>
            </button>
          </div>
          <div className="relative">
            <button 
              className="p-1.5 bg-[#2D2D2D] rounded-lg hover:bg-[#3D3D3D] 
                         transition-colors group focus:outline-none focus:ring-2 
                         focus:ring-[#569CD6] focus:ring-opacity-50
                         w-8 h-8 flex items-center justify-center group"
              onClick={() => {/* TODO: Add play handler */}}
            >
              <FontAwesomeIcon 
                icon={faPlay} 
                className="text-gray-400 group-hover:text-white w-4 h-4 transition-colors" 
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 
                             opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Run
              </span>
            </button>
          </div>
          <div className="relative">
            <button 
              className="p-1.5 bg-[#2D2D2D] rounded-lg hover:bg-[#3D3D3D] 
                         transition-colors group focus:outline-none focus:ring-2 
                         focus:ring-[#569CD6] focus:ring-opacity-50
                         w-8 h-8 flex items-center justify-center group"
              onClick={() => {/* TODO: Add stop handler */}}
            >
              <FontAwesomeIcon 
                icon={faStop} 
                className="text-gray-400 group-hover:text-white w-4 h-4 transition-colors" 
              />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 
                             opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Stop
              </span>
            </button>
          </div>
        </div>

        {/* Second vertical separator */}
        <div className="h-6 w-px bg-[#4D4D4D]" />

        {/* Clear Registers button */}
        <button
          onClick={handleClearRegisters}
          className="px-3 py-1.5 bg-[#2D2D2D] text-gray-400 hover:text-white 
                   rounded-lg hover:bg-[#3D3D3D] transition-colors text-xs
                   focus:outline-none focus:ring-2 focus:ring-[#569CD6] focus:ring-opacity-50"
        >
          Clear Registers
        </button>
      </div>
    </div>
  );
}

export function SimulatorControls() {
  return ( <div></div>
  );
}



const VariablesView = {
  RegistersView,
  CPUInfo,
  SimulatorControls
}

export default VariablesView;
