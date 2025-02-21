'use client';

import { Editor as MonacoEditor, useMonaco } from '@monaco-editor/react';
import { useCallback, useEffect } from 'react';
import { monarchLanguage, configuration, completionItemProvider } from './sparc-language';
import { theme } from './sparc-theme';
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
  language = 'sparc', 
  height = '500px',
  readOnly = false,
  renderWhitespace = 'none',
  lineNumbers = 'on'
}: EditorProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      // Register language
      monaco.languages.register({ id: 'sparc' });

      // Register language configuration
      monaco.languages.setMonarchTokensProvider('sparc', monarchLanguage);
      monaco.languages.setLanguageConfiguration('sparc', configuration);

      // Register completions
      monaco.languages.registerCompletionItemProvider('sparc', completionItemProvider);

      // Register theme
      monaco.editor.defineTheme('sparc-dark', theme as editor.IStandaloneThemeData);
      monaco.editor.setTheme('sparc-dark');
    }
  }, [monaco]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onChange?.(value ?? '');
    },
    [onChange]
  );

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    // Ensure theme is set when editor mounts
    monaco?.editor.setTheme('sparc-dark');
  };

  return (
    <MonacoEditor
      height={height}
      language={language}
      value={value}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      theme="sparc-dark"
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
