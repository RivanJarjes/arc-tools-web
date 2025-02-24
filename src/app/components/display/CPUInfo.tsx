'use client';
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
