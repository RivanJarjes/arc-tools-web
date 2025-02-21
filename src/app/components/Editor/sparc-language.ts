import { languages, editor as MonacoEditor } from 'monaco-editor';
import { instructionSet, syntheticInstructions, pseudoOps } from '../../simulator/instructions';

// Get all instruction names
const instructions = Object.keys(instructionSet);
const synthetic = Object.keys(syntheticInstructions);
const pseudo = Object.keys(pseudoOps);

// Function to extract labels from text
export function extractLabels(text: string): string[] {
    const labels: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('!')) {
            continue;
        }

        const labelMatch = line.match(/^\s*([a-zA-Z_]\w*):/)
        if (labelMatch) {
            labels.push(labelMatch[1]);
        }
    }
    return labels;
}

export const monarchLanguage: languages.IMonarchLanguage = {
    defaultToken: '',
    ignoreCase: true,
    
    keywords: instructions,
    synthetic: synthetic,
    pseudoOps: pseudo,
    
    tokenizer: {
        root: [
            // Comments
            [/!.*$/, 'comment'],
            
            // Labels at start of line (definition)
            [/^[a-zA-Z_]\w*:/, 'label.orange'],
            
            // Instructions and other keywords
            [/\b([a-zA-Z_]\w*)\b(?!:)/, { 
                cases: {
                    '@keywords': 'instruction',
                    '@synthetic': 'synthetic',
                    '@pseudoOps': 'pseudoop',
                    '@default': ''
                }
            }],
            
            // Registers
            [/%[r][0-9]|%sp|%fp/, 'register'],
            
            // Numbers
            [/\b[0-9]+\b/, 'number'],
            [/\b0x[0-9a-fA-F]+\b/, 'number'],
            [/\b[01]+b\b/, 'number'],
        ]
    }
};

export const configuration: languages.LanguageConfiguration = {
  comments: {
    lineComment: '!',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
  ],
  wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>\/?\s]+)/,
};

export const completionItemProvider: languages.CompletionItemProvider = {
  triggerCharacters: ['.'],
  provideCompletionItems: (model, position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    // Get the line content up to the cursor position
    const lineContent = model.getLineContent(position.lineNumber);
    const textBeforeCursor = lineContent.substring(0, position.column - 1);

    // If the last character is a period, only show pseudo ops
    if (textBeforeCursor.trim().endsWith('.')) {
      return {
        suggestions: pseudo.map(op => ({
          label: op,
          kind: languages.CompletionItemKind.Keyword,
          insertText: op,
          detail: 'Pseudo Op',
          range: range
        }))
      };
    }

    // Otherwise show all suggestions
    const suggestions = [
      // Instructions
      ...instructions.map(instruction => ({
        label: instruction,
        kind: languages.CompletionItemKind.Keyword,
        insertText: instruction,
        detail: 'SPARC Instruction',
        range: range
      })),

      // Synthetic Instructions
      ...synthetic.map(instruction => ({
        label: instruction,
        kind: languages.CompletionItemKind.Keyword,
        insertText: instruction,
        detail: 'Synthetic Instruction',
        range: range
      })),

      // Common Registers
      ...Array.from({ length: 32 }, (_, i) => ({
        label: `%r${i}`,
        kind: languages.CompletionItemKind.Variable,
        insertText: `%r${i}`,
        detail: `Register ${i}`,
        range: range
      }))
    ];

    return { suggestions };
  }
};

export function updateLabels(text: string, editor: MonacoEditor.IStandaloneCodeEditor) {
    const labels = extractLabels(text);
    const model = editor.getModel();
    
    if (!model) return;
    
    // Update the tokenizer rules
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monaco = (window as any).monaco;
    if (!monaco) return;

    // Create a new language with updated rules
    monaco.languages.setMonarchTokensProvider('sparc', {
        ...monarchLanguage,
        tokenizer: {
            root: [
                // Comments
                [/!.*$/, 'comment'],
                
                // Labels at start of line (definition)
                [/^[a-zA-Z_]\w*:/, 'label.orange'],
                
                // Label references
                [new RegExp(`\\b(${labels.join('|')})\\b(?!:)`), 'label.orange'],
                
                // Instructions and other keywords
                [/\b([a-zA-Z_]\w*)\b(?!:)/, { 
                    cases: {
                        '@keywords': 'instruction',
                        '@synthetic': 'synthetic',
                        '@pseudoOps': 'pseudoop',
                        '@default': ''
                    }
                }],
                
                // Registers
                [/%[r][0-9]|%sp|%fp/, 'register'],
                
                // Numbers
                [/\b[0-9]+\b/, 'number'],
                [/\b0x[0-9a-fA-F]+\b/, 'number'],
                [/\b[01]+b\b/, 'number'],
            ]
        }
    });
} 
