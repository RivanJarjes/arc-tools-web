/**
 * Utility to check if code is running on the client side (browser)
 * This helps prevent "window is not defined" errors during server-side rendering
 */
export const isClient = typeof window !== 'undefined';

/**
 * Safe way to access window object that won't break server-side rendering
 * @returns The window object if on client, undefined otherwise
 */
export const getWindow = (): (Window & typeof globalThis) | undefined => {
  return isClient ? window : undefined;
}; 
