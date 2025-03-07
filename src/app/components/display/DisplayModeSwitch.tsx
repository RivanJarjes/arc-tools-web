'use client';
import React, { useState, useEffect } from 'react';
import { DisplayModeSwitchProps } from '../display/types';

export function DisplayModeSwitch({ mode, onChange }: DisplayModeSwitchProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load display mode from cookie
    const savedMode = getCookie('displayMode');
    
    // If cookie exists and differs from current mode, trigger change
    if (savedMode && (savedMode === 'dec' || savedMode === 'hex') && savedMode !== mode) {
      onChange(savedMode);
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // Save mode to cookie whenever it changes
    if (isLoaded) {
      setCookie('displayMode', mode, 365); // Save for 1 year
    }
  }, [mode, isLoaded]);

  // Don't render until we've loaded and processed the cookie
  if (!isLoaded) {
    return <div className="w-[120px] h-[30px] bg-[#2D2D2D] rounded-lg"></div>; // Same size placeholder
  }

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

// Helper functions for cookie operations
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
} 
