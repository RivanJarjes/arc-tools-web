'use client';

import { Editor as MonacoEditor, useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect } from 'react';
import { monarchLanguage, configuration, completionItemProvider } from './arc-language';
import { theme } from './arc-theme';
import type { editor } from 'monaco-editor';

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

  useEffect(() => {
    if (monaco) {
      // Register language
      monaco.languages.register({ id: 'arc' });

      // Register language configuration
      monaco.languages.setMonarchTokensProvider('arc', monarchLanguage);
      monaco.languages.setLanguageConfiguration('arc', configuration);

      // Register completions
      monaco.languages.registerCompletionItemProvider('arc', completionItemProvider);

      // Register theme
      monaco.editor.defineTheme('arc-dark', theme as editor.IStandaloneThemeData);
      monaco.editor.setTheme('arc-dark');
    }
  }, [monaco]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onChange?.(value ?? '');
    },
    [onChange]
  );

  const handleEditorDidMount = () => {
    // Ensure theme is set when editor mounts
    monaco?.editor.setTheme('arc-dark');
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
        suggestOnTriggerCharacters: true,
      }}
    />
  );
} 
