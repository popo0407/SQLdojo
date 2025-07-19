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
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  wordBasedSuggestions: 'off',
}); 