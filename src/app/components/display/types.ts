export type DisplayMode = 'hex' | 'dec';

export interface SimulatorControlsProps {
  onUpload?: (binaryContent: string) => void;
  onReset?: () => void;
  onStep?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
}

export interface DisplayModeSwitchProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}

export interface MemoryViewProps {
  memory: string[];
  currentLocation: number;
  onMemoryChange: (address: number, value: string) => void;
  displayMode: 'hex' | 'dec';
  breakpoints: Set<number>;
  onBreakpointToggle: (location: number) => void;
  baseLocation: number;
  onBaseLocationChange: (newLocation: number) => void;
}

export interface RegistersViewProps {
  registers: string[];
  onRegisterChange: (index: number, value: string) => void;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  onClearRegisters: () => void;
  onClearMemory: () => void;
  onClearBreakpoints: () => void;
  onUpload?: (binaryContent: string) => void;
  onReset?: () => void;
  onStep?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  isRunning?: boolean;
}

export interface CPUInfoProps {
  programCounter: string;
  onProgramCounterChange: (value: string) => void;
  flags: {
    negative: boolean;
    zero: boolean;
    overflow: boolean;
    carry: boolean;
  };
  onFlagChange: (flag: keyof CPUInfoProps['flags'], value: boolean) => void;
  displayMode: DisplayMode;
} 
