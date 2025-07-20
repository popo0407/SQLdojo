import type { EditorOptions } from '../types/editor';

/**
 * Monaco Editorのデフォルト設定
 */
export const getEditorOptions = (): EditorOptions => ({
  fontSize: 14,
  fontFamily: 'Fira Code, JetBrains Mono, Courier New, monospace',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on',
  lineNumbers: 'on',
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line',
  // 補完機能を明示的に有効化
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  wordBasedSuggestions: 'on',
  // SQL補完のための追加設定
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showClasses: true,
    showFunctions: true,
    showVariables: true,
    showConstants: true,
    showEnums: true,
    showEnumsMembers: true,
    showColors: false,
    showFiles: false,
    showReferences: false,
    showFolders: false,
    showTypeParameters: false,
    showWords: true,
    showUsers: false,
    showIssues: false,
    showOperators: true,
    showUnits: false,
    showValues: true
  },
  // 補完の詳細設定
  parameterHints: {
    enabled: true
  },
  // 自動補完の設定
  autoIndent: 'full',
  formatOnPaste: true,
  formatOnType: false
}); 