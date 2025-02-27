'use client';
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpFromBracket, faRotateRight, faForwardStep, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { SimulatorControlsProps } from './types';

export function SimulatorControls({ onUpload, onReset, onStep, onRun, onStop, isRunning = false }: SimulatorControlsProps = {}) {
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
    { icon: faArrowUpFromBracket, label: 'Load Binary File', onClick: handleBinaryUpload, disabled: isRunning },
    { icon: faRotateRight, label: 'Reload', onClick: () => {
      onReset?.();
      // The parent component should handle refreshing memory and program counter
    }, disabled: isRunning },
    { icon: faForwardStep, label: 'Step', onClick: onStep, disabled: isRunning },
    { icon: faPlay, label: 'Run', onClick: onRun, disabled: isRunning },
    { icon: faStop, label: 'Stop', onClick: onStop, disabled: !isRunning },
  ];

  return (
    <div className="flex gap-2">
      {controls.map(({ icon, label, onClick, disabled }) => (
        <div key={label} className="relative">
          <button 
            className={`p-1.5 rounded-lg transition-colors group focus:outline-none focus:ring-2 
                     focus:ring-[#569CD6] focus:ring-opacity-50
                     w-8 h-8 flex items-center justify-center group
                     ${disabled 
                        ? 'bg-[#222] cursor-not-allowed' 
                        : 'bg-[#2D2D2D] hover:bg-[#3D3D3D]'}
                     ${label === 'Stop' && isRunning ? 'bg-[#8B0000] hover:bg-[#A00000]' : ''}`}
            onClick={onClick}
            disabled={disabled}
          >
            <FontAwesomeIcon 
              icon={icon} 
              className={`w-4 h-4 transition-colors
                        ${disabled 
                          ? 'text-gray-600' 
                          : 'text-gray-400 group-hover:text-white'}`}
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
