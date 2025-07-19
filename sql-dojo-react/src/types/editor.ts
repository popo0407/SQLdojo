// エディタ関連の型定義
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export type MonacoEditor = monaco.editor.IStandaloneCodeEditor;
export type MonacoInstance = typeof monaco;

export interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insert_text?: string;
  sort_text?: string;
}

import type { editor } from 'monaco-editor/esm/vs/editor/editor.api';

export type EditorOptions = editor.IStandaloneEditorConstructionOptions; 