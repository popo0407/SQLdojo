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
  wordBasedSuggestions: 'currentDocument',
  // SQL補完のための追加設定
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showClasses: true,
    showFunctions: true,
    showVariables: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
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

/**
 * タブエディタ専用の設定（カスタム補完プロバイダーのみを使用）
 */
export const getTabEditorOptions = (): EditorOptions => ({
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
  // 補完機能を強制的に有効化
  quickSuggestions: {
    other: true,
    comments: true,
    strings: true
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  wordBasedSuggestions: 'off', // デフォルトの単語ベース補完を無効化
  // カスタム補完プロバイダーを有効化
  suggest: {
    showKeywords: true,    // カスタムキーワードを表示
    showSnippets: true,    // カスタムスニペットを表示
    showClasses: true,
    showFunctions: true,
    showVariables: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showColors: false,
    showFiles: false,
    showReferences: false,
    showFolders: false,
    showTypeParameters: false,
    showWords: false,       // デフォルトの単語候補を無効化
    showUsers: false,
    showIssues: false,
    showOperators: true,
    showUnits: false,
    showValues: true,
    // カスタムプロバイダーからの候補を表示
    filterGraceful: true,
    localityBonus: true
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