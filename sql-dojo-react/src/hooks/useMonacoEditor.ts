import { useCallback } from 'react';
import { useEditorStore } from '../stores/useEditorStore';

/**
 * Monaco Editorのカスタムフック
 * エディタの初期化とイベントハンドリングを管理
 */
export const useMonacoEditor = () => {
  const { setEditor } = useEditorStore();

  const handleEditorDidMount = useCallback((editor: any) => {
    // エディタインスタンスをストアに保存
    setEditor(editor);
    
    // 選択状態の変更を監視
    editor.onDidChangeCursorSelection(() => {
      // 選択状態が変更されたときにストアを更新
      // この時点では何もしない（hasSelection()がリアクティブに動作するため）
    });
    
    // エディタにフォーカス
    editor.focus();
  }, [setEditor]);

  return {
    handleEditorDidMount,
  };
}; 