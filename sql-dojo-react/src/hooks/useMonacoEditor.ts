import { useCallback } from 'react';
import type * as monaco from 'monaco-editor';
import { useEditorStore } from '../stores/useEditorStore';
import { useSqlPageStore } from '../stores/useSqlPageStore';
import { useUIStore } from '../stores/useUIStore';

/**
 * Monaco Editorのカスタムフック
 * エディタの初期化とイベントハンドリングを管理
 */
export const useMonacoEditor_DISABLED = () => {
  const { setEditor } = useEditorStore();

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoApi?: typeof monaco) => {
    // Monaco Editor初期化開始
    console.log('🔴 元エディタ: handleEditorDidMount called, model ID:', editor.getModel()?.id);
    
    // エディタインスタンスをストアに保存
    setEditor(editor);
    
    // エディタ内ショートカット（Monaco）
    if (monacoApi) {
      // Ctrl/Cmd + Enter: 実行
      editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter, async () => {
        const { executeSql } = useSqlPageStore.getState();
        await executeSql();
      });

      // Ctrl/Cmd + Shift + F: 整形
      editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyMod.Shift | monacoApi.KeyCode.KeyF, async () => {
        const { formatSql } = useSqlPageStore.getState();
        await formatSql();
      });

      // Ctrl/Cmd + L: クリア（ブラウザのアドレスバー選択を防ぐ目的でエディタ側にもバインド）
      editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyL, () => {
        const { clearSql } = useEditorStore.getState();
        clearSql();
      });

      // F1: ショートカットヘルプ（Monacoのコマンドパレットより先に自前のヘルプを開く）
      editor.addCommand(monacoApi.KeyCode.F1, () => {
        const { setShowShortcutHelp } = useUIStore.getState();
        setShowShortcutHelp(true);
      });
    }
    
    // SQL補完機能を設定（元エディタは無効化）
    // if (monacoApi) { // 削除：元エディタの補完は完全に無効化
    //   ... 削除されたコード
    // }
    
    // 選択状態の変更を監視
    editor.onDidChangeCursorSelection(() => {
      // 選択状態が変更されたときにストアを更新
      // この時点では何もしない（hasSelection()がリアクティブに動作するため）
    });
    
    // エディタにフォーカス
    editor.focus();
    
    // Monaco Editor初期化完了
  }, [setEditor]);

  return {
    handleEditorDidMount,
  };
}; 