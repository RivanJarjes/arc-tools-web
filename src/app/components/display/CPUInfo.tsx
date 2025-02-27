'use client';
import React, { useState } from 'react';
import { twosComplementHexToNumber, numberToTwosComplementHex } from '../../utils/helpers';

interface CPUInfoProps {
  programCounter: string;
  onProgramCounterChange: (value: string) => void;
  trapBaseRegister: string;
  flags: {
    negative: boolean;
    zero: boolean;
    overflow: boolean;
    carry: boolean;
  };
  onFlagChange: (flag: keyof CPUInfoProps['flags'], value: boolean) => void;
  enableTraps: boolean;
  onEnableTrapsChange: (value: boolean) => void;
  displayMode: 'hex' | 'dec';
}

export function CPUInfo({ 
  programCounter, 
  onProgramCounterChange, 
  trapBaseRegister,
  flags, 
  onFlagChange,
  enableTraps,
  onEnableTrapsChange,
  displayMode 
}: CPUInfoProps) {
  const [editingPCValue, setEditingPCValue] = useState<string>();
  
  // Create a mapping for the flag labels
  const flagLabels = {
    negative: 'Negative (n)',
    overflow: 'Overflow (v)',
    zero: 'Zero (z)',
    carry: 'Carry (c)'
  };

  // Convert display value based on mode
  const getDisplayValue = (hexValue: string) => {
    if (displayMode === 'hex') {
      return hexValue;
    } else {
      return twosComplementHexToNumber(hexValue, 32).toString();
    }
  };

  // Handle temporary input changes for PC
  const handlePCInputChange = (value: string) => {
    setEditingPCValue(value);
  };

  // Handle final value submission on blur for PC
  const handlePCInputBlur = () => {
    // If there's no editing value, don't change anything
    if (editingPCValue === undefined) {
      return;
    }

    if (displayMode === 'hex') {
      onProgramCounterChange(editingPCValue);
    } else {
      const sanitizedDecimal = editingPCValue.replace(/[^0-9-]/g, '');
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
    setEditingPCValue(undefined);
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
            value={editingPCValue ?? getDisplayValue(programCounter)}
            onChange={(e) => handlePCInputChange(e.target.value)}
            onBlur={handlePCInputBlur}
            className="bg-[#2D2D2D] text-white px-2 py-1 rounded text-sm font-mono 
                     focus:outline-none focus:ring-1 focus:ring-[#569CD6] w-36"
            maxLength={displayMode === 'hex' ? 8 : 11}
            placeholder={displayMode === 'hex' ? '00000000' : '0'}
          />
        </div>

        {/* Middle section with flags */}
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
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
        
        {/* Trap Base Register and Enable Traps */}
        <div className="flex flex-col items-end">
          <label htmlFor="tbr" className="text-sm text-gray-400 mb-1">
            Trap Base Register (TBR)
          </label>
          <input
            id="tbr"
            type="text"
            value={getDisplayValue(trapBaseRegister)}
            readOnly={true}
            className="bg-[#2D2D2D] text-white px-2 py-1 rounded text-sm font-mono 
                     focus:outline-none w-36 cursor-not-allowed opacity-80"
            maxLength={displayMode === 'hex' ? 8 : 11}
          />
          
          {/* Enable Traps checkbox */}
          <div className="flex items-center mt-2 justify-end">
            <input
              id="enableTraps"
              type="checkbox"
              checked={enableTraps}
              onChange={(e) => onEnableTrapsChange(e.target.checked)}
              className="appearance-none w-4 h-4 rounded border border-gray-600 
                       bg-[#2D2D2D] checked:bg-[#569CD6] checked:border-[#569CD6] 
                       hover:border-[#569CD6] transition-colors cursor-pointer"
            />
            <label htmlFor="enableTraps" className="ml-2 text-sm text-gray-400 cursor-pointer select-none">
              Enable Traps (ET)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
} 
