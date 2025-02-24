'use client';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpFromBracket, faRotateRight, faForwardStep, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { SimulatorControlsProps } from './types';

export function SimulatorControls({ onUpload, onReset, onStep, onRun, onStop }: SimulatorControlsProps = {}) {
  const handleBinaryUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bin';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        onUpload?.(text);
      }
    };
    input.click();
  };

  const controls = [
    { icon: faArrowUpFromBracket, label: 'Load Binary File', onClick: handleBinaryUpload },
    { icon: faRotateRight, label: 'Reload', onClick: () => {
      onReset?.();
      // The parent component should handle refreshing memory and program counter
    }},
    { icon: faForwardStep, label: 'Step', onClick: onStep },
    { icon: faPlay, label: 'Run', onClick: onRun },
    { icon: faStop, label: 'Stop', onClick: onStop },
  ];

  return (
    <div className="flex gap-2">
      {controls.map(({ icon, label, onClick }) => (
        <div key={label} className="relative">
          <button 
            className="p-1.5 bg-[#2D2D2D] rounded-lg hover:bg-[#3D3D3D] 
                     transition-colors group focus:outline-none focus:ring-2 
                     focus:ring-[#569CD6] focus:ring-opacity-50
                     w-8 h-8 flex items-center justify-center group"
            onClick={onClick}
          >
            <FontAwesomeIcon 
              icon={icon} 
              className="text-gray-400 group-hover:text-white w-4 h-4 transition-colors" 
            />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gray-200 
                           opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
                           bg-black px-2 py-1 rounded-md">
              {label}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
} 
