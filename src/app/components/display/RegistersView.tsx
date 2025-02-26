'use client';
import React, { useState } from 'react';
import { twosComplementHexToNumber, numberToTwosComplementHex } from '../../utils/helpers';
import { DisplayModeSwitch } from './DisplayModeSwitch';
import { SimulatorControls } from './SimulatorControls';
import { RegistersViewProps } from './types';

export function RegistersView({ 
  registers, 
  onRegisterChange, 
  onDisplayModeChange, 
  onClearRegisters,
  onClearMemory,
  onUpload,
  onReset,
  onStep,
  onRun,
  onStop
}: RegistersViewProps) {
  const [displayMode, setDisplayMode] = useState<'hex' | 'dec'>('hex');
  const [editingValues, setEditingValues] = useState<{ [key: number]: string }>({});

  const handleDisplayModeChange = (mode: 'hex' | 'dec') => {
    setDisplayMode(mode);
    onDisplayModeChange?.(mode);
  };

  const getDisplayValue = (hexValue: string) => {
    if (displayMode === 'hex') {
      return hexValue;
    } else {
      return twosComplementHexToNumber(hexValue, 32).toString();
    }
  };

  const handleInputChange = (index: number, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleInputBlur = (index: number) => {
    const value = editingValues[index];
    
    if (value === undefined) {
      return;
    }
    
    if (displayMode === 'hex') {
      const sanitizedValue = value.replace(/[^0-9A-Fa-f]/g, '').padStart(8, '0');
      onRegisterChange(index, sanitizedValue);
    } else {
      const sanitizedDecimal = value.replace(/[^0-9-]/g, '');
      try {
        const number = parseInt(sanitizedDecimal || '0', 10);
        const clampedNumber = Math.min(Math.max(number, -2147483648), 2147483647);
        const hexValue = numberToTwosComplementHex(clampedNumber, 32);
        onRegisterChange(index, hexValue);
      } catch (error) {
        console.error('Error converting decimal to hex:', error);
        onRegisterChange(index, registers[index]);
      }
    }
    
    const newEditingValues = { ...editingValues };
    delete newEditingValues[index];
    setEditingValues(newEditingValues);
  };

  const handleClearRegisters = () => {
    onClearRegisters?.();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 32 }, (_, i) => (
          <div key={i} className="flex items-center gap-1">
            <label htmlFor={`r${i}`} className="text-xs text-gray-400 w-6">
              r{i}
            </label>
            <input
              id={`r${i}`}
              type="text"
              autoComplete="off"
              value={editingValues[i] ?? getDisplayValue(registers[i])}
              onChange={(e) => handleInputChange(i, e.target.value)}
              onBlur={() => handleInputBlur(i)}
              className={`bg-[#2D2D2D] text-white px-1.5 py-0.5 rounded text-xs font-mono 
                       focus:outline-none focus:ring-1 focus:ring-[#569CD6] min-w-[4.5rem] w-full max-w-[7rem]
                       ${i === 0 ? 'opacity-50' : ''}`}
              maxLength={displayMode === 'hex' ? 8 : 11}
              placeholder={displayMode === 'hex' ? '00000000' : '0'}
              disabled={i === 0}
              readOnly={i === 0}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex gap-2 items-center">
        <DisplayModeSwitch mode={displayMode} onChange={handleDisplayModeChange} />
        <div className="h-6 w-px bg-[#4D4D4D]" />
        <SimulatorControls 
          onUpload={onUpload}
          onReset={onReset}
          onStep={onStep}
          onRun={onRun}
          onStop={onStop}
        />
        <div className="h-6 w-px bg-[#4D4D4D]" />
        <div className="flex gap-2">
          <button
            onClick={handleClearRegisters}
            className="px-3 py-1.5 bg-[#2D2D2D] text-gray-400 hover:text-white 
                     rounded-lg hover:bg-[#3D3D3D] transition-colors text-xs
                     focus:outline-none focus:ring-2 focus:ring-[#569CD6] focus:ring-opacity-50"
          >
            Clear Registers
          </button>
          <button
            onClick={onClearMemory}
            className="px-3 py-1.5 bg-[#2D2D2D] text-gray-400 hover:text-white 
                     rounded-lg hover:bg-[#3D3D3D] transition-colors text-xs
                     focus:outline-none focus:ring-2 focus:ring-[#569CD6] focus:ring-opacity-50"
          >
            Clear Memory
          </button>
        </div>
      </div>
    </div>
  );
} 
