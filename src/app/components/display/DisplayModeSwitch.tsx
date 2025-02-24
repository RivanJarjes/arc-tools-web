'use client';
import React from 'react';
import { DisplayModeSwitchProps } from './types';

export function DisplayModeSwitch({ mode, onChange }: DisplayModeSwitchProps) {
  return (
    <div className="flex items-center bg-[#2D2D2D] rounded-lg p-0.5 select-none relative w-[120px]">
      {/* Sliding highlight */}
      <div
        className={`absolute inset-0.5 w-[56px] rounded-md bg-[#569CD6] transition-transform duration-200 ease-out ${
          mode === 'dec' ? 'translate-x-[60px]' : 'translate-x-0'
        }`}
      />
      
      <button
        onClick={() => onChange('hex')}
        className={`px-4 py-1 text-xs rounded-md transition-colors relative z-10 w-[60px] group ${
          mode === 'hex'
            ? 'text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Hex.
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-200 
                       opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
                       bg-black px-2 py-1 rounded-md">
          Hexadecimal View
        </span>
      </button>
      <button
        onClick={() => onChange('dec')}
        className={`px-4 py-1 text-xs rounded-md transition-colors relative z-10 w-[60px] group ${
          mode === 'dec'
            ? 'text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Dec.
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-200 
                       opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
                       bg-black px-2 py-1 rounded-md">
          Decimal View
        </span>
      </button>
    </div>
  );
} 
