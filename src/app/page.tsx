"use client";

import Editor from './components/Editor/Editor';
import { useState, useRef, useEffect } from 'react';
import { assemble } from './simulator/assembler';

export default function Home() {
  const [code, setCode] = useState('');
  const [binaryCode, setBinaryCode] = useState('');
  const [activeTab, setActiveTab] = useState<'assembly' | 'binary'>('assembly');
  const [assemblyError, setAssemblyError] = useState<string | null>(null);
  const [assemblySuccess, setAssemblySuccess] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const [terminalHistory, setTerminalHistory] = useState<string>('Ready to assemble');
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const CONTAINER_HEIGHT = 600; // Total height of editor + terminal
  const editorHeight = CONTAINER_HEIGHT - terminalHeight - 4; // 4px for the resize handle

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = terminalHeight;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate delta (negative when moving up, positive when moving down)
      const delta = e.clientY - startYRef.current;
      // Invert the delta to make upward movement increase height
      const newHeight = Math.max(40, Math.min(CONTAINER_HEIGHT - 200, startHeightRef.current - delta));
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAssemble = () => {
    try {
      // Check for empty code
      if (!code.trim()) {
        setAssemblyError('Cannot assemble empty code');
        setTerminalHistory('Cannot assemble empty code');
        setBinaryCode('');
        return;
      }

      setAssemblyError(null);
      setAssemblySuccess(false);
      // Clear binary code and switch to assembly tab before assembling
      setBinaryCode('');
      setActiveTab('assembly');
      
      const assembled = assemble(code);
      console.log('Assembled code:', assembled);
      setBinaryCode(assembled.machineCode);
      setAssemblySuccess(true);
      setTerminalHistory('Assembled Successfully');
      
      // Switch to binary tab after a brief delay to show success message
      setTimeout(() => {
        setActiveTab('binary');
      }, 1000);
    } catch (error) {
      console.error('Assembly error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAssemblyError(errorMessage);
      setTerminalHistory(errorMessage);
      // Clear binary code on error
      setBinaryCode('');
    }
  };

  const handleTabChange = (tab: 'assembly' | 'binary') => {
    if (tab === 'binary' && !binaryCode) return;
    setActiveTab(tab);
    // Reset success message when switching back to assembly
    if (tab === 'assembly') {
      setAssemblySuccess(false);
    }
  };

  // Add file operation handlers
  const handleNewFile = () => {
    if (code && !confirm('Are you sure you want to create a new file? Any unsaved changes will be lost.')) {
      return;
    }
    setCode('');
    setBinaryCode('');
    setTerminalHistory('Ready to assemble');
    setIsFileMenuOpen(false);
  };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.asm';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        setCode(text);
        setBinaryCode('');
        setTerminalHistory('File loaded successfully');
      }
    };
    input.click();
    setIsFileMenuOpen(false);
  };

  const handleSaveAs = () => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') return;

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'program.asm';

    // Type guard for showSaveFilePicker
    if ('showSaveFilePicker' in window) {
      // Modern browsers with File System Access API
      (window.showSaveFilePicker as any)({
        suggestedName: 'program.asm',
        types: [{
          description: 'Assembly File',
          accept: { 'text/plain': ['.asm'] }
        }]
      }).then(async (handle: any) => {
        const writable = await handle.createWritable();
        await writable.write(code);
        await writable.close();
      }).catch(() => {
        // Fallback to traditional method if user cancels or browser doesn't support
        a.click();
      });
    } else {
      // Fallback for browsers that don't support showSaveFilePicker
      a.click();
    }
    URL.revokeObjectURL(url);
    setIsFileMenuOpen(false);
  };

  return (
    <main className="min-h-screen p-4 bg-[#1A1A1A]">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-[#E1E8ED]">ARC Assembly Simulator</h1>
        
        <div className="rounded-lg overflow-hidden shadow-xl">
          {/* Tabs row */}
          <div className="flex bg-[#2D2D2D]">
            <button
              onClick={() => handleTabChange('assembly')}
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === 'assembly'
                  ? 'bg-[#1E1E1E] text-white border-b-2 border-[#569CD6]'
                  : 'bg-[#2D2D2D] text-gray-400 hover:text-gray-300'
              }`}
            >
              Assembly Editor
            </button>
            <button
              onClick={() => handleTabChange('binary')}
              disabled={!binaryCode}
              className={`px-6 py-2 text-sm font-medium transition-colors ${
                binaryCode
                  ? activeTab === 'binary'
                    ? 'bg-[#1E1E1E] text-white border-b-2 border-[#569CD6]'
                    : 'bg-[#2D2D2D] text-gray-400 hover:text-gray-300'
                  : 'bg-[#2D2D2D] text-gray-600 cursor-not-allowed'
              }`}
            >
              Binary File
            </button>
          </div>

          {/* File menu row */}
          <div className="bg-[#1E1E1E] border-b border-[#2D2D2D]">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                className="px-4 py-1 text-sm text-gray-300 hover:text-white focus:outline-none cursor-default"
              >
                File
              </button>
              {isFileMenuOpen && (
                <div className="absolute left-0 mt-1 w-40 bg-[#2D2D2D] rounded-md shadow-lg z-50">
                  <button
                    onClick={handleNewFile}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3D3D3D] hover:text-white cursor-default"
                  >
                    New
                  </button>
                  <button
                    onClick={handleOpenFile}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3D3D3D] hover:text-white cursor-default"
                  >
                    Open...
                  </button>
                  <button
                    onClick={handleSaveAs}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#3D3D3D] hover:text-white cursor-default"
                  >
                    Save As...
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editor content */}
          <div key={activeTab} style={{ height: `${CONTAINER_HEIGHT}px` }}>
            {activeTab === 'assembly' ? (
              <>
                <div style={{ height: `${editorHeight}px` }}>
                  <Editor 
                    value={code} 
                    onChange={setCode} 
                    language="sparc"
                    height="100%"
                  />
                </div>
                <div
                  className="h-1 bg-[#2D2D2D] cursor-ns-resize hover:bg-[#569CD6] transition-colors"
                  onMouseDown={handleMouseDown}
                ></div>
                <div 
                  className="bg-[#1E1E1E] p-3 overflow-auto transition-all duration-200"
                  style={{ height: `${terminalHeight}px` }}
                >
                  <div className="font-mono text-sm">
                    <span className={
                      assemblyError 
                        ? "text-[#FF5F56]" 
                        : "text-green-400"
                    }>
                      {terminalHistory}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <Editor 
                value={binaryCode}
                onChange={() => {}}
                language="plaintext"
                height="100%"
                readOnly={true}
                renderWhitespace="all"
                lineNumbers="on"
              />
            )}
          </div>
        </div>
        
        <button
          onClick={handleAssemble}
          className="mt-4 px-4 py-2 bg-[#569CD6] text-white rounded hover:bg-[#4E8CC2] transition-colors"
        >
          Assemble
        </button>
      </div>
    </main>
  );
}
