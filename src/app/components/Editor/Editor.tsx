'use client';

import { Editor as MonacoEditor, useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';
import { monarchLanguage, configuration, completionItemProvider } from './arc-language';
import { theme } from './arc-theme';
import type { editor, IDisposable } from 'monaco-editor';

interface EditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  renderWhitespace?: 'all' | 'none' | 'boundary';
  lineNumbers?: 'on' | 'off';
}

export default function Editor({ 
  value, 
  onChange, 
  language = 'arc', 
  height = '500px',
  readOnly = false,
  renderWhitespace = 'none',
  lineNumbers = 'on'
}: EditorProps) {
  const monaco = useMonaco();
  const isThemeRegistered = useRef(false);
  const isArcLanguageRegistered = useRef(false);
  const completionDisposables = useRef<IDisposable[]>([]);

  // Cleanup effect
  useEffect(() => {
    // Capture the current ref value inside the effect
    const disposables = completionDisposables.current;
    
    return () => {
      // Clean up using the captured value
      disposables.forEach(disposable => {
        if (disposable.dispose && typeof disposable.dispose === "function") {
          disposable.dispose();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (monaco) {
      try {
        // Register theme only once regardless of language
        if (!isThemeRegistered.current) {
          monaco.editor.defineTheme('arc-dark', theme as editor.IStandaloneThemeData);
          monaco.editor.setTheme('arc-dark');
          isThemeRegistered.current = true;
        }

        // Only register Arc language features for arc language
        if (language === 'arc' && !isArcLanguageRegistered.current) {
          // Register language only once
          monaco.languages.register({ id: 'arc' });

          // Register language configuration
          monaco.languages.setMonarchTokensProvider('arc', monarchLanguage);
          monaco.languages.setLanguageConfiguration('arc', configuration);

          // Clear all existing providers first
          const disposable = monaco.languages.registerCompletionItemProvider('arc', {
            triggerCharacters: [],
            provideCompletionItems: () => ({ suggestions: [] })
          });

          // Use Promise instead of setTimeout
          Promise.resolve().then(() => {
            try {
              // Dispose the empty provider
              disposable.dispose();
              
              // Now register our custom provider
              const customDisposable = monaco.languages.registerCompletionItemProvider('arc', completionItemProvider);
              completionDisposables.current.push(customDisposable);
            } catch (err) {
              console.error('Error registering custom completion provider:', err);
            }
          });
          
          // Mark as registered
          isArcLanguageRegistered.current = true;
        }
      } catch (err) {
        console.error('Error setting up Monaco editor:', err);
      }
    }
  }, [monaco, language]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onChange?.(value ?? '');
    },
    [onChange]
  );

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    // Ensure theme is set when editor mounts
    monaco?.editor.setTheme('arc-dark');
    
    // Configure editor based on language
    if (language === 'arc') {
      // Enable completion features for Arc language
      editor.updateOptions({
        tabCompletion: 'off',
        wordBasedSuggestions: 'currentDocument',
        snippetSuggestions: 'none',
        suggestOnTriggerCharacters: true,
        quickSuggestions: true
      });
    } else {
      // Disable all completion features for other languages (e.g., plaintext)
      editor.updateOptions({
        tabCompletion: 'off',
        wordBasedSuggestions: 'off',
        snippetSuggestions: 'none',
        suggestOnTriggerCharacters: false,
        quickSuggestions: false,
        suggest: { showWords: false }
      });
    }
  };

  return (
    <MonacoEditor
      height={height}
      language={language}
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      theme="arc-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        lineNumbers,
        readOnly,
        renderWhitespace,
        automaticLayout: true,
        // Conditionally set auto-completion options based on language
        ...(language === 'arc' 
          ? {
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              suggest: {
                showWords: false,
                filterGraceful: true,
                snippetsPreventQuickSuggestions: false,
                localityBonus: true,
                shareSuggestSelections: true,
                showIcons: true,
                insertMode: 'insert'
              },
              wordBasedSuggestions: 'currentDocument',
            }
          : {
              suggestOnTriggerCharacters: false,
              quickSuggestions: false,
              suggest: { showWords: false },
              wordBasedSuggestions: 'off',
            }
        ),
        tabCompletion: 'off',
        snippetSuggestions: 'none',
      }}
    />
  );
} 
